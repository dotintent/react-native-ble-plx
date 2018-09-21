package com.polidea.blenative.centralmanager

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.content.Context
import android.os.Build
import android.os.Handler
import com.polidea.blenative.CancelOptionKeys
import com.polidea.blenative.Constants
import com.polidea.blenative.handlers.*
import com.polidea.blenative.models.*
import com.polidea.blenative.scan.ScanHelper
import com.polidea.blenative.scan.ScanHelperImpl19
import com.polidea.blenative.scan.ScanHelperImpl21
import com.polidea.blenative.task.TaskDispatcherImpl
import com.polidea.blenative.utils.*
import java.util.*


typealias Result = Map<Int, Any?>
typealias Callback = (Result) -> Void

class CentralManager(val context: Context, val bluetoothManager: BluetoothManager, val id: Int) {
    val locationServicesStatus: LocationServicesStatus =
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M)
                LocationServicesStatusApi19()
            else
                LocationServicesStatusApi23(context)

    val bufferHandler = BufferHandler()

    val cacheHandler = CacheHandler()

    private val bluetoothAdapter: BluetoothAdapter = bluetoothManager.adapter

    private val scanHelper: ScanHelper =
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M)
                ScanHelperImpl19(bluetoothAdapter)
            else
                ScanHelperImpl21(bluetoothAdapter)

    private val requestHandler = RequestHandler(TaskDispatcherImpl(Handler()))

    private val notificationsHandler = NotificationHandler()

    private val gattQueueCallbackHandler = CentralManagerQueueCallbackWrapper(requestHandler, notificationsHandler)

    private val gattQueueHandler = GattQueueHandler(gattQueueCallbackHandler)

    private val delegateHandler = CentralManagerDelegateWrapper(id, bufferHandler, cacheHandler, requestHandler)

    private val peripheralDelegateHandler = PeripheralDelegateWrapper(id, requestHandler, cacheHandler, bufferHandler, notificationsHandler, gattQueueHandler)

    init {
        delegateHandler.register(context)
    }

    // MARK: - Transactions

    fun cancelPromise(promiseId: String) {
        BleLog.d("CentralManager cancelPromise(promiseId: $promiseId)")
        requestHandler.removeRequest(promiseId)?.let {
            it.callback(BleError.cancelled().asErrorResult())
        }
    }

    fun actionOnBuffer(id: Int, options: Map<String, Any>, cancelOptions: Map<String, Any>, callback: Callback) {
        BleLog.d("CentralManager actionOnBuffer(id: $id, options: $options, cancelOptions: $cancelOptions)")
        val buffer = bufferHandler.buffer(id)
        if (buffer == null) {
            callback(BleError.bufferNotExist().asErrorResult())
            return
        }
        buffer.invalidatedReason?.let { reason ->
            callback(reason.asErrorResult())
            return
        }
        val items = bufferHandler.actionOnBuffer(buffer, options)
        if (items != null) {
            callback(ResultUtils.createSuccessResult(items))
            return
        } else {
            val request = Request(buffer.type.requestType,
                    buffer.id,
                    cancelOptions[CancelOptionKeys.PROMISE_ID.value] as? String,
                    options,
                    callback)
            requestHandler.addRequest(request, timeoutFrom(cancelOptions))
        }
    }

    fun stopBuffer(id: Int, callback: Callback) {
        BleLog.d("CentralManager stopBuffer(id: $id)")
        val buffer = bufferHandler.buffer(id)
        if (buffer == null) {
            callback(BleError.bufferNotExist().asErrorResult())
            return
        }
        bufferHandler.removeBuffer(buffer)
        handleOnBufferRemoved(buffer)

        callback(ResultUtils.createSuccessResult(true))
    }

    fun getState(callback: Callback) {
        BleLog.d("CentralManager getState()")
        if (!ensureLocationServicesStatus(callback)) {
            return
        }
        callback(currentState.asSuccessResult())
    }

    fun monitorState(options: Map<String, Any>?, callback: Callback) {
        BleLog.d("CentralManager monitorState(options: $options)")
        if (!ensureLocationServicesStatus(callback)) {
            return
        }

        val buffer = bufferHandler.addBuffer(BufferType.STATE)
        if (options?.emitCurrentState == true) {
            buffer.append(currentState.asDataObject())
        }
        callback(buffer.asSuccessResult(id))
    }

    fun monitorRestoreState(callback: Callback) {
        BleLog.d("CentralManager monitorRestoreState()")
        if (!ensureLocationServicesStatus(callback)) {
            return
        }

        callback(BleError.methodNotSupported("Cannot monitor restore state on Android").asErrorResult())
    }

    fun scanForPeripherals(filteredUUIDs: Array<String>?, options: Map<String, Any>, callback: Callback) {
        BleLog.d("CentralManager scanForPeripherals(filteredUUIDs: $filteredUUIDs, $options)")
        if (!ensureState(callback)) {
            return
        }

        if (bufferHandler.hasBuffer(BufferType.SCAN)) {
            callback(BleError.scanStartFailed("Cannot start new scan when there is different scan ongoing").asErrorResult())
            return
        }

        val uuids = mutableListOf<UUID>()
        filteredUUIDs?.forEach {
            val uuid = UUIDConverter.convert(it)
            if (uuid == null) {
                callback(BleError.invalidIdentifiers(filteredUUIDs).asErrorResult())
                return
            }
            uuids.add(uuid)
        }

        val buffer = bufferHandler.addBuffer(BufferType.SCAN)

        scanHelper.startScan(uuids.toTypedArray(), delegateHandler)

        callback(buffer.asSuccessResult(id))
    }

    fun stopScanningBuffer() {
        BleLog.d("CentralManager stopScanningBuffer()")
        scanHelper.stopScan()
    }

    fun getPeripherals(deviceAddresses: Array<String>, callback: Callback) {
        BleLog.d("CentralManager getPeripherals(deviceAddresses: $deviceAddresses)")
        if (!ensureState(callback)) {
            return
        }

        val devices = mutableListOf<Map<String, Any>>()
        for (address in deviceAddresses) {
            val device = retrieveDevice(address, callback) ?: return
            devices.add(device.asDataObject(id))
        }

        callback(ResultUtils.createSuccessResult(devices))
    }

    fun getConnectedPeripherals(serviceUUIDs: Array<String>, callback: Callback) {
        BleLog.d("CentralManager getConnectedPeripherals(serviceUUIDs: $serviceUUIDs)")
        if (!ensureState(callback)) {
            return
        }

        val connectedDevices = bluetoothManager.getConnectedDevices(BluetoothProfile.GATT)
        val devices = connectedDevices.filter {
            val gatt = cacheHandler.gatt(it) ?: return@filter false
            gatt.services.any { serviceUUIDs.contains(it.uuid.toString()) }
        }.map { it.asDataObject(id) }
        callback(ResultUtils.createSuccessResult(devices))
    }

    fun connectToPeripheral(address: String, options: Map<String, Any>, callback: Callback) {
        BleLog.d("CentralManager connectToPeripheral(address: $address, options: $options)")
        if (!ensureState(callback)) {
            return
        }

        val connectedDevice = bluetoothManager.getConnectedDevices(BluetoothProfile.GATT).findLast { it.address == address }
        if (connectedDevice != null) {
            callback(BleError.peripheralAlreadyConnected(address).asErrorResult())
            return
        }

        val device = retrieveDevice(address, callback) ?: return

        val deviceId = ObjectIdGenerators.devices.idForElement(device)
        val request = Request(RequestType.CONNECT, deviceId, options.promiseId, options, callback)
        requestHandler.addRequest(request, timeoutFrom(options))

        val autoConnect = options.autoConnect ?: false

        val gatt = device.connectGatt(context, autoConnect, peripheralDelegateHandler)
        if (gatt == null) {
            request.callback.invoke(BleError.peripheralConnectionFailed(device.address, reason = "Could not create Gatt").asErrorResult())
            requestHandler.removeRequest(request)
            return
        }
        cacheHandler.addGatt(gatt)
    }

    fun cancelPeripheralConnection(address: String, cancelOptions: Map<String, Any>, callback: Callback) {
        BleLog.d("CentralManager cancelPeripheralConnection(address: $address, cancelOptions: $cancelOptions)")
        if (!ensureState(callback)) {
            return
        }

        val device = bluetoothManager.adapter.getRemoteDevice(address)
        if (device == null) {
            callback(BleError.peripheralNotConnected(address).asErrorResult())
            return
        }
        val deviceState = bluetoothManager.getConnectionState(device, BluetoothProfile.GATT)
        if (deviceState == BluetoothProfile.STATE_CONNECTED || deviceState == BluetoothProfile.STATE_CONNECTING) {
            val gatt = cacheHandler.gatt(device)
            if (gatt == null) {
                callback(BleError.peripheralNotConnected(address).asErrorResult())
                return
            }

            val deviceId = ObjectIdGenerators.devices.idForElement(device)
            val request = Request(RequestType.DISCONNECT, deviceId, cancelOptions.promiseId, null, callback)
            requestHandler.addRequest(request, timeoutFrom(cancelOptions))

            val queueItem = GattDisconnectQueueItem(gatt)
            gattQueueHandler.add(queueItem)
        } else {
            callback(BleError.peripheralNotConnected(address).asErrorResult())
        }
    }

    fun isPeripheralConnected(address: String, callback: Callback) {
        BleLog.d("CentralManager isPeripheralConnected(address: $address)")
        if (!ensureState(callback)) {
            return
        }

        val connectedDevice = bluetoothManager.getConnectedDevices(BluetoothProfile.GATT).findLast { it.address == address }
        callback(ResultUtils.createSuccessResult(connectedDevice != null))
    }

    fun monitorDisconnection(callback: Callback) {
        BleLog.d("CentralManager monitorDisconnection()")
        if (!ensureState(callback)) {
            return
        }

        val buffer = bufferHandler.addBuffer(BufferType.DISCONNECT)
        callback(buffer.asSuccessResult(id))
    }

    fun discoverAllServicesAndCharacteristicsForPeripheral(address: String, callback: Callback) {
        BleLog.d("CentralManager discoverAllServicesAndCharacteristicsForPeripheral(address: $address)")
        if (!ensureState(callback)) {
            return
        }

        val gatt = retrieveConnectedDeviceGatt(address, callback) ?: return

        val deviceId = ObjectIdGenerators.devices.idForElement(gatt.device)
        val request = Request(RequestType.DISCOVER_SERVICES, deviceId, callback = callback)
        requestHandler.addRequest(request, null)

        val queueItem = GattDiscoverServicesQueueItem(gatt)
        gattQueueHandler.add(queueItem)
    }

    fun getServiceForPeripheral(address: String, serviceUUIDString: String, callback: Callback) {
        BleLog.d("CentralManager getServiceForPeripheral(address: $address, serviceUUIDString: $serviceUUIDString)")
        if (!ensureState(callback)) {
            return
        }

        val serviceUUID = UUIDUtils.fromStringSafe(serviceUUIDString)
        if (serviceUUID == null) {
            callback(BleError.invalidIdentifier(serviceUUIDString).asErrorResult())
            return
        }

        val gatt = retrieveConnectedDeviceGatt(address, callback) ?: return

        val service = gatt.services.find { serviceUUID == it.uuid }
        if (service != null) {
            callback(service.asSuccessResult(id, gatt.device.address))
        } else {
            callback(BleError.serviceNotFound(serviceUUIDString).asErrorResult())
        }
    }

    fun getServicesForPeripheral(address: String, callback: Callback) {
        BleLog.d("CentralManager getServicesForPeripheral(address: $address)")
        if (!ensureState(callback)) {
            return
        }

        val gatt = retrieveConnectedDeviceGatt(address, callback) ?: return

        val services = gatt.services.map { it.asDataObject(id, gatt.device.address) }
        callback(ResultUtils.createSuccessResult(services))
    }

    fun getCharacteristicForService(address: String, serviceUUIDString: String, characteristicUUIDString: String, callback: Callback) {
        BleLog.d("CentralManager getCharacteristicForService(address: $address, serviceUUIDString: $serviceUUIDString, characteristicUUIDString: $characteristicUUIDString)")
        if (!ensureState(callback)) {
            return
        }

        val serviceUUID = UUIDUtils.fromStringSafe(serviceUUIDString)
        if (serviceUUID == null) {
            callback(BleError.invalidIdentifier(serviceUUIDString).asErrorResult())
            return
        }

        val characteristicUUID = UUIDUtils.fromStringSafe(characteristicUUIDString)
        if (characteristicUUID == null) {
            callback(BleError.invalidIdentifier(characteristicUUIDString).asErrorResult())
            return
        }

        val gatt = retrieveConnectedDeviceGatt(address, callback) ?: return

        val service = gatt.services.first { it.uuid == serviceUUID }
        if (service == null) {
            callback(BleError.serviceNotFound(serviceUUIDString).asErrorResult())
            return
        }

        val characteristic = service.characteristics.first { it.uuid == characteristicUUID }
        if (characteristic == null) {
            callback(BleError.characteristicNotFound(characteristicUUIDString).asErrorResult())
            return
        }

        callback(characteristic.asSuccessResult(id, gatt.device.address))
    }

    fun getCharacteristicForService(serviceId: Int, characteristicUUIDString: String, callback: Callback) {
        BleLog.d("CentralManager getCharacteristicForService(serviceId: $serviceId, characteristicUUIDString: $characteristicUUIDString)")
        if (!ensureState(callback)) {
            return
        }

        val characteristicUUID = UUIDUtils.fromStringSafe(characteristicUUIDString)
        if (characteristicUUID == null) {
            callback(BleError.invalidIdentifier(characteristicUUIDString).asErrorResult())
            return
        }

        val service = cacheHandler.service(serviceId)
        if (service == null) {
            callback(BleError.serviceNotFound(serviceId.toString()).asErrorResult())
            return
        }

        val device = bluetoothManager.getConnectedDevices(BluetoothProfile.GATT).first {
            val gatt = cacheHandler.gatt(it) ?: return@first false
            gatt.services.contains(service)
        }
        if (device == null) {
            callback(BleError.peripheralNotConnected("Unknown").asErrorResult())
            return
        }

        val characteristic = service.characteristics.first { it.uuid == characteristicUUID }
        if (characteristic == null) {
            callback(BleError.characteristicNotFound(characteristicUUIDString).asErrorResult())
            return
        }

        callback(characteristic.asSuccessResult(id, device.address))
    }

    fun getCharacteristicsForService(serviceId: Int, callback: Callback) {
        BleLog.d("CentralManager getCharacteristicsForService(serviceId: $serviceId)")
        if (!ensureState(callback)) {
            return
        }

        val service = cacheHandler.service(serviceId)
        if (service == null) {
            callback(BleError.serviceNotFound(serviceId.toString()).asErrorResult())
            return
        }

        val device = bluetoothManager.getConnectedDevices(BluetoothProfile.GATT).first {
            val gatt = cacheHandler.gatt(it) ?: return@first false
            gatt.services.contains(service)
        }
        if (device == null) {
            callback(BleError.peripheralNotConnected("Unknown").asErrorResult())
            return
        }

        val characteristics = service.characteristics.map { it.asDataObject(id, device.address) }
        callback(ResultUtils.createSuccessResult(characteristics))
    }

    fun getNameForPeripheral(address: String, callback: Callback) {
        BleLog.d("CentralManager getNameForPeripheral(address: $address)")
        if (!ensureState(callback)) {
            return
        }

        val connectedDevice = retrieveConnectedDevice(address, callback) ?: return
        callback(ResultUtils.createSuccessResult(connectedDevice.name))
    }

    fun monitorPeripheralName(address: String, callback: Callback) {
        BleLog.d("CentralManager monitorPeripheralName(address: $address)")
        if (!ensureState(callback)) {
            return
        }

        callback(BleError.methodNotSupported("Cannot monitor peripheral name on Android").asErrorResult())
    }

    fun readRSSIForPeripheral(address: String, cancelOptions: Map<String, Any>, callback: Callback) {
        BleLog.d("CentralManager readRSSIForPeripheral(address: $address, cancelOptions: $cancelOptions)")
        if (!ensureState(callback)) {
            return
        }

        val gatt = retrieveConnectedDeviceGatt(address, callback) ?: return

        val deviceId = ObjectIdGenerators.devices.idForElement(gatt.device)
        val request = Request(RequestType.READ_RSSI, deviceId, cancelOptions.promiseId, callback = callback)
        requestHandler.addRequest(request, timeoutFrom(cancelOptions))

        val queueItem = GattReadRemoteRssiQueueItem(gatt)
        gattQueueHandler.add(queueItem)
    }

    fun requestMTUForPeripheral(address: String, mtu: Int, cancelOptions: Map<String, Any>, callback: Callback) {
        BleLog.d("CentralManager requestMTUForPeripheral(address: $address, mtu: $mtu, cancelOptions: $cancelOptions)")
        if (!ensureState(callback)) {
            return
        }

        val gatt = retrieveConnectedDeviceGatt(address, callback) ?: return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            val deviceId = ObjectIdGenerators.devices.idForElement(gatt.device)
            val request = Request(RequestType.MTU, deviceId, cancelOptions.promiseId, callback = callback)
            requestHandler.addRequest(request, timeoutFrom(cancelOptions))

            val queueItem = GattRequestMtuQueueItem(gatt, mtu)
            gattQueueHandler.add(queueItem)
        } else {
            callback(BleError.methodNotSupported("Request MTU is supported from API 21 on Android. Your version is ${Build.VERSION.SDK_INT}.").asErrorResult())
        }
    }

    fun getMTUForPeripheral(address: String, callback: Callback) {
        BleLog.d("CentralManager getMTUForPeripheral(address: $address)")
        if (!ensureState(callback)) {
            return
        }

        val device = retrieveConnectedDevice(address, callback) ?: return
        val deviceId = ObjectIdGenerators.devices.idForElement(device)
        callback(ResultUtils.createSuccessResult(cacheHandler.deviceMtu(deviceId)
                ?: Constants.MINIMUM_MTU))
    }

    fun monitorMTUForPeripheral(address: String, callback: Callback) {
        BleLog.d("CentralManager monitorMTUForPeripheral(address: $address)")
        if (!ensureState(callback)) {
            return
        }

        val gatt = retrieveConnectedDeviceGatt(address, callback) ?: return

        val deviceId = ObjectIdGenerators.devices.idForElement(gatt.device)
        val buffer = bufferHandler.addBuffer(BufferType.MTU, deviceId)
        callback(buffer.asSuccessResult(id))
    }

    fun readBase64CharacteristicValue(characteristicId: Int, cancelOptions: Map<String, Any>, callback: Callback) {
        BleLog.d("CentralManager readBase64CharacteristicValue(characteristicId: $characteristicId, cancelOptions: $cancelOptions)")
        if (!ensureState(callback)) {
            return
        }

        val characteristic = cacheHandler.characteristic(characteristicId)
        if (characteristic == null) {
            callback(BleError.characteristicNotFound(characteristicId.toString()).asErrorResult())
            return
        }

        val gatt = retrieveGattForService(characteristic.service, callback) ?: return

        val request = Request(RequestType.READ, characteristicId, cancelOptions.promiseId, callback = callback)
        requestHandler.addRequest(request, timeoutFrom(cancelOptions))

        val queueItem = GattReadCharacteristicQueueItem(gatt, characteristic)
        gattQueueHandler.add(queueItem)
    }

    fun writeBase64CharacteristicValue(characteristicId: Int, valueBase64: String, response: Boolean, cancelOptions: Map<String, Any>, callback: Callback) {
        BleLog.d("CentralManager writeBase64CharacteristicValue(characteristicId: $characteristicId, valueBase64: $valueBase64, response: $response, cancelOptions: $cancelOptions)")
        if (!ensureState(callback)) {
            return
        }

        val characteristic = cacheHandler.characteristic(characteristicId)
        if (characteristic == null) {
            callback(BleError.characteristicNotFound(characteristicId.toString()).asErrorResult())
            return
        }

        val gatt = retrieveGattForService(characteristic.service, callback) ?: return

        val request = Request(RequestType.WRITE, characteristicId, cancelOptions.promiseId, callback = callback)
        requestHandler.addRequest(request, timeoutFrom(cancelOptions))

        val queueItem = GattWriteCharacteristicQueueItem(gatt, characteristic, response, valueBase64)
        gattQueueHandler.add(queueItem)
    }

    fun monitorBase64CharacteristicValue(characteristicId: Int, callback: Callback) {
        BleLog.d("CentralManager monitorBase64CharacteristicValue(characteristicId: $characteristicId)")
        if (!ensureState(callback)) {
            return
        }

        val characteristic = cacheHandler.characteristic(characteristicId)
        if (characteristic == null) {
            callback(BleError.characteristicNotFound(characteristicId.toString()).asErrorResult())
            return
        }

        val gatt = retrieveGattForService(characteristic.service, callback) ?: return

        if (gatt.isNotificationEnabled(characteristic)) {
            val buffer = bufferHandler.addBuffer(BufferType.VALUE_CHANGE, characteristicId)
            callback(buffer.asSuccessResult(id))
        } else {
            val callbacks = notificationsHandler.enabledCallbacksForId(characteristicId)
                    ?: mutableListOf()
            callbacks.add {
                if (it[ResultKey.DATA.value] == null) {
                    callback(it)
                } else {
                    val buffer = bufferHandler.addBuffer(BufferType.VALUE_CHANGE, characteristicId)
                    callback(buffer.asSuccessResult(id))
                }
            }
            notificationsHandler.setCallbacksForId(callbacks, characteristicId)
            if (callbacks.size == 1) {
                val queueItem = GattSetNotificationEnabledQueueItem(gatt, characteristic, true)
                gattQueueHandler.add(queueItem)
            }
        }
    }

    fun isCharacteristicNotifying(characteristicId: Int, callback: Callback) {
        BleLog.d("CentralManager isCharacteristicNotifying(characteristicId: $characteristicId)")
        if (!ensureState(callback)) {
            return
        }

        val characteristic = cacheHandler.characteristic(characteristicId)
        if (characteristic == null) {
            callback(BleError.characteristicNotFound(characteristicId.toString()).asErrorResult())
            return
        }

        val gatt = retrieveGattForService(characteristic.service, callback) ?: return
        callback(ResultUtils.createSuccessResult(gatt.isNotificationEnabled(characteristic)))
    }
}