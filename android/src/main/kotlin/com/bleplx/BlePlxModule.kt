package com.bleplx

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.ParcelUuid
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import no.nordicsemi.android.support.v18.scanner.ScanResult
import java.util.concurrent.ConcurrentHashMap

/**
 * Kotlin TurboModule for react-native-ble-plx v4.
 *
 * Extends the Codegen-generated NativeBlePlxSpec base class (generated at build time).
 * Uses Nordic Android-BLE-Library for GATT operations and Scanner Compat for scanning.
 */
@ReactModule(name = BlePlxModule.NAME)
class BlePlxModule(private val reactContext: ReactApplicationContext) : NativeBlePlxSpec(reactContext) {

    companion object {
        const val NAME = "NativeBlePlx"
        private const val TAG = "BlePlxModule"
    }

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private val connections = ConcurrentHashMap<String, BleManagerWrapper>()
    private val monitorJobs = ConcurrentHashMap<String, Job>()
    private val pendingTransactions = ConcurrentHashMap<String, Job>()
    private var scanManager: ScanManager? = null
    private var bluetoothStateReceiver: BroadcastReceiver? = null
    private var isClientCreated = false

    override fun getName(): String = NAME

    // ---- Lifecycle ----

    override fun createClient(restoreStateIdentifier: String?, promise: Promise) {
        if (isClientCreated) {
            promise.resolve(null)
            return
        }

        scanManager = ScanManager(reactContext)
        registerBluetoothStateReceiver()
        isClientCreated = true

        // Emit initial state
        emitOnStateChange(EventSerializer.serializeStateChangeEvent(getCurrentBluetoothState()))

        promise.resolve(null)
    }

    override fun destroyClient(promise: Promise) {
        if (!guardClient("destroyClient", promise)) return

        // Cancel all monitoring jobs
        monitorJobs.values.forEach { it.cancel() }
        monitorJobs.clear()

        // Cancel pending transactions
        pendingTransactions.values.forEach { it.cancel() }
        pendingTransactions.clear()

        // Stop scanning
        scanManager?.stopScan()
        scanManager = null

        // Disconnect all devices
        connections.values.forEach { wrapper ->
            try {
                wrapper.close()
            } catch (e: Exception) {
                Log.w(TAG, "Error closing connection: ${e.message}")
            }
        }
        connections.clear()

        unregisterBluetoothStateReceiver()
        isClientCreated = false

        promise.resolve(null)
    }

    override fun invalidate() {
        scope.cancel()
        scanManager?.stopScan()
        connections.values.forEach { it.close() }
        connections.clear()
        monitorJobs.values.forEach { it.cancel() }
        monitorJobs.clear()
        pendingTransactions.values.forEach { it.cancel() }
        pendingTransactions.clear()
        unregisterBluetoothStateReceiver()
        isClientCreated = false
        super.invalidate()
    }

    // ---- State ----

    override fun state(promise: Promise) {
        promise.resolve(getCurrentBluetoothState())
    }

    // ---- Scanning ----

    override fun startDeviceScan(uuids: ReadableArray?, options: ReadableMap?) {
        if (!isClientCreated) {
            emitOnError(ErrorConverter.toWritableMap(
                ErrorConverter.BleErrorInfo(
                    code = ErrorConverter.BLUETOOTH_MANAGER_DESTROYED,
                    message = "Client not created",
                    isRetryable = false
                )
            ))
            return
        }

        val uuidList = uuids?.let { array ->
            (0 until array.size()).mapNotNull { array.getString(it) }
        }

        val scanMode = options?.let {
            if (it.hasKey("scanMode")) it.getInt("scanMode") else 0
        } ?: 0

        val callbackType = options?.let {
            if (it.hasKey("callbackType")) it.getInt("callbackType") else 1
        } ?: 1

        val legacyScan = options?.let {
            if (it.hasKey("legacyScan")) it.getBoolean("legacyScan") else true
        } ?: true

        val error = scanManager?.startScan(uuidList, scanMode, callbackType, legacyScan, object : ScanManager.ScanListener {
            override fun onScanResult(result: ScanResult) {
                val device = result.device
                val scanRecord = result.scanRecord
                val serviceUuids = scanRecord?.serviceUuids?.map { it.uuid.toString() } ?: emptyList()
                val manufacturerData = scanRecord?.let { record ->
                    // Combine all manufacturer specific data
                    val data = record.manufacturerSpecificData
                    if (data != null && data.size() > 0) {
                        val key = data.keyAt(0)
                        data.get(key)
                    } else null
                }

                var deviceName: String? = null
                try {
                    deviceName = scanRecord?.deviceName ?: device.name
                } catch (_: SecurityException) {
                    // name is optional
                }

                emitOnScanResult(EventSerializer.serializeScanResult(
                    deviceAddress = device.address,
                    deviceName = deviceName,
                    rssi = result.rssi,
                    serviceUuids = serviceUuids,
                    manufacturerData = manufacturerData
                ))
            }

            override fun onScanFailed(errorCode: Int) {
                emitOnError(ErrorConverter.toWritableMap(ErrorConverter.fromScanError(errorCode)))
            }
        })

        if (error != null) {
            emitOnError(ErrorConverter.toWritableMap(error))
        }
    }

    override fun stopDeviceScan(promise: Promise) {
        scanManager?.stopScan()
        promise.resolve(null)
    }

    // ---- Connection ----

    override fun connectToDevice(deviceId: String, options: ReadableMap?, promise: Promise) {
        if (!guardClient("connectToDevice", promise)) return

        scope.launch {
            try {
                val adapter = getBluetoothAdapter()
                if (adapter == null) {
                    ErrorConverter.rejectPromise(promise::reject, ErrorConverter.BleErrorInfo(
                        code = ErrorConverter.BLUETOOTH_UNSUPPORTED,
                        message = "Bluetooth not available",
                        isRetryable = false,
                        deviceId = deviceId
                    ))
                    return@launch
                }

                if (!PermissionHelper.hasPermissions(reactContext, PermissionHelper.PermissionGroup.CONNECT)) {
                    ErrorConverter.rejectPromise(promise::reject, ErrorConverter.BleErrorInfo(
                        code = ErrorConverter.CONNECT_PERMISSION_DENIED,
                        message = "Missing BLUETOOTH_CONNECT permission",
                        isRetryable = false,
                        deviceId = deviceId
                    ))
                    return@launch
                }

                // Parse options
                val autoConnect = options?.let { if (it.hasKey("autoConnect")) it.getBoolean("autoConnect") else false } ?: false
                val timeout = options?.let { if (it.hasKey("timeout")) it.getInt("timeout").toLong() else 30_000L } ?: 30_000L
                val retries = options?.let { if (it.hasKey("retries")) it.getInt("retries") else 0 } ?: 0
                val retryDelay = options?.let { if (it.hasKey("retryDelay")) it.getInt("retryDelay").toLong() else 1000L } ?: 1000L
                val requestMtu = options?.let { if (it.hasKey("requestMtu")) it.getInt("requestMtu") else 0 } ?: 0

                // Reuse or create BleManagerWrapper
                val wrapper = connections.getOrPut(deviceId) { BleManagerWrapper(reactContext) }

                // Set up disconnect listener
                wrapper.setConnectionObserver(object : no.nordicsemi.android.ble.observer.ConnectionObserver {
                    override fun onDeviceConnecting(device: BluetoothDevice) {
                        emitOnConnectionStateChange(EventSerializer.serializeConnectionStateEvent(deviceId, "connecting"))
                    }

                    override fun onDeviceConnected(device: BluetoothDevice) {
                        emitOnConnectionStateChange(EventSerializer.serializeConnectionStateEvent(deviceId, "connected"))
                    }

                    override fun onDeviceFailedToConnect(device: BluetoothDevice, reason: Int) {
                        val error = ErrorConverter.fromGattStatus(reason, deviceId, "connect")
                        emitOnConnectionStateChange(EventSerializer.serializeConnectionStateEvent(
                            deviceId, "disconnected", error.code, error.message
                        ))
                        connections.remove(deviceId)
                    }

                    override fun onDeviceReady(device: BluetoothDevice) {
                        // Already emitted connected
                    }

                    override fun onDeviceDisconnecting(device: BluetoothDevice) {
                        emitOnConnectionStateChange(EventSerializer.serializeConnectionStateEvent(deviceId, "disconnecting"))
                    }

                    override fun onDeviceDisconnected(device: BluetoothDevice, reason: Int) {
                        // Cancel any monitoring for this device
                        monitorJobs.keys.filter { it.startsWith(deviceId) }.forEach { key ->
                            monitorJobs.remove(key)?.cancel()
                        }
                        emitOnConnectionStateChange(EventSerializer.serializeConnectionStateEvent(deviceId, "disconnected"))
                        connections.remove(deviceId)
                    }
                })

                val device = adapter.getRemoteDevice(deviceId)
                wrapper.connectDevice(device, autoConnect, retries, retryDelay, timeout)

                // Request custom MTU if specified
                if (requestMtu > 0) {
                    wrapper.requestMtuValue(requestMtu)
                }

                promise.resolve(EventSerializer.serializeDeviceInfo(
                    deviceAddress = deviceId,
                    deviceName = wrapper.deviceName,
                    mtu = wrapper.currentMtu
                ))
            } catch (e: SecurityException) {
                ErrorConverter.rejectPromise(promise::reject, ErrorConverter.fromException(e, deviceId, "connect"), e)
            } catch (e: BleManagerWrapper.GattException) {
                ErrorConverter.rejectPromise(promise::reject, ErrorConverter.fromGattStatus(e.status, deviceId, "connect"), e)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                ErrorConverter.rejectPromise(promise::reject, ErrorConverter.fromException(e, deviceId, "connect"), e)
            }
        }
    }

    override fun cancelDeviceConnection(deviceId: String, promise: Promise) {
        if (!guardClient("cancelDeviceConnection", promise)) return

        scope.launch {
            try {
                val wrapper = connections[deviceId]
                if (wrapper != null) {
                    wrapper.disconnectDevice()
                }
                promise.resolve(EventSerializer.serializeDeviceInfo(
                    deviceAddress = deviceId,
                    deviceName = wrapper?.deviceName
                ))
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                ErrorConverter.rejectPromise(promise::reject, ErrorConverter.fromException(e, deviceId, "disconnect"), e)
            }
        }
    }

    override fun isDeviceConnected(deviceId: String, promise: Promise) {
        if (!guardClient("isDeviceConnected", promise)) return
        val wrapper = connections[deviceId]
        promise.resolve(wrapper?.isConnected ?: false)
    }

    // ---- Discovery ----

    override fun discoverAllServicesAndCharacteristics(deviceId: String, transactionId: String?, promise: Promise) {
        if (!guardClient("discoverAllServicesAndCharacteristics", promise)) return

        val wrapper = connections[deviceId]
        if (wrapper == null) {
            ErrorConverter.rejectPromise(promise::reject, ErrorConverter.BleErrorInfo(
                code = ErrorConverter.DEVICE_NOT_CONNECTED,
                message = "Device $deviceId is not connected",
                isRetryable = false,
                deviceId = deviceId
            ))
            return
        }

        // Nordic BLE Library auto-discovers services on connect.
        // Services are already cached in the wrapper.
        val serviceUuids = wrapper.getDiscoveredServices().map { it.uuid.toString() }
        promise.resolve(EventSerializer.serializeDeviceInfo(
            deviceAddress = deviceId,
            deviceName = wrapper.deviceName,
            mtu = wrapper.currentMtu,
            serviceUuids = serviceUuids
        ))
    }

    // ---- Read/Write ----

    override fun readCharacteristic(
        deviceId: String,
        serviceUuid: String,
        characteristicUuid: String,
        transactionId: String?,
        promise: Promise
    ) {
        if (!guardClient("readCharacteristic", promise)) return

        val job = scope.launch {
            try {
                val wrapper = getConnectedWrapper(deviceId)
                    ?: return@launch ErrorConverter.rejectPromise(promise::reject, ErrorConverter.BleErrorInfo(
                        code = ErrorConverter.DEVICE_NOT_CONNECTED,
                        message = "Device $deviceId is not connected",
                        isRetryable = false,
                        deviceId = deviceId
                    ))

                val value = wrapper.readChar(serviceUuid, characteristicUuid)
                val char = wrapper.findCharacteristic(serviceUuid, characteristicUuid)

                promise.resolve(EventSerializer.serializeCharacteristicSimple(
                    deviceId = deviceId,
                    serviceUuid = serviceUuid,
                    characteristicUuid = characteristicUuid,
                    value = value,
                    properties = char?.properties ?: 0
                ))
            } catch (e: BleManagerWrapper.GattException) {
                ErrorConverter.rejectPromise(promise::reject, ErrorConverter.fromGattStatus(e.status, deviceId, "readCharacteristic"), e)
            } catch (e: CancellationException) {
                ErrorConverter.rejectPromise(promise::reject, ErrorConverter.BleErrorInfo(
                    code = ErrorConverter.OPERATION_CANCELLED,
                    message = "Read cancelled",
                    isRetryable = false,
                    deviceId = deviceId
                ))
            } catch (e: Exception) {
                ErrorConverter.rejectPromise(promise::reject, ErrorConverter.fromException(e, deviceId, "readCharacteristic"), e)
            }
        }

        transactionId?.let { pendingTransactions[it] = job }
    }

    override fun writeCharacteristic(
        deviceId: String,
        serviceUuid: String,
        characteristicUuid: String,
        value: String,
        withResponse: Boolean,
        transactionId: String?,
        promise: Promise
    ) {
        if (!guardClient("writeCharacteristic", promise)) return

        val job = scope.launch {
            try {
                val wrapper = getConnectedWrapper(deviceId)
                    ?: return@launch ErrorConverter.rejectPromise(promise::reject, ErrorConverter.BleErrorInfo(
                        code = ErrorConverter.DEVICE_NOT_CONNECTED,
                        message = "Device $deviceId is not connected",
                        isRetryable = false,
                        deviceId = deviceId
                    ))

                val bytes = Base64.decode(value, Base64.DEFAULT)
                val written = wrapper.writeChar(serviceUuid, characteristicUuid, bytes, withResponse)
                val char = wrapper.findCharacteristic(serviceUuid, characteristicUuid)

                promise.resolve(EventSerializer.serializeCharacteristicSimple(
                    deviceId = deviceId,
                    serviceUuid = serviceUuid,
                    characteristicUuid = characteristicUuid,
                    value = written,
                    properties = char?.properties ?: 0
                ))
            } catch (e: BleManagerWrapper.GattException) {
                ErrorConverter.rejectPromise(promise::reject, ErrorConverter.fromGattStatus(e.status, deviceId, "writeCharacteristic"), e)
            } catch (e: CancellationException) {
                ErrorConverter.rejectPromise(promise::reject, ErrorConverter.BleErrorInfo(
                    code = ErrorConverter.OPERATION_CANCELLED,
                    message = "Write cancelled",
                    isRetryable = false,
                    deviceId = deviceId
                ))
            } catch (e: Exception) {
                ErrorConverter.rejectPromise(promise::reject, ErrorConverter.fromException(e, deviceId, "writeCharacteristic"), e)
            }
        }

        transactionId?.let { pendingTransactions[it] = job }
    }

    // ---- Monitor ----

    override fun monitorCharacteristic(
        deviceId: String,
        serviceUuid: String,
        characteristicUuid: String,
        subscriptionType: String?,
        transactionId: String?
    ) {
        if (!isClientCreated) {
            emitOnError(ErrorConverter.toWritableMap(ErrorConverter.BleErrorInfo(
                code = ErrorConverter.BLUETOOTH_MANAGER_DESTROYED,
                message = "Client not created",
                isRetryable = false,
                deviceId = deviceId
            )))
            return
        }

        val wrapper = connections[deviceId]
        if (wrapper == null) {
            emitOnError(ErrorConverter.toWritableMap(ErrorConverter.BleErrorInfo(
                code = ErrorConverter.DEVICE_NOT_CONNECTED,
                message = "Device $deviceId is not connected",
                isRetryable = false,
                deviceId = deviceId
            )))
            return
        }

        val monitorKey = "$deviceId|$serviceUuid|$characteristicUuid"

        // Cancel existing monitor for this characteristic
        monitorJobs.remove(monitorKey)?.cancel()

        val job = scope.launch {
            try {
                wrapper.monitorChar(serviceUuid, characteristicUuid).collect { value ->
                    emitOnCharacteristicValueUpdate(EventSerializer.serializeCharacteristicValueEvent(
                        deviceId = deviceId,
                        serviceUuid = serviceUuid,
                        characteristicUuid = characteristicUuid,
                        value = value,
                        transactionId = transactionId
                    ))
                }
            } catch (e: CancellationException) {
                // Normal cancellation, do nothing
            } catch (e: BleManagerWrapper.GattException) {
                emitOnError(ErrorConverter.toWritableMap(ErrorConverter.fromGattStatus(e.status, deviceId, "monitorCharacteristic")))
            } catch (e: Exception) {
                emitOnError(ErrorConverter.toWritableMap(ErrorConverter.fromException(e, deviceId, "monitorCharacteristic")))
            } finally {
                monitorJobs.remove(monitorKey)
            }
        }

        monitorJobs[monitorKey] = job
        transactionId?.let { pendingTransactions[it] = job }
    }

    // ---- MTU ----

    override fun getMtu(deviceId: String, promise: Promise) {
        if (!guardClient("getMtu", promise)) return
        val wrapper = connections[deviceId]
        if (wrapper == null) {
            ErrorConverter.rejectPromise(promise::reject, ErrorConverter.BleErrorInfo(
                code = ErrorConverter.DEVICE_NOT_CONNECTED,
                message = "Device $deviceId is not connected",
                isRetryable = false,
                deviceId = deviceId
            ))
            return
        }
        promise.resolve(wrapper.currentMtu.toDouble())
    }

    override fun requestMtu(deviceId: String, mtu: Double, transactionId: String?, promise: Promise) {
        if (!guardClient("requestMtu", promise)) return

        val job = scope.launch {
            try {
                val wrapper = getConnectedWrapper(deviceId)
                    ?: return@launch ErrorConverter.rejectPromise(promise::reject, ErrorConverter.BleErrorInfo(
                        code = ErrorConverter.DEVICE_NOT_CONNECTED,
                        message = "Device $deviceId is not connected",
                        isRetryable = false,
                        deviceId = deviceId
                    ))

                wrapper.requestMtuValue(mtu.toInt())
                promise.resolve(EventSerializer.serializeDeviceInfo(
                    deviceAddress = deviceId,
                    deviceName = wrapper.deviceName,
                    mtu = wrapper.currentMtu
                ))
            } catch (e: BleManagerWrapper.GattException) {
                ErrorConverter.rejectPromise(promise::reject, ErrorConverter.fromGattStatus(e.status, deviceId, "requestMtu"), e)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                ErrorConverter.rejectPromise(promise::reject, ErrorConverter.fromException(e, deviceId, "requestMtu"), e)
            }
        }

        transactionId?.let { pendingTransactions[it] = job }
    }

    // ---- PHY ----

    override fun requestPhy(deviceId: String, txPhy: Double, rxPhy: Double, promise: Promise) {
        if (!guardClient("requestPhy", promise)) return

        scope.launch {
            try {
                val wrapper = getConnectedWrapper(deviceId)
                    ?: return@launch ErrorConverter.rejectPromise(promise::reject, ErrorConverter.BleErrorInfo(
                        code = ErrorConverter.DEVICE_NOT_CONNECTED,
                        message = "Device $deviceId is not connected",
                        isRetryable = false,
                        deviceId = deviceId
                    ))

                wrapper.requestPhyValue(txPhy.toInt(), rxPhy.toInt())
                promise.resolve(EventSerializer.serializeDeviceInfo(
                    deviceAddress = deviceId,
                    deviceName = wrapper.deviceName,
                    mtu = wrapper.currentMtu
                ))
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                ErrorConverter.rejectPromise(promise::reject, ErrorConverter.fromException(e, deviceId, "requestPhy"), e)
            }
        }
    }

    override fun readPhy(deviceId: String, promise: Promise) {
        if (!guardClient("readPhy", promise)) return

        scope.launch {
            try {
                val wrapper = getConnectedWrapper(deviceId)
                    ?: return@launch ErrorConverter.rejectPromise(promise::reject, ErrorConverter.BleErrorInfo(
                        code = ErrorConverter.DEVICE_NOT_CONNECTED,
                        message = "Device $deviceId is not connected",
                        isRetryable = false,
                        deviceId = deviceId
                    ))

                wrapper.readPhyValue()
                promise.resolve(EventSerializer.serializeDeviceInfo(
                    deviceAddress = deviceId,
                    deviceName = wrapper.deviceName,
                    mtu = wrapper.currentMtu
                ))
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                ErrorConverter.rejectPromise(promise::reject, ErrorConverter.fromException(e, deviceId, "readPhy"), e)
            }
        }
    }

    // ---- Connection Priority ----

    override fun requestConnectionPriority(deviceId: String, priority: Double, promise: Promise) {
        if (!guardClient("requestConnectionPriority", promise)) return

        scope.launch {
            try {
                val wrapper = getConnectedWrapper(deviceId)
                    ?: return@launch ErrorConverter.rejectPromise(promise::reject, ErrorConverter.BleErrorInfo(
                        code = ErrorConverter.DEVICE_NOT_CONNECTED,
                        message = "Device $deviceId is not connected",
                        isRetryable = false,
                        deviceId = deviceId
                    ))

                wrapper.requestConnectionPriorityValue(priority.toInt())
                promise.resolve(EventSerializer.serializeDeviceInfo(
                    deviceAddress = deviceId,
                    deviceName = wrapper.deviceName,
                    mtu = wrapper.currentMtu
                ))
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                ErrorConverter.rejectPromise(promise::reject, ErrorConverter.fromException(e, deviceId, "requestConnectionPriority"), e)
            }
        }
    }

    // ---- L2CAP (stub — not yet implemented in Nordic BLE Library) ----

    override fun openL2CAPChannel(deviceId: String, psm: Double, promise: Promise) {
        promise.reject(
            ErrorConverter.OPERATION_START_FAILED.toString(),
            "L2CAP channels are not yet supported on Android"
        )
    }

    override fun writeL2CAPChannel(channelId: Double, data: String, promise: Promise) {
        promise.reject(
            ErrorConverter.OPERATION_START_FAILED.toString(),
            "L2CAP channels are not yet supported on Android"
        )
    }

    override fun closeL2CAPChannel(channelId: Double, promise: Promise) {
        promise.reject(
            ErrorConverter.OPERATION_START_FAILED.toString(),
            "L2CAP channels are not yet supported on Android"
        )
    }

    // ---- Bonding ----

    override fun getBondedDevices(promise: Promise) {
        if (!guardClient("getBondedDevices", promise)) return

        try {
            val adapter = getBluetoothAdapter()
            if (adapter == null) {
                promise.resolve(Arguments.createArray())
                return
            }

            val bondedDevices = adapter.bondedDevices
            val result = Arguments.createArray()
            bondedDevices?.forEach { device ->
                var name: String? = null
                try {
                    name = device.name
                } catch (_: SecurityException) {}

                result.pushMap(EventSerializer.serializeDeviceInfo(
                    deviceAddress = device.address,
                    deviceName = name
                ))
            }
            promise.resolve(result)
        } catch (e: SecurityException) {
            ErrorConverter.rejectPromise(promise::reject, ErrorConverter.fromException(e, operation = "getBondedDevices"), e)
        }
    }

    // ---- Authorization ----

    override fun getAuthorizationStatus(promise: Promise) {
        val hasScan = PermissionHelper.hasPermissions(reactContext, PermissionHelper.PermissionGroup.SCAN)
        val hasConnect = PermissionHelper.hasPermissions(reactContext, PermissionHelper.PermissionGroup.CONNECT)

        val status = when {
            hasScan && hasConnect -> "granted"
            !PermissionHelper.isBluetoothSupported(reactContext) -> "unsupported"
            else -> "denied"
        }
        promise.resolve(status)
    }

    // ---- Cancellation ----

    override fun cancelTransaction(transactionId: String, promise: Promise) {
        pendingTransactions.remove(transactionId)?.cancel()
        promise.resolve(null)
    }

    // ---- Internal helpers ----

    private fun guardClient(methodName: String, promise: Promise): Boolean {
        if (!isClientCreated) {
            ErrorConverter.rejectPromise(promise::reject, ErrorConverter.BleErrorInfo(
                code = ErrorConverter.BLUETOOTH_MANAGER_DESTROYED,
                message = "BleManager cannot call $methodName because client has been destroyed",
                isRetryable = false
            ))
            return false
        }
        return true
    }

    private fun getConnectedWrapper(deviceId: String): BleManagerWrapper? {
        val wrapper = connections[deviceId]
        return if (wrapper?.isConnected == true) wrapper else null
    }

    private fun getBluetoothAdapter(): BluetoothAdapter? {
        val manager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        return manager?.adapter
    }

    private fun getCurrentBluetoothState(): String {
        if (!PermissionHelper.isBluetoothSupported(reactContext)) return "Unsupported"
        val adapter = getBluetoothAdapter() ?: return "Unsupported"

        return try {
            when (adapter.state) {
                BluetoothAdapter.STATE_ON -> "PoweredOn"
                BluetoothAdapter.STATE_OFF -> "PoweredOff"
                BluetoothAdapter.STATE_TURNING_ON,
                BluetoothAdapter.STATE_TURNING_OFF -> "Resetting"
                else -> "Unknown"
            }
        } catch (_: SecurityException) {
            "Unauthorized"
        }
    }

    private fun registerBluetoothStateReceiver() {
        if (bluetoothStateReceiver != null) return

        bluetoothStateReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (intent?.action == BluetoothAdapter.ACTION_STATE_CHANGED) {
                    emitOnStateChange(EventSerializer.serializeStateChangeEvent(getCurrentBluetoothState()))
                }
            }
        }

        val filter = IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(bluetoothStateReceiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            reactContext.registerReceiver(bluetoothStateReceiver, filter)
        }
    }

    private fun unregisterBluetoothStateReceiver() {
        bluetoothStateReceiver?.let {
            try {
                reactContext.unregisterReceiver(it)
            } catch (_: Exception) {}
            bluetoothStateReceiver = null
        }
    }
}
