// @flow
'use strict';

import BleManager from './BleManager'
import type { Subscription } from './BleManager'

/**
 * Internal class describing Characteristic format which
 * is exchanged between native modules and react native.
 * 
 * @access private
 * @class NativeCharacteristic
 */
class NativeCharacteristic {
    uuid: string
    serviceUUID: string
    deviceID: string
    isReadable: boolean
    isWritableWithResponse: boolean
    isWritableWithoutResponse: boolean
    isNotifiable: boolean
    isNotifying: boolean
    isIndictable: boolean
    value: ?string
}

/**
 * Characteristic object.
 * 
 * @export
 * @class Characteristic
 */
export default class Characteristic extends NativeCharacteristic {

    _manager: BleManager

    /**
     * Private {@link Characteristic} constructor.
     * 
     * @param {NativeCharacteristic} props - NativeCharacteristic properties to be copied.
     * @param {BleManager} manager - Current BleManager instance.
     * @access private
     * 
     * @memberOf Characteristic
     */
    constructor(props: NativeCharacteristic, manager: BleManager) {
        super()
        this._manager = manager
        /** @type {string} 
         *  @desc {@link Characteristic} UUID. */
        this.uuid = props.uuid
        /** @type {string} 
         *  @desc {@link Service} UUID which owns this characteristic. */
        this.serviceUUID = props.serviceUUID
        /** @type {string}
         *  @desc {@link Device} identifier which owns this characteristic. */
        this.deviceID = props.deviceID
        /** @type {boolean} 
         *  @desc True if characteristic is readable. */
        this.isReadable = props.isReadable
        /** @type {boolean} 
         *  @desc True if characteristic is writable when writing with response. */
        this.isWritableWithResponse = props.isWritableWithResponse
        /** @type {boolean} 
         *  @desc True if characteristic is writable when writing without response. */
        this.isWritableWithoutResponse = props.isWritableWithoutResponse
        /** @type {boolean} 
        *   @desc True if characteristic is notifiable */
        this.isNotifiable = props.isNotifiable
        /** @type {boolean} 
        *   @desc Current status of notification for this characteristic. */
        this.isNotifying = props.isNotifying
        /** @type {boolean} 
        *   @desc True if characteristic is indictable */
        this.isIndictable = props.isIndictable
        /** @type {?string}
         *  @desc Current characteristic value in Base64 encoding, may be `null` when not read. */
        this.value = props.value
    }


    /**
     * {@link BleManager.readCharacteristicForDevice} with partially filled arguments.
     * 
     * @param {string} transactionId - optional `transactionId` which can be used in {@link cancelTransaction} function.
     * @returns {Promise<Characteristic>} Promise which emits this characteristic. Latest value will be stored inside 
     * returned object.
     * 
     * @memberOf Characteristic
     */
    async read(transactionId: string): Promise<Characteristic> {
        return this._manager.readCharacteristicForDevice(this.deviceID, this.serviceUUID, this.uuid, transactionId)
    }

    /**
     * {@link BleManager.writeCharacteristicWithResponseForDevice} with partially filled arguments.
     * 
     * @param {string} valueBase64 - Value in Base64 format.
     * @param {?string} transactionId - optional `transactionId` which can be used in {@link cancelTransaction} function.
     * @returns {Promise<Characteristic>} Promise which emits this characteristic. Latest value of characteristic may 
     * not be stored inside returned object.
     * 
     * @memberOf Characteristic
     */
    async writeWithResponse(valueBase64: string, transactionId: ?string): Promise<Characteristic> {
        return this._manager.writeCharacteristicWithResponseForDevice(this.deviceID, this.serviceUUID, this.uuid, valueBase64, transactionId)
    }

    /**
     * {@link BleManager.writeCharacteristicWithoutResponseForDevice} with partially filled arguments.
     * 
     * @param {string} valueBase64 - Value in Base64 format.
     * @param {?string} transactionId - optional `transactionId` which can be used in {@link cancelTransaction} function.
     * @returns {Promise<Characteristic>} Promise which emits this characteristic. Latest value of characteristic may 
     * not be stored inside returned object.
     * 
     * @memberOf Characteristic
     */
    async writeWithoutResponse(valueBase64: string, transactionId: ?string): Promise<Characteristic> {
        return this._manager.writeCharacteristicWithoutResponseForDevice(this.deviceID, this.serviceUUID, this.uuid, valueBase64, transactionId)
    }

    /**
     * {@link BleManager.monitorCharacteristicForDevice} with partially filled arguments.
     * 
     * @param {function(error: ?Error, characteristic: ?Characteristic)} listener - callback which emits 
     * this characteristic with modified value for each notification.
     * @param {?string} transactionId - optional `transactionId` which can be used in {@link cancelTransaction} function.
     * @returns {Subscription} Subscription on which `remove()` function can be called to unsubscribe.
     * 
     * @memberOf Characteristic
     */
    monitor(listener: (error: ?Error, characteristic: ?Characteristic) => void, transactionId: ?string): Subscription {
        return this._manager.monitorCharacteristicForDevice(this.deviceID, this.serviceUUID, this.uuid, listener, transactionId)
    }
}