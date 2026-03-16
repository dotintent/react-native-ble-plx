package com.bleplx

import android.bluetooth.BluetoothGattCharacteristic
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
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
import java.util.UUID

/**
 * Tests for EventSerializer — native BLE object → JS event map serialization.
 *
 * React Native's Arguments / WritableMap are Android-only, so we mock them
 * using MockK statics + JavaOnlyMap/JavaOnlyArray (available in react-android
 * test artefacts).  Base64 is also mocked since it's an Android SDK class.
 */
class EventSerializerTest {

    @BeforeEach
    fun setup() {
        mockkStatic(Arguments::class)
        every { Arguments.createMap() } answers { JavaOnlyMap() }
        every { Arguments.createArray() } answers { JavaOnlyArray() }

        mockkStatic(Base64::class)
        // For testing, just return a predictable string rather than real Base64
        every { Base64.encodeToString(any(), any()) } answers {
            java.util.Base64.getEncoder().encodeToString(firstArg<ByteArray>())
        }
    }

    @AfterEach
    fun teardown() {
        unmockkAll()
    }

    // ---------- ScanResult ----------

    @Test
    fun `serializeScanResult includes id field`() {
        val map = EventSerializer.serializeScanResult(
            deviceAddress = "AA:BB:CC:DD:EE:FF",
            deviceName = "TestDevice",
            rssi = -70,
            serviceUuids = emptyList(),
            manufacturerData = null
        )
        assertEquals("AA:BB:CC:DD:EE:FF", map.getString("id"))
    }

    @Test
    fun `serializeScanResult includes name when non-null`() {
        val map = EventSerializer.serializeScanResult(
            deviceAddress = "AA:BB:CC:DD:EE:FF",
            deviceName = "MySensor",
            rssi = -65,
            serviceUuids = emptyList(),
            manufacturerData = null
        )
        assertEquals("MySensor", map.getString("name"))
    }

    @Test
    fun `serializeScanResult has null name when deviceName is null`() {
        val map = EventSerializer.serializeScanResult(
            deviceAddress = "AA:BB:CC:DD:EE:FF",
            deviceName = null,
            rssi = -65,
            serviceUuids = emptyList(),
            manufacturerData = null
        )
        assertTrue(map.isNull("name"))
    }

    @Test
    fun `serializeScanResult includes rssi`() {
        val map = EventSerializer.serializeScanResult(
            deviceAddress = "AA:BB:CC:DD:EE:FF",
            deviceName = null,
            rssi = -85,
            serviceUuids = emptyList(),
            manufacturerData = null
        )
        assertEquals(-85, map.getInt("rssi"))
    }

    @Test
    fun `serializeScanResult includes serviceUuids array`() {
        val uuids = listOf("0000180A-0000-1000-8000-00805F9B34FB")
        val map = EventSerializer.serializeScanResult(
            deviceAddress = "AA:BB:CC:DD:EE:FF",
            deviceName = null,
            rssi = -70,
            serviceUuids = uuids,
            manufacturerData = null
        )
        val array = map.getArray("serviceUuids")
        assertNotNull(array)
        assertEquals(1, array!!.size())
        assertEquals("0000180A-0000-1000-8000-00805F9B34FB", array.getString(0))
    }

    @Test
    fun `serializeScanResult has empty serviceUuids array when none provided`() {
        val map = EventSerializer.serializeScanResult(
            deviceAddress = "AA:BB:CC:DD:EE:FF",
            deviceName = null,
            rssi = -70,
            serviceUuids = emptyList(),
            manufacturerData = null
        )
        val array = map.getArray("serviceUuids")
        assertNotNull(array)
        assertEquals(0, array!!.size())
    }

    @Test
    fun `serializeScanResult encodes manufacturerData as Base64`() {
        val data = byteArrayOf(0x01, 0x02, 0x03)
        val map = EventSerializer.serializeScanResult(
            deviceAddress = "AA:BB:CC:DD:EE:FF",
            deviceName = null,
            rssi = -70,
            serviceUuids = emptyList(),
            manufacturerData = data
        )
        val encoded = map.getString("manufacturerData")
        assertNotNull(encoded)
        assertEquals(java.util.Base64.getEncoder().encodeToString(data), encoded)
    }

    @Test
    fun `serializeScanResult has null manufacturerData when not provided`() {
        val map = EventSerializer.serializeScanResult(
            deviceAddress = "AA:BB:CC:DD:EE:FF",
            deviceName = null,
            rssi = -70,
            serviceUuids = emptyList(),
            manufacturerData = null
        )
        assertTrue(map.isNull("manufacturerData"))
    }

    // ---------- DeviceInfo ----------

    @Test
    fun `serializeDeviceInfo includes all required fields`() {
        val map = EventSerializer.serializeDeviceInfo(
            deviceAddress = "11:22:33:44:55:66",
            deviceName = "Hub",
            rssi = -60,
            mtu = 512,
            isConnectable = true,
            serviceUuids = listOf("180D"),
            manufacturerData = null
        )
        assertEquals("11:22:33:44:55:66", map.getString("id"))
        assertEquals("Hub", map.getString("name"))
        assertEquals(-60, map.getInt("rssi"))
        assertEquals(512, map.getInt("mtu"))
        assertTrue(map.getBoolean("isConnectable"))
        assertNotNull(map.getArray("serviceUuids"))
    }

    @Test
    fun `serializeDeviceInfo has null name when not provided`() {
        val map = EventSerializer.serializeDeviceInfo(
            deviceAddress = "11:22:33:44:55:66",
            deviceName = null
        )
        assertTrue(map.isNull("name"))
    }

    @Test
    fun `serializeDeviceInfo defaults rssi to 0`() {
        val map = EventSerializer.serializeDeviceInfo(
            deviceAddress = "11:22:33:44:55:66",
            deviceName = null
        )
        assertEquals(0, map.getInt("rssi"))
    }

    @Test
    fun `serializeDeviceInfo defaults mtu to 23`() {
        val map = EventSerializer.serializeDeviceInfo(
            deviceAddress = "11:22:33:44:55:66",
            deviceName = null
        )
        assertEquals(23, map.getInt("mtu"))
    }

    @Test
    fun `serializeDeviceInfo has null isConnectable when not provided`() {
        val map = EventSerializer.serializeDeviceInfo(
            deviceAddress = "11:22:33:44:55:66",
            deviceName = null,
            isConnectable = null
        )
        assertTrue(map.isNull("isConnectable"))
    }

    @Test
    fun `serializeDeviceInfo has empty serviceUuids by default`() {
        val map = EventSerializer.serializeDeviceInfo(
            deviceAddress = "11:22:33:44:55:66",
            deviceName = null
        )
        val array = map.getArray("serviceUuids")
        assertNotNull(array)
        assertEquals(0, array!!.size())
    }

    // ---------- CharacteristicInfo (simple variant) ----------

    @Test
    fun `serializeCharacteristicSimple includes deviceId and uuids`() {
        val map = EventSerializer.serializeCharacteristicSimple(
            deviceId = "dev-1",
            serviceUuid = "svc-uuid",
            characteristicUuid = "char-uuid",
            value = null
        )
        assertEquals("dev-1", map.getString("deviceId"))
        assertEquals("svc-uuid", map.getString("serviceUuid"))
        assertEquals("char-uuid", map.getString("uuid"))
    }

    @Test
    fun `serializeCharacteristicSimple has null value when not provided`() {
        val map = EventSerializer.serializeCharacteristicSimple(
            deviceId = "dev-1",
            serviceUuid = "svc",
            characteristicUuid = "char",
            value = null
        )
        assertTrue(map.isNull("value"))
    }

    @Test
    fun `serializeCharacteristicSimple encodes value as Base64`() {
        val data = byteArrayOf(0xDE.toByte(), 0xAD.toByte(), 0xBE.toByte(), 0xEF.toByte())
        val map = EventSerializer.serializeCharacteristicSimple(
            deviceId = "dev-1",
            serviceUuid = "svc",
            characteristicUuid = "char",
            value = data
        )
        val encoded = map.getString("value")
        assertNotNull(encoded)
        assertEquals(java.util.Base64.getEncoder().encodeToString(data), encoded)
    }

    @Test
    fun `serializeCharacteristicSimple isNotifying defaults to false`() {
        val map = EventSerializer.serializeCharacteristicSimple(
            deviceId = "dev-1",
            serviceUuid = "svc",
            characteristicUuid = "char",
            value = null
        )
        assertFalse(map.getBoolean("isNotifying"))
    }

    @Test
    fun `serializeCharacteristicSimple isNotifying reflects passed value`() {
        val map = EventSerializer.serializeCharacteristicSimple(
            deviceId = "dev-1",
            serviceUuid = "svc",
            characteristicUuid = "char",
            value = null,
            isNotifying = true
        )
        assertTrue(map.getBoolean("isNotifying"))
    }

    @Test
    fun `serializeCharacteristicSimple properties default to false when 0`() {
        val map = EventSerializer.serializeCharacteristicSimple(
            deviceId = "dev-1",
            serviceUuid = "svc",
            characteristicUuid = "char",
            value = null,
            properties = 0
        )
        assertFalse(map.getBoolean("isIndicatable"))
        assertFalse(map.getBoolean("isReadable"))
        assertFalse(map.getBoolean("isWritableWithResponse"))
        assertFalse(map.getBoolean("isWritableWithoutResponse"))
    }

    @Test
    fun `serializeCharacteristicSimple isReadable is true when READ property set`() {
        val map = EventSerializer.serializeCharacteristicSimple(
            deviceId = "dev-1",
            serviceUuid = "svc",
            characteristicUuid = "char",
            value = null,
            properties = BluetoothGattCharacteristic.PROPERTY_READ
        )
        assertTrue(map.getBoolean("isReadable"))
        assertFalse(map.getBoolean("isWritableWithResponse"))
    }

    @Test
    fun `serializeCharacteristicSimple isWritableWithResponse is true when WRITE property set`() {
        val map = EventSerializer.serializeCharacteristicSimple(
            deviceId = "dev-1",
            serviceUuid = "svc",
            characteristicUuid = "char",
            value = null,
            properties = BluetoothGattCharacteristic.PROPERTY_WRITE
        )
        assertTrue(map.getBoolean("isWritableWithResponse"))
        assertFalse(map.getBoolean("isReadable"))
    }

    @Test
    fun `serializeCharacteristicSimple isWritableWithoutResponse is true when WRITE_NO_RESPONSE set`() {
        val map = EventSerializer.serializeCharacteristicSimple(
            deviceId = "dev-1",
            serviceUuid = "svc",
            characteristicUuid = "char",
            value = null,
            properties = BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE
        )
        assertTrue(map.getBoolean("isWritableWithoutResponse"))
    }

    @Test
    fun `serializeCharacteristicSimple isIndicatable is true when INDICATE property set`() {
        val map = EventSerializer.serializeCharacteristicSimple(
            deviceId = "dev-1",
            serviceUuid = "svc",
            characteristicUuid = "char",
            value = null,
            properties = BluetoothGattCharacteristic.PROPERTY_INDICATE
        )
        assertTrue(map.getBoolean("isIndicatable"))
    }

    @Test
    fun `serializeCharacteristicSimple handles combined properties`() {
        val props = BluetoothGattCharacteristic.PROPERTY_READ or
                BluetoothGattCharacteristic.PROPERTY_WRITE or
                BluetoothGattCharacteristic.PROPERTY_NOTIFY

        val map = EventSerializer.serializeCharacteristicSimple(
            deviceId = "dev-1",
            serviceUuid = "svc",
            characteristicUuid = "char",
            value = null,
            properties = props
        )
        assertTrue(map.getBoolean("isReadable"))
        assertTrue(map.getBoolean("isWritableWithResponse"))
        assertFalse(map.getBoolean("isIndicatable"))
    }

    // ---------- ConnectionStateEvent ----------

    @Test
    fun `serializeConnectionStateEvent includes deviceId and state`() {
        val map = EventSerializer.serializeConnectionStateEvent(
            deviceId = "dev-1",
            state = "connected"
        )
        assertEquals("dev-1", map.getString("deviceId"))
        assertEquals("connected", map.getString("state"))
    }

    @Test
    fun `serializeConnectionStateEvent has null errorCode and errorMessage when omitted`() {
        val map = EventSerializer.serializeConnectionStateEvent(
            deviceId = "dev-1",
            state = "disconnected"
        )
        assertTrue(map.isNull("errorCode"))
        assertTrue(map.isNull("errorMessage"))
    }

    @Test
    fun `serializeConnectionStateEvent includes errorCode and errorMessage when provided`() {
        val map = EventSerializer.serializeConnectionStateEvent(
            deviceId = "dev-1",
            state = "disconnected",
            errorCode = 201,
            errorMessage = "peer disconnected"
        )
        assertEquals(201, map.getInt("errorCode"))
        assertEquals("peer disconnected", map.getString("errorMessage"))
    }

    // ---------- CharacteristicValueEvent ----------

    @Test
    fun `serializeCharacteristicValueEvent includes all fields`() {
        val value = byteArrayOf(0x01, 0x02)
        val map = EventSerializer.serializeCharacteristicValueEvent(
            deviceId = "dev-1",
            serviceUuid = "svc-uuid",
            characteristicUuid = "char-uuid",
            value = value,
            transactionId = "txn-42"
        )
        assertEquals("dev-1", map.getString("deviceId"))
        assertEquals("svc-uuid", map.getString("serviceUuid"))
        assertEquals("char-uuid", map.getString("characteristicUuid"))
        assertEquals("txn-42", map.getString("transactionId"))
        assertNotNull(map.getString("value"))
    }

    @Test
    fun `serializeCharacteristicValueEvent has null transactionId when not provided`() {
        val map = EventSerializer.serializeCharacteristicValueEvent(
            deviceId = "dev-1",
            serviceUuid = "svc",
            characteristicUuid = "char",
            value = byteArrayOf(0xFF.toByte())
        )
        assertTrue(map.isNull("transactionId"))
    }

    // ---------- StateChangeEvent ----------

    @Test
    fun `serializeStateChangeEvent includes state field`() {
        val map = EventSerializer.serializeStateChangeEvent("PoweredOn")
        assertEquals("PoweredOn", map.getString("state"))
    }

    @Test
    fun `serializeStateChangeEvent handles all expected state strings`() {
        val states = listOf("Unknown", "Resetting", "Unsupported", "Unauthorized", "PoweredOff", "PoweredOn")
        states.forEach { state ->
            val map = EventSerializer.serializeStateChangeEvent(state)
            assertEquals(state, map.getString("state"), "State '$state' should round-trip correctly")
        }
    }
}
