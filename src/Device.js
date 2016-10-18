// @flow
'use strict';

import BleManager from './BleManager'
import Characteristic from './Characteristic'
import Service from './Service'
import type { Subscription, ConnectionOptions } from './BleManager'

interface NativeDevice {
    uuid: string,
    name: ?string,
    rssi: ?number,
    isConnectable: ?boolean
}

export default class Device {

    uuid: string
    name: ?string
    rssi: ?number
    isConnectable: ?boolean

    _manager: BleManager

    constructor(props: NativeDevice, manager: BleManager) {
        this._manager = manager
        this.uuid = props.uuid
        this.name = props.name
        this.rssi = props.rssi
        this.isConnectable = props.isConnectable
    }

    async connect(options: ?ConnectionOptions): Promise<Device> {
        return this._manager.connectToDevice(this.uuid, options)
    }

    async cancelConnection(): Promise<Device> {
        return this._manager.cancelDeviceConnection(this.uuid)
    }

    async isConnected(): Promise<boolean> {
        return this._manager.isDeviceConnected(this.uuid)
    }

    onDisconnected(listener: (error: ?Error, device: ?Device) => void): Subscription {
        return this._manager.onDeviceDisconnected(this.uuid, listener)
    }

    async discoverAllServicesAndCharacteristics(): Promise<Device> {
        return this._manager.discoverAllServicesAndCharacteristicsForDevice(this.uuid)
    }

    async services(): Promise<Service[]> {
        return this._manager.servicesForDevice(this.uuid)
    }

    async characteristicsForService(serviceUUID: string): Promise<Characteristic[]> {
        return this._manager.characteristicsForDevice(this.uuid, serviceUUID)
    }

    async readCharacteristicForService(serviceUUID: string, 
                                       characteristicUUID: string,
                                       transactionId: ?string): Promise<Characteristic> {
        return this._manager.readCharacteristicForDevice(this.uuid, serviceUUID, characteristicUUID, transactionId)
    }

    async writeCharacteristicWithResponseForService(serviceUUID: string, 
                                                    characteristicUUID: string, 
                                                    valueBase64: string, 
                                                    transactionId: ?string): Promise<Characteristic> {
        return this._manager.writeCharacteristicWithResponseForDevice(this.uuid, 
                                                                serviceUUID, 
                                                                characteristicUUID, 
                                                                valueBase64, 
                                                                transactionId)
    }

    async writeCharacteristicWithoutResponseForService(serviceUUID: string, 
                                                       characteristicUUID: string, 
                                                       valueBase64: string, 
                                                       transactionId: ?string): Promise<Characteristic> {
        return this._manager.writeCharacteristicWithoutResponseForDevice(this.uuid, 
                                                                   serviceUUID, 
                                                                   characteristicUUID, 
                                                                   valueBase64, 
                                                                   transactionId)
    }

    monitorCharacteristicForService(serviceUUID: string, 
                                    characteristicUUID: string, 
                                    listener: (error: ?Error, characteristic: ?Characteristic) => void, 
                                    transactionId: ?string): Subscription {
        return this._manager.monitorCharacteristicForDevice(this.uuid, 
                                                      serviceUUID, 
                                                      characteristicUUID, 
                                                      listener, 
                                                      transactionId)
    }
}
