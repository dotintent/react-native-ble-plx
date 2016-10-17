// @Flow
"use strict"

import BleManager from './BleManager'
import Characteristic from './Characteristic'
import type { Subscription } from './BleManager'

interface NativeService {
    uuid: string,
    deviceUUID: string,
    isPrimary: boolean
}

export default class Service {
    
    uuid: string
    deviceUUID: string
    isPrimary: boolean

    _manager: BleManager

    constructor(props: NativeService, manager: BleManager) {
        this._manager = manager
        this.uuid = props.uuid
        this.deviceUUID = props.deviceUUID
        this.isPrimary = props.isPrimary
    }

    async characteristics(): Promise<Characteristic[]> {
        return manager.characteristicsForDevice(this.deviceUUID, this.uuid)
    }

    async readCharacteristic(characteristicUUID: string, transactionId: ?string): Promise<Characteristic> {
        return manager.readCharacteristic(this.deviceUUID, this.uuid, characteristicUUID, transactionId)
    }

    async writeCharacteristicWithResponse(characteristicUUID: string, 
                                          valueBase64: string, 
                                          transactionId: ?string): Promise<Characteristic> {
        return manager.writeCharacteristicWithResponseForDevice(this.deviceUUID, 
                                                                this.uuid, 
                                                                characteristicUUID,
                                                                valueBase64, 
                                                                transactionId)
    }

    async writeCharacteristicWithoutResponse(characteristicUUID: string,
                                             valueBase64: string, 
                                             transactionId: ?string): Promise<Characteristic> {
        return manager.writeCharacteristicWithoutResponseForDevice(this.deviceUUID,
                                                                   this.uuid,
                                                                   characteristicUUID,
                                                                   valueBase64,
                                                                   transactionId)
    }

    monitorCharacteristic(characteristicUUID: string,
                          listener: (error: ?Error, characteristic: ?Characteristic) => void,
                          transactionId: ?string): Subscription {
        return manager.monitorCharacteristicForDevice(this.deviceUUID, 
                                                      this.uuid, 
                                                      characteristicUUID, 
                                                      listener, 
                                                      transactionId)
    }
}