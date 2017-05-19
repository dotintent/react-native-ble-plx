// @flow
'use strict'

import { NativeModules, NativeEventEmitter } from 'react-native'
import Device from './Device'
import Service from './Service'
import Characteristic from './Characteristic'

const BleModule = NativeModules.BleClientManager

export type State = 'Unknown' | 'Resetting' | 'Unsupported' | 'Unauthorized' | 'PoweredOff' | 'PoweredOn'

export type Subscription = {
  remove: () => void
}

export type ScanOptions = {
  allowDuplicates?: boolean,
  autoConnect?: boolean
}

export type ConnectionOptions = {
  // Not used for now
}

/**
 * 
 * BleManager is an entry point for react-native-ble-plx library. It provides all means to discover and work with
 * {@link Device} instances. It should be initialized only once with new keyword and method {@link destroy} should be called 
 * on its instance when user wants to deallocate all resources.
 * 
 * @example
 * const manager = new BleManager();
 * // ... work with BLE manager ...
 * manager.destroy(); 
 * 
 * @export
 * @class BleManager
 */
export default class BleManager {
  _scanEventSubscription: ?NativeEventEmitter
  _eventEmitter: NativeEventEmitter
  _uniqueId: number

  constructor() {
    BleModule.createClient()
    this._eventEmitter = new NativeEventEmitter(BleModule)
    this._uniqueId = 0
  }

  /**
   * Destroys BleManager instance. A new instance needs to be created to continue working with react-native-ble-plx.
   * 
   * @memberOf BleManager
   */
  destroy() {
    BleModule.destroyClient()
  }

  _nextUniqueID(): string {
    this._uniqueId += 1
    return this._uniqueId.toString()
  }

  // Mark: Common --------------------------------------------------------------------------------------------------------

  /**
   * Cancels pending transaction.
   * 
   * Few operations such as monitoring characteristic's value changes can be cancelled by a user. Basically every API 
   * entry which accepts `transactionId` allows to call `cancelTransaction` function. When cancelled operation is a 
   * promise or a callback which registers errors, `"Cancelled"` error will be emitted in that case.
   * 
   * Cancelling transaction which doesn't exist is ignored.
   * 
   * @param {string} transactionId Id of pending transactions.
   * 
   * @memberOf BleManager
   */
  cancelTransaction(transactionId: string) {
    BleModule.cancelTransaction(transactionId)
  }

  // Mark: Monitoring state ----------------------------------------------------------------------------------------------

  /**
   * Current state of a manager.
   * 
   * Available states:
   * - `Unknown` - the current state of the manager is unknown; an update is imminent.
   * - `Resetting` - the connection with the system service was momentarily lost; an update is imminent.
   * - `Unsupported` - the platform does not support Bluetooth low energy.
   * - `Unauthorized` - the app is not authorized to use Bluetooth low energy.
   * - `PoweredOff` - Bluetooth is currently powered off.
   * - `PoweredOn` - Bluetooth is currently powered on and available to use.
   * 
   * @returns {Promise<State>} Promise which emits current state of BleManager.
   * 
   * @memberOf BleManager
   */
  state(): Promise<State> {
    return BleModule.state()
  }

  /**
  * 
  * Notifies about state changes of a manager.
  * 
  * @param {function(newState: State)} listener Callback which emits state changes of BLE Manager. 
  * Look at {@link state} for possible values.
  * @param {boolean} [emitCurrentState=false] If true, current state will be emitted as well. Defaults to false.
  *  
  * @returns {Subscription} Subscription on which remove() function can be called to unsubscribe.
  * 
  * @memberOf BleManager
  */
  onStateChange(listener: (newState: State) => void, emitCurrentState: boolean = false): Subscription {
    const subscription = this._eventEmitter.addListener(BleModule.StateChangeEvent, listener)

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

  // Mark: Scanning ------------------------------------------------------------------------------------------------------

  /**
   * Starts device scanning. 
   * 
   * When previous scan is in progress it will be stopped before executing this command.
   * 
   * @param {?string[]} UUIDs - Array of strings containing UUIDs of services which are registered in scanned devices. 
   * If null is passed all available devices will be scanned.
   * @param {?ScanOptions} options - Optional configuration for scanning operation. Scan option object contains two
   * optional fields: `allowDuplicates` for iOS when set to true scanned {@link Device}s will be emitted more
   * frequently, `autoConnect` for Android - allows to connect to devices which are not in range.
   * @param {function(error: ?Error, scannedDevice: ?Device)} listener - Function which will be called for every scanned 
   * {@link Device} (devices may be scanned multiple times). It's first argument is potential {@link Error} which is set 
   * to non `null` value when scanning failed. You have to start scanning process again if that happens. Second argument 
   * is a scanned {@link Device}.
   * 
   * @memberOf BleManager
   */
  startDeviceScan(
    UUIDs: ?(string[]),
    options: ?ScanOptions,
    listener: (error: ?Error, scannedDevice: ?Device) => void
  ) {
    this.stopDeviceScan()
    const scanListener = ([error, device]) => {
      listener(error, device ? new Device(device, this) : null)
    }
    this._scanEventSubscription = this._eventEmitter.addListener(BleModule.ScanEvent, scanListener)
    BleModule.startDeviceScan(UUIDs, options)
  }

  /**
   * 
   * Stops device scan if in progress.
   * 
   * @memberOf BleManager
   */
  stopDeviceScan() {
    if (this._scanEventSubscription) {
      this._scanEventSubscription.remove()
      delete this._scanEventSubscription
    }
    BleModule.stopDeviceScan()
  }

  // Mark: Connection management -----------------------------------------------------------------------------------------

  /**
   * Connects to {@link Device} with provided ID.
   * 
   * @param {string} deviceIdentifier - {@link Device} identifier.
   * @param {?ConnectionOptions} options - Platform specific options for connection establishment. Not used currently.
   * @returns {Promise<Device>} Connected {@link Device} object if successful.
   * 
   * @memberOf BleManager
   */
  async connectToDevice(deviceIdentifier: string, options: ?ConnectionOptions): Promise<Device> {
    const deviceProps = await BleModule.connectToDevice(deviceIdentifier, options)
    return new Device(deviceProps, this)
  }

  /**
   * Disconnects from device if it's connected or cancels pending connection.
   * 
   * @param {string} deviceIdentifier - {@link Device} identifier to be closed. 
   * @returns {Promise<Device>} Returns closed {@link Device} when operation is successful.
   * 
   * @memberOf BleManager
   */
  async cancelDeviceConnection(deviceIdentifier: string): Promise<Device> {
    const deviceProps = await BleModule.cancelDeviceConnection(deviceIdentifier)
    return new Device(deviceProps, this)
  }

  /**
   * Monitors if device was disconnected due to any errors or connection problems.
   * 
   * @param {string} deviceIdentifier - {@link Device} identifier to be monitored.
   * @param {function(error: ?Error, device: Device)} listener - callback returning error as a reason of disconnection 
   * if available and {@link Device} object.
   * @returns {Subscription} Subscription on which `remove()` function can be called to unsubscribe.
   * 
   * @memberOf BleManager
   */
  onDeviceDisconnected(deviceIdentifier: string, listener: (error: ?Error, device: Device) => void): Subscription {
    const disconnectionListener = ([error, device]) => {
      if (deviceIdentifier !== device.id) return
      listener(error, device)
    }

    const subscription = this._eventEmitter.addListener(BleModule.DisconnectionEvent, disconnectionListener)
    return subscription
  }

  /**
   * Check connection state of a device.
   * 
   * @param {string} deviceIdentifier - {@link Device} identifier.
   * @returns {Promise<boolean>} - Promise which emits `true` if device is connected, and `false` otherwise.
   * 
   * @memberOf BleManager
   */
  async isDeviceConnected(deviceIdentifier: string): Promise<boolean> {
    return BleModule.isDeviceConnected(deviceIdentifier)
  }

  // Mark: Discovery -------------------------------------------------------------------------------------------------

  /**
   * Discovers all services and characteristics for {@link Device}.
   * 
   * @param {string} identifier - {@link Device} identifier.
   * @returns {Promise<Device>} - Promise which emits {@link Device} object if all available services and 
   * characteristics have been discovered.
   * 
   * @memberOf BleManager
   */
  async discoverAllServicesAndCharacteristicsForDevice(identifier: string): Promise<Device> {
    const deviceProps = await BleModule.discoverAllServicesAndCharacteristicsForDevice(identifier)
    return new Device(deviceProps, this)
  }

  // Mark: Service and characteristic getters ------------------------------------------------------------------------

  /**
   * List of discovered services for device.
   * 
   * @param {string} deviceIdentifier - {@link Device} identifier.
   * @returns {Promise<Service[]>} - Promise which emits array of {@link Service} objects which are discovered for a 
   * {@link Device}.
   * 
   * @memberOf BleManager
   */
  async servicesForDevice(deviceIdentifier: string): Promise<Service[]> {
    const services = await BleModule.servicesForDevice(deviceIdentifier)
    return services.map(serviceProps => {
      return new Service(serviceProps, this)
    })
  }

  /**
   * List of discovered characteristics for given {@link Device} and {@link Service}.
   * 
   * @param {string} deviceIdentifier - {@link Device} identifier.
   * @param {string} serviceUUID - {@link Service} UUID.
   * @returns {Promise<Characteristic[]>} - Promise which emits array of {@link Characteristic} objects which are 
   * discovered for a {@link Device} in specified {@link Service}.
   * 
   * @memberOf BleManager
   */
  async characteristicsForDevice(deviceIdentifier: string, serviceUUID: string): Promise<Characteristic[]> {
    const characteristics = await BleModule.characteristicsForDevice(deviceIdentifier, serviceUUID)
    return characteristics.map(characteristicProps => {
      return new Characteristic(characteristicProps, this)
    })
  }

  // Mark: Characteristics operations --------------------------------------------------------------------------------

  /**
   * Read characteristic value.
   * 
   * @param {string} deviceIdentifier - {@link Device} identifier.
   * @param {string} serviceUUID - {@link Service} UUID.
   * @param {string} characteristicUUID - {@link Characteristic} UUID.
   * @param {?string} transactionId - optional `transactionId` which can be used in {@link cancelTransaction} function.
   * @returns {Promise<Characteristic>} - Promise which emits first {@link Characteristic} object matching specified 
   * UUID paths. Latest value of {@link Characteristic} will be stored inside returned object.
   * 
   * @memberOf BleManager
   */
  async readCharacteristicForDevice(
    deviceIdentifier: string,
    serviceUUID: string,
    characteristicUUID: string,
    transactionId: ?string
  ): Promise<Characteristic> {
    if (!transactionId) {
      transactionId = this._nextUniqueID()
    }

    const characteristicProps = await BleModule.readCharacteristicForDevice(
      deviceIdentifier,
      serviceUUID,
      characteristicUUID,
      transactionId
    )
    return new Characteristic(characteristicProps, this)
  }

  /**
   * Write characteristic value with response.
   * 
   * @param {string} deviceIdentifier - {@link Device} identifier.
   * @param {string} serviceUUID - {@link Service} UUID.
   * @param {string} characteristicUUID - {@link Characteristic} UUID.
   * @param {string} base64Value - Value in Base64 format.
   * @param {?string} transactionId - optional `transactionId` which can be used in {@link cancelTransaction} function.
   * @returns {Promise<Characteristic>} - Promise which emits first {@link Characteristic} object matching specified 
   * UUID paths. Latest value of characteristic may not be stored inside returned object.
   * 
   * @memberOf BleManager
   */
  async writeCharacteristicWithResponseForDevice(
    deviceIdentifier: string,
    serviceUUID: string,
    characteristicUUID: string,
    base64Value: string,
    transactionId: ?string
  ): Promise<Characteristic> {
    if (!transactionId) {
      transactionId = this._nextUniqueID()
    }

    const characteristicProps = await BleModule.writeCharacteristicForDevice(
      deviceIdentifier,
      serviceUUID,
      characteristicUUID,
      base64Value,
      true,
      transactionId
    )
    return new Characteristic(characteristicProps, this)
  }

  /**
   * Write characteristic value without response.
   * 
   * @param {string} deviceIdentifier - {@link Device} identifier.
   * @param {string} serviceUUID - {@link Service} UUID.
   * @param {string} characteristicUUID - {@link Characteristic} UUID.
   * @param {string} base64Value - Value in Base64 format.
   * @param {?string} transactionId - optional `transactionId` which can be used in {@link cancelTransaction} function.
   * @returns {Promise<Characteristic>} - Promise which emits first {@link Characteristic} object matching specified 
   * UUID paths. Latest value of characteristic may not be stored inside returned object.
   * 
   * @memberOf BleManager
   */
  async writeCharacteristicWithoutResponseForDevice(
    deviceIdentifier: string,
    serviceUUID: string,
    characteristicUUID: string,
    base64Value: string,
    transactionId: ?string
  ): Promise<Characteristic> {
    if (!transactionId) {
      transactionId = this._nextUniqueID()
    }

    const characteristicProps = await BleModule.writeCharacteristicForDevice(
      deviceIdentifier,
      serviceUUID,
      characteristicUUID,
      base64Value,
      false,
      transactionId
    )
    return new Characteristic(characteristicProps, this)
  }

  /**
   * Monitor value changes of a characteristic. If notifications are enabled they will be used
   * in favour of indications.
   * 
   * @param {string} deviceIdentifier - {@link Device} identifier.
   * @param {string} serviceUUID - {@link Service} UUID.
   * @param {string} characteristicUUID - {@link Characteristic} UUID.
   * @param {function(error: ?Error, characteristic: ?Characteristic)} listener - callback which emits 
   * {@link Characteristic} objects with modified value for each notification.
   * @param {?string} transactionId - optional `transactionId` which can be used in {@link cancelTransaction} function.
   * @returns {Subscription} Subscription on which `remove()` function can be called to unsubscribe.
   * 
   * @memberOf BleManager
   */
  monitorCharacteristicForDevice(
    deviceIdentifier: string,
    serviceUUID: string,
    characteristicUUID: string,
    listener: (error: ?Error, characteristic: ?Characteristic) => void,
    transactionId: ?string
  ): Subscription {
    if (!transactionId) {
      transactionId = this._nextUniqueID()
    }

    const monitorListener = ([error, characteristic, msgTransactionId]) => {
      if (transactionId !== msgTransactionId) return
      if (error) {
        listener(error, null)
        return
      }
      listener(null, new Characteristic(characteristic, this))
    }

    const subscription = this._eventEmitter.addListener(BleModule.ReadEvent, monitorListener)
    BleModule.monitorCharacteristicForDevice(deviceIdentifier, serviceUUID, characteristicUUID, transactionId).then(
      finished => {
        subscription.remove()
      },
      error => {
        listener(error, null)
        subscription.remove()
      }
    )

    return {
      remove: () => {
        BleModule.cancelTransaction(transactionId)
      }
    }
  }
}
