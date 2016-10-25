// @Flow
"use strict"

import BleManager from './BleManager'
import Characteristic from './Characteristic'
import type { Subscription } from './BleManager'

class NativeService {
    uuid: string
    deviceUUID: string
    isPrimary: boolean
}

export default class Service extends NativeService {

    _manager: BleManager

    constructor(props: NativeService, manager: BleManager) {
        super()
        this._manager = manager
        // $FlowFixMe: this should be ok
        Object.assign(this, props)
    }

    async characteristics(): Promise<Characteristic[]> {
        return this._manager.characteristicsForDevice(this.deviceUUID, this.uuid)
    }

    async readCharacteristic(characteristicUUID: string, transactionId: ?string): Promise<Characteristic> {
        return this._manager.readCharacteristic(this.deviceUUID, this.uuid, characteristicUUID, transactionId)
    }

    async writeCharacteristicWithResponse(characteristicUUID: string, 
                                          valueBase64: string, 
                                          transactionId: ?string): Promise<Characteristic> {
        return this._manager.writeCharacteristicWithResponseForDevice(this.deviceUUID, 
                                                                      this.uuid, 
                                                                      characteristicUUID,
                                                                      valueBase64, 
                                                                      transactionId)
    }

    async writeCharacteristicWithoutResponse(characteristicUUID: string,
                                             valueBase64: string, 
                                             transactionId: ?string): Promise<Characteristic> {
        return this._manager.writeCharacteristicWithoutResponseForDevice(this.deviceUUID,
                                                                         this.uuid,
                                                                         characteristicUUID,
                                                                         valueBase64,
                                                                         transactionId)
    }

    monitorCharacteristic(characteristicUUID: string,
                          listener: (error: ?Error, characteristic: ?Characteristic) => void,
                          transactionId: ?string): Subscription {
        return this._manager.monitorCharacteristicForDevice(this.deviceUUID, 
                                                            this.uuid, 
                                                            characteristicUUID, 
                                                            listener, 
                                                            transactionId)
    }
}