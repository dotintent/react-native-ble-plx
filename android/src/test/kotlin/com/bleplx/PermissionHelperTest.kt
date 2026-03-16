package com.bleplx

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkObject
import io.mockk.mockkStatic
import io.mockk.unmockkAll
import android.content.Context
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

/**
 * Tests for SDK version gating in PermissionHelper.
 *
 * API < 31  → BLUETOOTH + ACCESS_FINE_LOCATION for SCAN
 *             BLUETOOTH for CONNECT
 * API 31+   → BLUETOOTH_SCAN for SCAN
 *             BLUETOOTH_CONNECT for CONNECT
 *
 * Build.VERSION.SDK_INT is a final field; we test getRequiredPermissions()
 * directly by inspecting what the production constant resolves to on the
 * test JVM, and test the hasPermissions / getMissingPermissions logic with
 * a mocked Context + ContextCompat.
 */
class PermissionHelperTest {

    private lateinit var mockContext: Context

    @BeforeEach
    fun setup() {
        mockContext = mockk(relaxed = true)
        mockkStatic(ContextCompat::class)
    }

    @AfterEach
    fun teardown() {
        unmockkAll()
    }

    // --- getRequiredPermissions on current SDK ---

    @Test
    fun `getRequiredPermissions SCAN returns non-empty list`() {
        val perms = PermissionHelper.getRequiredPermissions(PermissionHelper.PermissionGroup.SCAN)
        assertTrue(perms.isNotEmpty())
    }

    @Test
    fun `getRequiredPermissions CONNECT returns non-empty list`() {
        val perms = PermissionHelper.getRequiredPermissions(PermissionHelper.PermissionGroup.CONNECT)
        assertTrue(perms.isNotEmpty())
    }

    @Test
    fun `SCAN permissions on API 31+ include BLUETOOTH_SCAN`() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val perms = PermissionHelper.getRequiredPermissions(PermissionHelper.PermissionGroup.SCAN)
            assertTrue(perms.contains(Manifest.permission.BLUETOOTH_SCAN),
                "API 31+ SCAN must include BLUETOOTH_SCAN, got: $perms")
            assertFalse(perms.contains(Manifest.permission.ACCESS_FINE_LOCATION),
                "API 31+ SCAN must not require location")
        }
    }

    @Test
    fun `CONNECT permissions on API 31+ include BLUETOOTH_CONNECT`() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val perms = PermissionHelper.getRequiredPermissions(PermissionHelper.PermissionGroup.CONNECT)
            assertTrue(perms.contains(Manifest.permission.BLUETOOTH_CONNECT),
                "API 31+ CONNECT must include BLUETOOTH_CONNECT, got: $perms")
        }
    }

    @Test
    fun `SCAN permissions on API below 31 include BLUETOOTH and location`() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            val perms = PermissionHelper.getRequiredPermissions(PermissionHelper.PermissionGroup.SCAN)
            assertTrue(perms.contains(Manifest.permission.BLUETOOTH),
                "API < 31 SCAN must include BLUETOOTH, got: $perms")
            assertTrue(perms.contains(Manifest.permission.ACCESS_FINE_LOCATION),
                "API < 31 SCAN must include ACCESS_FINE_LOCATION, got: $perms")
        }
    }

    @Test
    fun `CONNECT permissions on API below 31 include BLUETOOTH`() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            val perms = PermissionHelper.getRequiredPermissions(PermissionHelper.PermissionGroup.CONNECT)
            assertTrue(perms.contains(Manifest.permission.BLUETOOTH),
                "API < 31 CONNECT must include BLUETOOTH, got: $perms")
        }
    }

    // --- hasPermissions / getMissingPermissions with mocked ContextCompat ---

    @Test
    fun `hasPermissions returns true when all permissions are granted`() {
        val perms = PermissionHelper.getRequiredPermissions(PermissionHelper.PermissionGroup.SCAN)
        perms.forEach { perm ->
            every { ContextCompat.checkSelfPermission(mockContext, perm) } returns PackageManager.PERMISSION_GRANTED
        }

        assertTrue(PermissionHelper.hasPermissions(mockContext, PermissionHelper.PermissionGroup.SCAN))
    }

    @Test
    fun `hasPermissions returns false when any permission is denied`() {
        val perms = PermissionHelper.getRequiredPermissions(PermissionHelper.PermissionGroup.SCAN)
        // Grant all but the first
        perms.forEachIndexed { index, perm ->
            val result = if (index == 0) PackageManager.PERMISSION_DENIED else PackageManager.PERMISSION_GRANTED
            every { ContextCompat.checkSelfPermission(mockContext, perm) } returns result
        }

        assertFalse(PermissionHelper.hasPermissions(mockContext, PermissionHelper.PermissionGroup.SCAN))
    }

    @Test
    fun `getMissingPermissions returns empty list when all granted`() {
        val perms = PermissionHelper.getRequiredPermissions(PermissionHelper.PermissionGroup.CONNECT)
        perms.forEach { perm ->
            every { ContextCompat.checkSelfPermission(mockContext, perm) } returns PackageManager.PERMISSION_GRANTED
        }

        val missing = PermissionHelper.getMissingPermissions(mockContext, PermissionHelper.PermissionGroup.CONNECT)
        assertTrue(missing.isEmpty(), "Expected no missing permissions, got: $missing")
    }

    @Test
    fun `getMissingPermissions returns denied permissions`() {
        val perms = PermissionHelper.getRequiredPermissions(PermissionHelper.PermissionGroup.SCAN)
        perms.forEach { perm ->
            every { ContextCompat.checkSelfPermission(mockContext, perm) } returns PackageManager.PERMISSION_DENIED
        }

        val missing = PermissionHelper.getMissingPermissions(mockContext, PermissionHelper.PermissionGroup.SCAN)
        assertEquals(perms.size, missing.size, "All permissions should be missing")
        assertTrue(missing.containsAll(perms))
    }

    @Test
    fun `getMissingPermissions only returns actually denied permissions`() {
        val perms = PermissionHelper.getRequiredPermissions(PermissionHelper.PermissionGroup.SCAN)
        if (perms.size >= 2) {
            every { ContextCompat.checkSelfPermission(mockContext, perms[0]) } returns PackageManager.PERMISSION_DENIED
            every { ContextCompat.checkSelfPermission(mockContext, perms[1]) } returns PackageManager.PERMISSION_GRANTED

            val missing = PermissionHelper.getMissingPermissions(mockContext, PermissionHelper.PermissionGroup.SCAN)
            assertEquals(1, missing.size)
            assertTrue(missing.contains(perms[0]))
            assertFalse(missing.contains(perms[1]))
        }
    }

    @Test
    fun `hasPermissions SCAN returns false when all denied`() {
        val perms = PermissionHelper.getRequiredPermissions(PermissionHelper.PermissionGroup.SCAN)
        perms.forEach { perm ->
            every { ContextCompat.checkSelfPermission(mockContext, perm) } returns PackageManager.PERMISSION_DENIED
        }

        assertFalse(PermissionHelper.hasPermissions(mockContext, PermissionHelper.PermissionGroup.SCAN))
    }

    @Test
    fun `hasPermissions CONNECT returns false when all denied`() {
        val perms = PermissionHelper.getRequiredPermissions(PermissionHelper.PermissionGroup.CONNECT)
        perms.forEach { perm ->
            every { ContextCompat.checkSelfPermission(mockContext, perm) } returns PackageManager.PERMISSION_DENIED
        }

        assertFalse(PermissionHelper.hasPermissions(mockContext, PermissionHelper.PermissionGroup.CONNECT))
    }

    // --- API-level specific permission names (parametric style) ---

    @Test
    fun `required SCAN permissions are known Android permission strings`() {
        val perms = PermissionHelper.getRequiredPermissions(PermissionHelper.PermissionGroup.SCAN)
        perms.forEach { perm ->
            assertTrue(perm.startsWith("android.permission.") || perm.startsWith("android.permission."),
                "Permission '$perm' should be a valid android.permission string")
        }
    }

    @Test
    fun `required CONNECT permissions are known Android permission strings`() {
        val perms = PermissionHelper.getRequiredPermissions(PermissionHelper.PermissionGroup.CONNECT)
        perms.forEach { perm ->
            assertTrue(perm.startsWith("android.permission."),
                "Permission '$perm' should be a valid android.permission string")
        }
    }
}
