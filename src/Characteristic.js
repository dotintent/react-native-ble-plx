// @flow
'use strict';

import BleManager from './BleManager'
import type { Subscription } from './BleManager'

class NativeCharacteristic {
    uuid: string
    serviceUUID: string
    deviceUUID: string
    isReadable: boolean
    isWritableWithResponse: boolean
    isWritableWithoutResponse: boolean
    isNotifiable: boolean
    isNotifying: boolean
    isIndictable: boolean
    value: ?string
}

export default class Characteristic extends NativeCharacteristic {

    _manager: BleManager

    constructor(props: NativeCharacteristic, manager: BleManager) {
        super()
        this._manager = manager
        // $FlowFixMe: this should be ok
        Object.assign(this, props)
    }

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
}