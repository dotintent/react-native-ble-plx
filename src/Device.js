// @flow
'use strict';

import BleManager from './BleManager'
import Characteristic from './Characteristic'
import Service from './Service'
import type { Subscription, ConnectionOptions } from './BleManager'

class NativeDevice {
    id: string
    name: ?string
    rssi: ?number

    // Advertisement
    manufacturerData: ?string
    serviceUUIDs: ?string[]
    txPowerLevel: ?number
    solicitedServiceUUIDs: ?string[]
    isConnectable: ?boolean
    overflowServiceUUIDs: ?string[]
    serviceData: ?{[service: string]: string }
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
        return this._manager.connectToDevice(this.id, options)
    }

    async cancelConnection(): Promise<Device> {
        return this._manager.cancelDeviceConnection(this.id)
    }

    async isConnected(): Promise<boolean> {
        return this._manager.isDeviceConnected(this.id)
    }

    onDisconnected(listener: (error: ?Error, device: ?Device) => void): Subscription {
        return this._manager.onDeviceDisconnected(this.id, listener)
    }

    async discoverAllServicesAndCharacteristics(): Promise<Device> {
        return this._manager.discoverAllServicesAndCharacteristicsForDevice(this.id)
    }

    async services(): Promise<Service[]> {
        return this._manager.servicesForDevice(this.id)
    }

    async characteristicsForService(serviceUUID: string): Promise<Characteristic[]> {
        return this._manager.characteristicsForDevice(this.id, serviceUUID)
    }

    async readCharacteristicForService(
        serviceUUID: string,
        characteristicUUID: string,
        transactionId: ?string): Promise<Characteristic> {
        return this._manager.readCharacteristicForDevice(this.id, serviceUUID, characteristicUUID, transactionId)
    }

    async writeCharacteristicWithResponseForService(
        serviceUUID: string,
        characteristicUUID: string,
        valueBase64: string,
        transactionId: ?string): Promise<Characteristic> {
        return this._manager.writeCharacteristicWithResponseForDevice(this.id,
            serviceUUID,
            characteristicUUID,
            valueBase64,
            transactionId)
    }

    async writeCharacteristicWithoutResponseForService(
        serviceUUID: string,
        characteristicUUID: string,
        valueBase64: string,
        transactionId: ?string): Promise<Characteristic> {
        return this._manager.writeCharacteristicWithoutResponseForDevice(this.id,
            serviceUUID,
            characteristicUUID,
            valueBase64,
            transactionId)
    }

    monitorCharacteristicForService(
        serviceUUID: string,
        characteristicUUID: string,
        listener: (error: ?Error, characteristic: ?Characteristic) => void,
        transactionId: ?string): Subscription {
        return this._manager.monitorCharacteristicForDevice(this.id,
            serviceUUID,
            characteristicUUID,
            listener,
            transactionId)
    }
}
