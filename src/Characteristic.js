// @flow
'use strict';

import BleManager from './BleManager'
import type { Subscription } from './BleManager'

interface NativeCharacteristic {
    uuid: string,
    serviceUUID: string,
    deviceUUID: string,
    isReadable: boolean,
    isWritableWithResponse: boolean,
    isWritableWithoutResponse: boolean,
    isNotifiable: boolean,
    isNotifying: boolean,
    isIndictable: boolean,
    value: ?string
}

export default class Characteristic {

    uuid: string
    deviceUUID: string
    serviceUUID: string
    isReadable: boolean
    isWritableWithResponse: boolean
    isWritableWithoutResponse: boolean
    isNotifiable: boolean
    isNotifying: boolean
    isIndictable: boolean
    value: ?string

    _manager: BleManager

    async read(transactionId: string): Promise<Characteristic> {
        return this._manager.readCharacteristicForDevice(this.deviceUUID, this.serviceUUID, this.uuid, transactionId)
    }

    async writeWithResponse(valueBase64: string, transactionId: ?string): Promise<Characteristic> {
        return this._manager.writeCharacteristicWithResponseForDevice(this.deviceUUID, this.serviceUUID, this.uuid, valueBase64, transactionId)
    }

    async writeWithoutResponse(valueBase64: string, transactionId: ?string): Promise<Characteristic> {
        return this._manager.writeCharacteristicWithoutResponseForDevice(this.deviceUUID, this.serviceUUID, this.uuid, valueBase64, transactionId)
    }

    monitor(listener: (error: ?Error, characteristic: ?Characteristic) => void, transactionId: ?string): Subscription {
        return this._manager.monitorCharacteristicForDevice(this.deviceUUID, this.serviceUUID, this.uuid, listener, transactionId)
    }

    constructor(props: NativeCharacteristic, manager: BleManager) {
        this._manager = manager

        this.uuid = props.uuid
        this.deviceUUID = props.deviceUUID
        this.serviceUUID = props.serviceUUID
        this.isReadable = props.isReadable
        this.isWritableWithResponse = props.isWritableWithResponse
        this.isWritableWithoutResponse = props.isWritableWithoutResponse
        this.isNotifiable = props.isNotifiable
        this.isNotifying = props.isNotifying
        this.isIndictable = props.isIndictable
        this.value = props.value
    }
}