package com.polidea.blenative

import android.bluetooth.BluetoothManager
import android.content.Context
import com.polidea.blenative.centralmanager.Callback
import com.polidea.blenative.centralmanager.CentralManager
import com.polidea.blenative.models.BleError
import com.polidea.blenative.utils.BleLog
import com.polidea.blenative.utils.LogLevelUtils
import com.polidea.blenative.utils.ResultUtils

class ManagerWrapper {

    private val managerCache = ManagerCache()

    fun createCentralManager(context: Context, options: Map<String, Any>, callback: Callback) {
        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        if (bluetoothManager == null) {
            callback(BleError.failedToCreateCentralManager().asErrorResult())
            return
        }

        val id = managerCache.addCentralManager(context, bluetoothManager)
        if (id == null) {
            callback(BleError.manyCentralManagersNotAllowed().asErrorResult())
        } else {
            callback(ResultUtils.createSuccessResult(id))
        }
    }

    fun destroyCentralManager(id: Int) {
        managerCache.removeCentralManager(id)
    }

    fun cancelPromise(centralManagerId: Int, promiseId: String) {
        managerCache.centralManager(centralManagerId)?.let {
            it.cancelPromise(promiseId)
        }
    }

    // MARK: - Buffers

    fun actionOnBuffer(centralManagerId: Int,
                       id: Int,
                       options: Map<String, Any>,
                       cancelOptions: Map<String, Any>,
                       callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.actionOnBuffer(id, options, cancelOptions, callback)
        }
    }

    fun stopBuffer(centralManagerId: Int, id: Int, callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.stopBuffer(id, callback)
        }
    }

    // MARK: - State

    fun getState(centralManagerId: Int, callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.getState(callback)
        }
    }

    fun monitorState(centralManagerId: Int, options: Map<String, Any>?, callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.monitorState(options, callback)
        }
    }

    // MARK: - State restoration

    fun monitorRestoreState(centralManagerId: Int, callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.monitorRestoreState(callback)
        }
    }

    // MARK: - Scanning

    fun scanForPeripherals(centralManagerId: Int,
                           filteredUUIDs: Array<String>?,
                           options: Map<String, Any>,
                           callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.scanForPeripherals(filteredUUIDs, options, callback)
        }
    }

    // MARK:- Name

    fun getNameForPeripheral(centralManagerId: Int, uuidString: String, callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.getNameForPeripheral(uuidString, callback)
        }
    }

    fun monitorPeripheralName(centralManagerId: Int, uuidString: String, callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.monitorPeripheralName(uuidString, callback)
        }
    }

    // MARK: - Read RSSI

    fun readRSSIForPeripheral(centralManagerId: Int,
                              uuidString: String,
                              cancelOptions: Map<String, Any>,
                              callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.readRSSIForPeripheral(uuidString, cancelOptions, callback)
        }
    }

    // MARK: - MTU

    fun requestMTUForPeripheral(centralManagerId: Int,
                                uuidString: String,
                                mtu: Int,
                                cancelOptions: Map<String, Any>,
                                callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.requestMTUForPeripheral(uuidString, mtu, cancelOptions, callback)
        }
    }

    fun getMTUForPeripheral(centralManagerId: Int,
                            uuidString: String,
                            callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.getMTUForPeripheral(uuidString, callback)
        }
    }

    fun monitorMTUForPeripheral(centralManagerId: Int,
                                uuidString: String,
                                callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.monitorMTUForPeripheral(uuidString, callback)
        }
    }

    // MARK: - Device managment

    fun getPeripherals(centralManagerId: Int,
                       deviceIdentifiers: Array<String>,
                       callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.getPeripherals(deviceIdentifiers, callback)
        }
    }

    fun getConnectedPeripherals(centralManagerId: Int,
                                serviceUUIDs: Array<String>,
                                callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.getConnectedPeripherals(serviceUUIDs, callback)
        }
    }

    // MARK: - Connection managment

    fun connectToPeripheral(centralManagerId: Int,
                            uuidString: String,
                            options: Map<String, Any>,
                            callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.connectToPeripheral(uuidString, options, callback)
        }
    }

    fun cancelPeripheralConnection(centralManagerId: Int,
                                   uuidString: String,
                                   cancelOptions: Map<String, Any>,
                                   callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.cancelPeripheralConnection(uuidString, cancelOptions, callback)
        }
    }

    fun isPeripheralConnected(centralManagerId: Int, uuidString: String, callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.isPeripheralConnected(uuidString, callback)
        }
    }

    fun monitorDisconnection(centralManagerId: Int, callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.monitorDisconnection(callback)
        }
    }

    // MARK: - Discovery

    fun discoverAllServicesAndCharacteristicsForPeripheral(centralManagerId: Int,
                                                           uuidString: String,
                                                           callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.discoverAllServicesAndCharacteristicsForPeripheral(uuidString, callback)
        }
    }

    // MARK: - Service and characteristic getters

    fun getServiceForPeripheral(centralManagerId: Int,
                                uuidString: String,
                                serviceUUIDString: String,
                                callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.getServiceForPeripheral(uuidString, serviceUUIDString, callback)
        }
    }

    fun getServicesForPeripheral(centralManagerId: Int,
                                 uuidString: String,
                                 callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.getServicesForPeripheral(uuidString, callback)
        }
    }

    fun getCharacteristicForServiceByUUID(centralManagerId: Int,
                                          uuidString: String,
                                          serviceUUIDString: String,
                                          characteristicUUIDString: String,
                                          callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.getCharacteristicForService(uuidString,
                    serviceUUIDString,
                    characteristicUUIDString,
                    callback)
        }
    }

    fun getCharacteristicForService(centralManagerId: Int,
                                    serviceId: Int,
                                    characteristicUUIDString: String,
                                    callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.getCharacteristicForService(serviceId,
                    characteristicUUIDString,
                    callback)
        }
    }

    fun getCharacteristicsForService(centralManagerId: Int,
                                     serviceId: Int,
                                     callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.getCharacteristicsForService(serviceId, callback)
        }
    }

    // MARK: - Reading

    fun readBase64CharacteristicValue(centralManagerId: Int,
                                      characteristicId: Int,
                                      cancelOptions: Map<String, Any>,
                                      callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.readBase64CharacteristicValue(characteristicId, cancelOptions, callback)
        }
    }

    // MARK: - Writing

    fun writeBase64CharacteristicValue(centralManagerId: Int,
                                       characteristicId: Int,
                                       valueBase64: String,
                                       response: Boolean,
                                       cancelOptions: Map<String, Any>,
                                       callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.writeBase64CharacteristicValue(
                    characteristicId,
                    valueBase64,
                    response,
                    cancelOptions,
                    callback
            )
        }
    }

    // MARK: - Monitoring

    fun monitorBase64CharacteristicValue(centralManagerId: Int,
                                         characteristicId: Int,
                                         callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.monitorBase64CharacteristicValue(characteristicId, callback)
        }
    }

    fun isCharacteristicNotifying(centralManagerId: Int,
                                  characteristicId: Int,
                                  callback: Callback) {
        callOnCentralManager(centralManagerId, callback) {
            it.isCharacteristicNotifying(characteristicId, callback)
        }
    }

    // MARK: - Logging

    fun setLogLevel(logLevelString: String) {
        BleLog.d("ManagerWrapper setLogLevel($logLevelString)")
        val logLevel = LogLevelUtils.fromLevelString(logLevelString)
        BleLog.setLogLevel(logLevel)
    }

    fun getLogLevel(callback: Callback) {
        BleLog.d("ManagerWrapper getLogLevel()")
        val levelDescription = LogLevelUtils.levelDescription(BleLog.getLogLevel())
        callback(ResultUtils.createSuccessResult(levelDescription))
    }

    private fun callOnCentralManager(centralManagerId: Int, callback: Callback, call: (CentralManager) -> Unit) {
        val centralManager = managerCache.centralManager(centralManagerId)
        if (centralManager == null) {
            callback(BleError.managerNotFound().asErrorResult())
            return
        }
        call(centralManager)
    }
}