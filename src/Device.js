'use strict';

export default class Device {
    constructor(props, manager) {
        this.uuid = props.uuid
        this.name = props.name
        this.rssi = props.rssi
        this.connectable = props.connectable

        this.connect = (options) => {
            return manager.connectToDevice(this.uuid, options)
        }

        this.cancelConnection = () => {
            return manager.cancelDeviceConnection(this.uuid, options)
        }

        this.isConnected = () => {
            return manager.isDeviceConnected(this.uuid)
        }

        this.onDisconnected = (listener) => {
            return manager.onDeviceDisconnected(this.uuid, listener)
        }

        this.discoverAllServicesAndCharacteristics = () => {
            return manager.discoverAllServicesAndCharacteristicsForDevice(this.uuid)
        }

        this.services = () => {
            return manager.servicesForDevice(this.uuid)
        }

        this.characteristicsForService = (serviceUUID) => {
            return manager.characteristicsForDevice(this.uuid, serviceUUID)
        }

        this.readCharacteristicForService = (serviceUUID, characteristicUUID, transactionId) => {
            return manager.readCharacteristicForDevice(this.uuid, serviceUUID, characteristicUUID, transactionId)
        }

        this.writeCharacteristicWithResponseForService = (serviceUUID, characteristicUUID, valueBase64, transactionId) => {
            return manager.writeCharacteristicWithResponseForDevice(this.uuid, serviceUUID, characteristicUUID, valueBase64, transactionId)
        }

        this.writeCharacteristicWithoutResponseForService = (serviceUUID, characteristicUUID, valueBase64, transactionId) => {
            return manager.writeCharacteristicWithoutResponseForDevice(this.uuid, serviceUUID, characteristicUUID, valueBase64, transactionId)
        }

        this.monitorCharacteristicForService = (serviceUUID, characteristicUUID, listener, transactionId) => {
            return manager.monitorCharacteristicForDevice(this.uuid, serviceUUID, characteristicUUID, listener, transactionId)
        }
    }
}