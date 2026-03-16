package com.bleplx

import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattService
import android.content.Context
import android.os.Build
import android.util.Log
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import no.nordicsemi.android.ble.BleManager
import no.nordicsemi.android.ble.callback.DataReceivedCallback
import no.nordicsemi.android.ble.data.Data
import no.nordicsemi.android.ble.ktx.suspend
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Per-device Nordic BleManager subclass.
 *
 * Caches discovered characteristics in a ConcurrentHashMap for fast lookup.
 * Exposes suspend functions for GATT operations.
 *
 * Note: Nordic BLE Library does not support cancellation of enqueued GATT operations.
 * When a transaction is cancelled from JS, the wrapping coroutine is cancelled but the
 * underlying GATT operation continues to completion on the device. The response is discarded.
 * This is a known limitation — BLE operations are atomic at the protocol level and cannot be
 * interrupted once submitted to the Bluetooth stack.
 */
class BleManagerWrapper(context: Context) : BleManager(context) {

    companion object {
        private const val TAG = "BleManagerWrapper"
        private const val DEFAULT_MTU = 517
    }

    /** Service UUID -> (Characteristic UUID -> BluetoothGattCharacteristic) */
    private val characteristicCache = ConcurrentHashMap<String, ConcurrentHashMap<String, BluetoothGattCharacteristic>>()

    /** All discovered services */
    private val discoveredServices = ConcurrentHashMap<String, BluetoothGattService>()

    var deviceAddress: String = ""
        private set

    var deviceName: String? = null
        private set

    var currentMtu: Int = 23
        private set

    var lastRssi: Int = 0

    // ---- BleManager overrides ----

    override fun isRequiredServiceSupported(gatt: BluetoothGatt): Boolean {
        // Cache all discovered services and characteristics
        characteristicCache.clear()
        discoveredServices.clear()
        gatt.services?.forEach { service ->
            val serviceUuid = service.uuid.toString()
            discoveredServices[serviceUuid] = service
            val charMap = ConcurrentHashMap<String, BluetoothGattCharacteristic>()
            service.characteristics?.forEach { char ->
                charMap[char.uuid.toString()] = char
            }
            characteristicCache[serviceUuid] = charMap
        }
        // We support any device — the JS layer decides what services are required
        return true
    }

    override fun initialize() {
        super.initialize()
        // Request MTU 517 on API < 34 (Android 14+ auto-negotiates)
        if (Build.VERSION.SDK_INT < 34) {
            requestMtu(DEFAULT_MTU)
                .with { _, mtu -> currentMtu = mtu }
                .enqueue()
        }
    }

    override fun onServicesInvalidated() {
        characteristicCache.clear()
        discoveredServices.clear()
    }

    // ---- Connection ----

    /**
     * Connect to a device with optional retry and timeout.
     */
    suspend fun connectDevice(
        device: BluetoothDevice,
        autoConnect: Boolean = false,
        retries: Int = 0,
        retryDelay: Long = 1000,
        timeoutMs: Long = 30_000
    ) {
        deviceAddress = device.address
        try {
            deviceName = device.name
        } catch (_: SecurityException) {
            // Ignore — name is optional
        }

        connect(device)
            .useAutoConnect(autoConnect)
            .retry(retries, retryDelay.toInt())
            .timeout(timeoutMs)
            .suspend()
    }

    suspend fun disconnectDevice() {
        disconnect().suspend()
    }

    // ---- Discovery ----

    fun getDiscoveredServices(): List<BluetoothGattService> {
        return discoveredServices.values.toList()
    }

    fun getCharacteristicsForService(serviceUuid: String): List<BluetoothGattCharacteristic>? {
        return characteristicCache[serviceUuid]?.values?.toList()
    }

    fun findCharacteristic(serviceUuid: String, characteristicUuid: String): BluetoothGattCharacteristic? {
        return characteristicCache[serviceUuid]?.get(characteristicUuid)
    }

    // ---- Read ----

    suspend fun readChar(serviceUuid: String, characteristicUuid: String): ByteArray {
        val char = findCharacteristic(serviceUuid, characteristicUuid)
            ?: throw IllegalArgumentException("Characteristic $characteristicUuid not found in service $serviceUuid")

        return suspendCancellableCoroutine { cont ->
            readCharacteristic(char)
                .with { _, data -> cont.resume(data.value ?: ByteArray(0)) }
                .fail { _, status ->
                    cont.resumeWithException(
                        GattException(status, "Read failed for $characteristicUuid")
                    )
                }
                .enqueue()
        }
    }

    // ---- Write ----

    suspend fun writeChar(
        serviceUuid: String,
        characteristicUuid: String,
        value: ByteArray,
        withResponse: Boolean
    ): ByteArray {
        val char = findCharacteristic(serviceUuid, characteristicUuid)
            ?: throw IllegalArgumentException("Characteristic $characteristicUuid not found in service $serviceUuid")

        val writeType = if (withResponse)
            BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
        else
            BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE

        return suspendCancellableCoroutine { cont ->
            writeCharacteristic(char, value, writeType)
                .with { _, data -> cont.resume(data.value ?: value) }
                .fail { _, status ->
                    cont.resumeWithException(
                        GattException(status, "Write failed for $characteristicUuid")
                    )
                }
                .enqueue()
        }
    }

    // ---- Monitor (notification/indication) ----

    fun monitorChar(serviceUuid: String, characteristicUuid: String): Flow<ByteArray> = callbackFlow {
        val char = findCharacteristic(serviceUuid, characteristicUuid)
            ?: throw IllegalArgumentException("Characteristic $characteristicUuid not found in service $serviceUuid")

        val callback = DataReceivedCallback { _, data ->
            trySend(data.value ?: ByteArray(0))
        }

        // Register notification callback before enabling
        setNotificationCallback(char).with(callback)

        // Enable notifications or indications
        val props = char.properties
        val hasIndicate = props and BluetoothGattCharacteristic.PROPERTY_INDICATE != 0
        val hasNotify = props and BluetoothGattCharacteristic.PROPERTY_NOTIFY != 0

        if (hasIndicate) {
            enableIndications(char)
                .fail { _, status ->
                    close(GattException(status, "Enable indications failed for $characteristicUuid"))
                }
                .enqueue()
        } else if (hasNotify) {
            enableNotifications(char)
                .fail { _, status ->
                    close(GattException(status, "Enable notifications failed for $characteristicUuid"))
                }
                .enqueue()
        } else {
            close(IllegalArgumentException("Characteristic $characteristicUuid supports neither notify nor indicate"))
            return@callbackFlow
        }

        awaitClose {
            try {
                if (hasIndicate) {
                    disableIndications(char).enqueue()
                } else {
                    disableNotifications(char).enqueue()
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to disable notifications/indications on close", e)
            }
        }
    }

    // ---- MTU ----

    suspend fun requestMtuValue(mtu: Int): Int {
        return suspendCancellableCoroutine { cont ->
            requestMtu(mtu)
                .with { _, negotiatedMtu ->
                    currentMtu = negotiatedMtu
                    cont.resume(negotiatedMtu)
                }
                .fail { _, status ->
                    cont.resumeWithException(GattException(status, "MTU request failed"))
                }
                .enqueue()
        }
    }

    // ---- RSSI ----

    suspend fun readRemoteRssi(): Int {
        return suspendCancellableCoroutine { cont ->
            readRssi()
                .with { _, rssi ->
                    lastRssi = rssi
                    cont.resume(rssi)
                }
                .fail { _, status ->
                    cont.resumeWithException(GattException(status, "RSSI read failed"))
                }
                .enqueue()
        }
    }

    // ---- Connection Priority ----

    suspend fun requestConnectionPriorityValue(priority: Int) {
        requestConnectionPriority(priority)
            .suspend()
    }

    // ---- PHY ----

    suspend fun requestPhyValue(txPhy: Int, rxPhy: Int) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            setPreferredPhy(txPhy, rxPhy, BluetoothDevice.PHY_OPTION_NO_PREFERRED)
                .suspend()
        }
    }

    suspend fun readPhyValue(): Pair<Int, Int> {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return suspendCancellableCoroutine { cont ->
                readPhy()
                    .with { _, txPhy, rxPhy ->
                        cont.resume(Pair(txPhy, rxPhy))
                    }
                    .fail { _, status ->
                        cont.resumeWithException(GattException(status, "PHY read failed"))
                    }
                    .enqueue()
            }
        }
        return Pair(1, 1) // PHY_LE_1M default
    }

    // ---- Helpers ----

    /**
     * Exception carrying a GATT status code for ErrorConverter.
     */
    class GattException(val status: Int, message: String) : Exception(message)

    override fun log(priority: Int, message: String) {
        Log.println(priority, TAG, message)
    }
}
