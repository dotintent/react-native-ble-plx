// @flow
'use strict'

import { NativeEventEmitter } from 'react-native'
import { Device } from './Device'
import { Service } from './Service'
import { Characteristic } from './Characteristic'
import { State } from './TypeDefinition'
import { BleModule } from './BleModule'
import type { NativeDevice, NativeCharacteristic } from './BleModule'
import type {
  Subscription,
  DeviceId,
  UUID,
  TransactionId,
  Base64,
  ScanOptions,
  ConnectionOptions
} from './TypeDefinition'

/**
 * 
 * BleManager is an entry point for react-native-ble-plx library. It provides all means to discover and work with
 * {@link Device} instances. It should be initialized only once with `new` keyword and method 
 * {@link #BleManager#destroy|destroy()} should be called on its instance when user wants to deallocate all resources.
 * 
 * @example
 * const manager = new BleManager();
 * // ... work with BLE manager ...
 * manager.destroy();
 */
export class BleManager {
  // Scan subscriptions
  _scanEventSubscription: ?NativeEventEmitter
  // Listening to BleModule events
  _eventEmitter: NativeEventEmitter
  // Unique identifier used to create internal transactionIds
  _uniqueId: number

  /**
   * Creates an instance of {@link BleManager}.
   */
  constructor() {
    BleModule.createClient()
    this._eventEmitter = new NativeEventEmitter(BleModule)
    this._uniqueId = 0
  }

  /**
   * Destroys {@link BleManager} instance. A new instance needs to be created to continue working with 
   * this library.
   */
  destroy() {
    BleModule.destroyClient()
  }

  /**
   * Generates new unique identifier to be used internally.
   * 
   * @returns {string} New identifier.
   * @private
   */
  _nextUniqueID(): string {
    this._uniqueId += 1
    return this._uniqueId.toString()
  }

  // Mark: Common ------------------------------------------------------------------------------------------------------

  /**
   * Cancels pending transaction.
   * 
   * Few operations such as monitoring characteristic's value changes can be cancelled by a user. Basically every API 
   * entry which accepts `transactionId` allows to call `cancelTransaction` function. When cancelled operation is a 
   * promise or a callback which registers errors, `"Cancelled"` error will be emitted in that case. Cancelling 
   * transaction which doesn't exist is ignored.
   * 
   * @example
   * const transactionId = 'monitor_battery';
   * 
   * // Monitor battery notifications
   * manager.monitorCharacteristicForDevice(
   *   device.id, '180F', '2A19', 
   *   (error, characteristic) => {
   *   // Handle battery level changes...
   * }, transactionId);
   * 
   * // Cancel after specified amount of time
   * setTimeout(() => manager.cancelTransaction(transactionId), 2000);
   * 
   * @param {TransactionId} transactionId Id of pending transactions.
   */
  cancelTransaction(transactionId: TransactionId) {
    BleModule.cancelTransaction(transactionId)
  }

  // Mark: Monitoring state --------------------------------------------------------------------------------------------

  /**
   * Current, global {@link State} of a {@link BleManager}. All APIs are working only when active state
   * is "PoweredOn". 
   * 
   * @returns {Promise<State>} Promise which emits current state of BleManager.
   */
  state(): Promise<$Keys<typeof State>> {
    return BleModule.state()
  }

  /**
  * Notifies about {@link State} changes of a {@link BleManager}.
  * 
  * @example
  * const subscription = this.manager.onStateChange((state) => {
  *      if (state === 'PoweredOn') {
  *          this.scanAndConnect();
  *          subscription.remove();
  *      }
  *  }, true);
  * 
  * @param {function(newState: State)} listener Callback which emits state changes of BLE Manager. 
  * Look at {@link State} for possible values.
  * @param {boolean} [emitCurrentState=false] If true, current state will be emitted as well. Defaults to false.
  *  
  * @returns {Subscription} Subscription on which `remove()` function can be called to unsubscribe.
  */
  onStateChange(listener: (newState: $Keys<typeof State>) => void, emitCurrentState: boolean = false): Subscription {
    const subscription: Subscription = this._eventEmitter.addListener(BleModule.StateChangeEvent, listener)

    if (emitCurrentState) {
      var cancelled = false
      this.state().then(currentState => {
        if (!cancelled) {
          listener(currentState)
        }
      })

      return {
        remove: () => {
          cancelled = true
          subscription.remove()
        }
      }
    }

    return subscription
  }

  // Mark: Scanning ----------------------------------------------------------------------------------------------------

  /**
   * Starts device scanning. When previous scan is in progress it will be stopped before executing this command.
   * 
   * @param {?Array<UUID>} UUIDs Array of strings containing {@link UUID}s of {@link Service}s which are registered in 
   * scanned {@link Device}. If `null` is passed, all available {@link Device}s will be scanned.
   * @param {?ScanOptions} options Optional configuration for scanning operation.
   * @param {function(error: ?Error, scannedDevice: ?Device)} listener Function which will be called for every scanned 
   * {@link Device} (devices may be scanned multiple times). It's first argument is potential {@link Error} which is set 
   * to non `null` value when scanning failed. You have to start scanning process again if that happens. Second argument 
   * is a scanned {@link Device}.
   */
  startDeviceScan(
    UUIDs: ?Array<UUID>,
    options: ?ScanOptions,
    listener: (error: ?Error, scannedDevice: ?Device) => void
  ) {
    this.stopDeviceScan()
    const scanListener = ([error, nativeDevice]: [?Error, ?NativeDevice]) => {
      listener(error, nativeDevice ? new Device(nativeDevice, this) : null)
    }
    this._scanEventSubscription = this._eventEmitter.addListener(BleModule.ScanEvent, scanListener)
    BleModule.startDeviceScan(UUIDs, options)
  }

  /**
   * Stops {@link Device} scan if in progress.
   */
  stopDeviceScan() {
    if (this._scanEventSubscription != null) {
      this._scanEventSubscription.remove()
      delete this._scanEventSubscription
    }
    BleModule.stopDeviceScan()
  }

  // Mark: Connection management ---------------------------------------------------------------------------------------

  /**
   * Connects to {@link Device} with provided ID.
   * 
   * @param {DeviceId} deviceIdentifier {@link Device} identifier.
   * @param {?ConnectionOptions} options Platform specific options for connection establishment.
   * @returns {Promise<Device>} Connected {@link Device} object if successful.
   */
  async connectToDevice(deviceIdentifier: DeviceId, options: ?ConnectionOptions): Promise<Device> {
    const nativeDevice = await BleModule.connectToDevice(deviceIdentifier, options)
    return new Device(nativeDevice, this)
  }

  /**
   * Disconnects from {@link Device} if it's connected or cancels pending connection.
   * 
   * @param {DeviceId} deviceIdentifier {@link Device} identifier to be closed. 
   * @returns {Promise<Device>} Returns closed {@link Device} when operation is successful.
   */
  async cancelDeviceConnection(deviceIdentifier: DeviceId): Promise<Device> {
    const nativeDevice = await BleModule.cancelDeviceConnection(deviceIdentifier)
    return new Device(nativeDevice, this)
  }

  /**
   * Monitors if {@link Device} was disconnected due to any errors or connection problems.
   * 
   * @param {DeviceId} deviceIdentifier {@link Device} identifier to be monitored.
   * @param {function(error: ?Error, device: Device)} listener - callback returning error as a reason of disconnection 
   * if available and {@link Device} object.
   * @returns {Subscription} Subscription on which `remove()` function can be called to unsubscribe.
   */
  onDeviceDisconnected(deviceIdentifier: DeviceId, listener: (error: ?Error, device: Device) => void): Subscription {
    const disconnectionListener = ([error, nativeDevice]: [?Error, NativeDevice]) => {
      if (deviceIdentifier !== nativeDevice.id) return
      listener(error, new Device(nativeDevice, this))
    }

    const subscription: Subscription = this._eventEmitter.addListener(
      BleModule.DisconnectionEvent,
      disconnectionListener
    )

    return subscription
  }

  /**
   * Check connection state of a {@link Device}.
   * 
   * @param {DeviceId} deviceIdentifier {@link Device} identifier.
   * @returns {Promise<boolean>} Promise which emits `true` if device is connected, and `false` otherwise.
   */
  isDeviceConnected(deviceIdentifier: DeviceId): Promise<boolean> {
    return BleModule.isDeviceConnected(deviceIdentifier)
  }

  // Mark: Discovery ---------------------------------------------------------------------------------------------------

  /**
   * Discovers all {@link Service}s and {@link Characteristic}s for {@link Device}.
   * 
   * @param {DeviceId} deviceIdentifier {@link Device} identifier.
   * @returns {Promise<Device>} Promise which emits {@link Device} object if all available services and 
   * characteristics have been discovered.
   */
  async discoverAllServicesAndCharacteristicsForDevice(deviceIdentifier: DeviceId): Promise<Device> {
    const nativeDevice = await BleModule.discoverAllServicesAndCharacteristicsForDevice(deviceIdentifier)
    return new Device(nativeDevice, this)
  }

  // Mark: Service and characteristic getters --------------------------------------------------------------------------

  /**
   * List of discovered {@link Service}s for {@link Device}.
   * 
   * @param {DeviceId} deviceIdentifier {@link Device} identifier.
   * @returns {Promise<Array<Service>>} Promise which emits array of {@link Service} objects which are discovered for a 
   * {@link Device}.
   */
  async servicesForDevice(deviceIdentifier: DeviceId): Promise<Array<Service>> {
    const services = await BleModule.servicesForDevice(deviceIdentifier)
    return services.map(nativeService => {
      return new Service(nativeService, this)
    })
  }

  /**
   * List of discovered {@link Characteristic}s for given {@link Device} and {@link Service}.
   * 
   * @param {DeviceId} deviceIdentifier {@link Device} identifier.
   * @param {UUID} serviceUUID {@link Service} UUID.
   * @returns {Promise<Array<Characteristic>>} Promise which emits array of {@link Characteristic} objects which are 
   * discovered for a {@link Device} in specified {@link Service}.
   */
  async characteristicsForDevice(deviceIdentifier: DeviceId, serviceUUID: UUID): Promise<Array<Characteristic>> {
    const characteristics = await BleModule.characteristicsForDevice(deviceIdentifier, serviceUUID)
    return characteristics.map(nativeCharacteristic => {
      return new Characteristic(nativeCharacteristic, this)
    })
  }

  // Mark: Characteristics operations ----------------------------------------------------------------------------------

  /**
   * Read {@link Characteristic} value.
   * 
   * @param {DeviceId} deviceIdentifier {@link Device} identifier.
   * @param {UUID} serviceUUID {@link Service} UUID.
   * @param {UUID} characteristicUUID {@link Characteristic} UUID.
   * @param {?TransactionId} transactionId optional `transactionId` which can be used in 
   * {@link #BleManager#cancelTransaction|cancelTransaction()} function.
   * @returns {Promise<Characteristic>} Promise which emits first {@link Characteristic} object matching specified 
   * UUID paths. Latest value of {@link Characteristic} will be stored inside returned object.
   */
  async readCharacteristicForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    transactionId: ?TransactionId
  ): Promise<Characteristic> {
    if (!transactionId) {
      transactionId = this._nextUniqueID()
    }

    const nativeCharacteristic = await BleModule.readCharacteristicForDevice(
      deviceIdentifier,
      serviceUUID,
      characteristicUUID,
      transactionId
    )

    return new Characteristic(nativeCharacteristic, this)
  }

  /**
   * Write {@link Characteristic} value with response.
   * 
   * @param {DeviceId} deviceIdentifier {@link Device} identifier.
   * @param {UUID} serviceUUID {@link Service} UUID.
   * @param {UUID} characteristicUUID {@link Characteristic} UUID.
   * @param {Base64} base64Value Value in Base64 format.
   * @param {?TransactionId} transactionId optional `transactionId` which can be used in
   * {@link #BleManager#cancelTransaction|cancelTransaction()} function.
   * @returns {Promise<Characteristic>} Promise which emits first {@link Characteristic} object matching specified 
   * UUID paths. Latest value of characteristic may not be stored inside returned object.
   */
  async writeCharacteristicWithResponseForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    base64Value: Base64,
    transactionId: ?TransactionId
  ): Promise<Characteristic> {
    if (!transactionId) {
      transactionId = this._nextUniqueID()
    }

    const nativeCharacteristic = await BleModule.writeCharacteristicForDevice(
      deviceIdentifier,
      serviceUUID,
      characteristicUUID,
      base64Value,
      true,
      transactionId
    )

    return new Characteristic(nativeCharacteristic, this)
  }

  /**
   * Write {@link Characteristic} value without response.
   * 
   * @param {DeviceId} deviceIdentifier {@link Device} identifier.
   * @param {UUID} serviceUUID {@link Service} UUID.
   * @param {UUID} characteristicUUID {@link Characteristic} UUID.
   * @param {Base64} base64Value Value in Base64 format.
   * @param {?TransactionId} transactionId optional `transactionId` which can be used in
   * {@link #BleManager#cancelTransaction|cancelTransaction()} function.
   * @returns {Promise<Characteristic>} Promise which emits first {@link Characteristic} object matching specified 
   * UUID paths. Latest value of characteristic may not be stored inside returned object.
   */
  async writeCharacteristicWithoutResponseForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    base64Value: Base64,
    transactionId: ?TransactionId
  ): Promise<Characteristic> {
    if (!transactionId) {
      transactionId = this._nextUniqueID()
    }

    const nativeCharacteristic = await BleModule.writeCharacteristicForDevice(
      deviceIdentifier,
      serviceUUID,
      characteristicUUID,
      base64Value,
      false,
      transactionId
    )

    return new Characteristic(nativeCharacteristic, this)
  }

  /**
   * Monitor value changes of a {@link Characteristic}. If notifications are enabled they will be used
   * in favour of indications.
   * 
   * @param {DeviceId} deviceIdentifier - {@link Device} identifier.
   * @param {UUID} serviceUUID - {@link Service} UUID.
   * @param {UUID} characteristicUUID - {@link Characteristic} UUID.
   * @param {function(error: ?Error, characteristic: ?Characteristic)} listener - callback which emits 
   * {@link Characteristic} objects with modified value for each notification.
   * @param {?TransactionId} transactionId optional `transactionId` which can be used in 
   * {@link #BleManager#cancelTransaction|cancelTransaction()} function.
   * @returns {Subscription} Subscription on which `remove()` function can be called to unsubscribe.
   */
  monitorCharacteristicForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    listener: (error: ?Error, characteristic: ?Characteristic) => void,
    transactionId: ?TransactionId
  ): Subscription {
    const filledTransactionId = transactionId || this._nextUniqueID()

    const monitorListener = (
      [error, characteristic, msgTransactionId]: [?Error, NativeCharacteristic, TransactionId]
    ) => {
      if (filledTransactionId !== msgTransactionId) return
      if (error) {
        listener(error, null)
        return
      }
      listener(null, new Characteristic(characteristic, this))
    }

    const subscription: Subscription = this._eventEmitter.addListener(BleModule.ReadEvent, monitorListener)

    BleModule.monitorCharacteristicForDevice(
      deviceIdentifier,
      serviceUUID,
      characteristicUUID,
      filledTransactionId
    ).then(
      () => {
        subscription.remove()
      },
      (error: Error) => {
        listener(error, null)
        subscription.remove()
      }
    )

    return {
      remove: () => {
        BleModule.cancelTransaction(filledTransactionId)
      }
    }
  }
}
