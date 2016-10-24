// @flow
'use strict';

import BleManager from './BleManager'
import Characteristic from './Characteristic'
import Service from './Service'
import type { Subscription, ConnectionOptions } from './BleManager'

class NativeDevice {
    uuid: string
    name: ?string
    rssi: ?number

    // Advertisement
    manufacturerData: ?string
    serviceData: ?{[service: string]: string}
    serviceUUIDs: ?string[]
    txPowerLevel: ?number
    solicitedServiceUUIDs: ?string[]
    isConnectable: ?boolean
    overflowServiceUUIDs: ?string[]
}

export default class Device extends NativeDevice {

    _manager: BleManager

    constructor(props: NativeDevice, manager: BleManager) {
        super()
        this._manager = manager
        // $FlowFixMe: this should be ok
        Object.assign(this, props)
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
