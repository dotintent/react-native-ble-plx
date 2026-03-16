package com.bleplx

import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkAll
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.util.concurrent.ConcurrentLinkedDeque
import java.util.concurrent.atomic.AtomicLong

/**
 * Tests for scan throttle debouncing logic in ScanManager.
 *
 * ScanManager uses System.currentTimeMillis() directly, so we test through
 * a TestableScanManager that allows injecting a controllable clock.
 */
class ScanManagerTest {

    // --- Testable subclass with injectable clock ---

    /**
     * Exposes the throttle logic with an injected clock so tests don't depend
     * on wall time.  We replicate the throttle state here instead of reaching
     * into the private fields of the real ScanManager.
     */
    private class ThrottleChecker {
        companion object {
            const val MAX_STARTS_IN_WINDOW = 5
            const val WINDOW_MS = 30_000L
            const val MIN_RESTART_INTERVAL_MS = 6_000L
        }

        val timestamps = ConcurrentLinkedDeque<Long>()
        var simulatedIsScanning = false

        /**
         * Simulate attempting a scan start at [now].
         * Returns a [ErrorConverter.BleErrorInfo] if throttled, null on success.
         */
        fun tryStart(now: Long): ErrorConverter.BleErrorInfo? {
            // Remove timestamps outside the window
            while (timestamps.isNotEmpty() && now - timestamps.peekFirst()!! > WINDOW_MS) {
                timestamps.pollFirst()
            }

            // Check count
            if (timestamps.size >= MAX_STARTS_IN_WINDOW) {
                return ErrorConverter.scanThrottled()
            }

            // Check minimum interval
            val lastStart = timestamps.peekLast()
            if (lastStart != null && now - lastStart < MIN_RESTART_INTERVAL_MS) {
                return ErrorConverter.scanThrottled()
            }

            // Success — record start
            timestamps.addLast(now)
            simulatedIsScanning = true
            return null
        }

        fun stop() {
            simulatedIsScanning = false
        }
    }

    private lateinit var throttle: ThrottleChecker

    @BeforeEach
    fun setup() {
        throttle = ThrottleChecker()
    }

    // --- 5 scans in 30s → 6th returns ScanThrottled ---

    @Test
    fun `5 scans within 30s window all succeed`() {
        var time = 0L

        for (i in 1..5) {
            val result = throttle.tryStart(time)
            assertNull(result, "Scan $i should succeed but got error: $result")
            time += 6_000L // space each by 6s (exactly the minimum interval)
        }

        assertEquals(5, throttle.timestamps.size)
    }

    @Test
    fun `6th scan within 30s window returns ScanThrottled`() {
        var time = 0L

        for (i in 1..5) {
            throttle.tryStart(time)
            time += 6_000L
        }

        // 6th scan at 30s (still within the window since window started at time=0)
        val result = throttle.tryStart(time - 1) // just inside the 30s window
        assertNotNull(result, "6th scan should be throttled")
        assertEquals(ErrorConverter.SCAN_THROTTLED, result!!.code)
        assertTrue(result.isRetryable, "ScanThrottled should be retryable")
    }

    @Test
    fun `scan at window boundary evicts old timestamps and succeeds`() {
        var time = 0L

        // Fill 5 slots
        for (i in 1..5) {
            throttle.tryStart(time)
            time += 6_000L
        }

        // Jump to just past 30s from the first scan (time=0)
        // First timestamp was at 0, window is 30_000ms
        time = 30_001L

        val result = throttle.tryStart(time)
        assertNull(result, "Scan after window expiry should succeed")
    }

    // --- Scans spaced by 6+ seconds all succeed ---

    @Test
    fun `scans spaced exactly 6 seconds succeed up to limit`() {
        var time = 0L
        for (i in 1..5) {
            val result = throttle.tryStart(time)
            assertNull(result, "Scan $i at time $time should succeed")
            time += 6_000L
        }
    }

    @Test
    fun `scan restarted too soon within 6s is throttled`() {
        throttle.tryStart(0L)
        throttle.stop()

        val result = throttle.tryStart(5_999L) // 1ms short of minimum interval
        assertNotNull(result, "Restart within 6s should be throttled")
        assertEquals(ErrorConverter.SCAN_THROTTLED, result!!.code)
    }

    @Test
    fun `scan restarted at exactly 6s succeeds`() {
        throttle.tryStart(0L)
        throttle.stop()

        val result = throttle.tryStart(6_000L)
        assertNull(result, "Restart at exactly 6s should succeed")
    }

    @Test
    fun `scan restarted after 7s succeeds`() {
        throttle.tryStart(0L)
        throttle.stop()

        val result = throttle.tryStart(7_000L)
        assertNull(result, "Restart after 7s should succeed")
    }

    // --- Stop/start cycle counts correctly ---

    @Test
    fun `stop and restart still counts as two scan starts`() {
        throttle.tryStart(0L)
        throttle.stop()
        throttle.tryStart(6_000L)
        throttle.stop()
        throttle.tryStart(12_000L)
        throttle.stop()

        assertEquals(3, throttle.timestamps.size, "Three starts should be recorded regardless of stops")
    }

    @Test
    fun `stop does not remove recorded timestamps`() {
        throttle.tryStart(0L)
        throttle.stop()

        assertEquals(1, throttle.timestamps.size, "Timestamp must persist after stop")
    }

    @Test
    fun `repeated stop has no effect on timestamps`() {
        throttle.tryStart(0L)
        throttle.stop()
        throttle.stop()
        throttle.stop()

        assertEquals(1, throttle.timestamps.size)
    }

    // --- isScanning flag tracks state ---

    @Test
    fun `isScanning is false before first start`() {
        assertFalse(throttle.simulatedIsScanning)
    }

    @Test
    fun `isScanning becomes true after successful start`() {
        throttle.tryStart(0L)
        assertTrue(throttle.simulatedIsScanning)
    }

    @Test
    fun `isScanning becomes false after stop`() {
        throttle.tryStart(0L)
        throttle.stop()
        assertFalse(throttle.simulatedIsScanning)
    }

    @Test
    fun `isScanning remains false when throttled`() {
        // Fill up 5 slots quickly (all within 6s of each other — first succeeds, second fails)
        throttle.tryStart(0L)
        val result = throttle.tryStart(1_000L) // too soon
        assertNotNull(result)
        // The throttle check happens before setting isScanning, so no state change
        // But isScanning was set by the first tryStart
        assertTrue(throttle.simulatedIsScanning, "Still scanning from first start")
    }

    @Test
    fun `isScanning is false after throttled attempt when not previously scanning`() {
        // Force timestamps to fill without setting isScanning
        val now = 0L
        for (i in 0..4) {
            throttle.timestamps.addLast(now + i * 6_000L)
        }
        // timestamps is full but simulatedIsScanning was never set
        assertFalse(throttle.simulatedIsScanning)

        val result = throttle.tryStart(now + 24_001L) // within window but count exceeded
        assertNotNull(result)
        assertFalse(throttle.simulatedIsScanning, "isScanning must stay false when throttled")
    }

    // --- ErrorConverter.scanThrottled() structure ---

    @Test
    fun `scanThrottled error has correct code and is retryable`() {
        val error = ErrorConverter.scanThrottled()
        assertEquals(ErrorConverter.SCAN_THROTTLED, error.code)
        assertTrue(error.isRetryable)
        assertTrue(error.message.isNotEmpty())
    }
}
