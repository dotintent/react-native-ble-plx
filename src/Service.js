"use strict"

export default class Service {
    constructor(props, manager) {
        this.uuid = props.uuid
        this.deviceUUID = props.deviceUUID
        this.isPrimary = props.isPrimary

        this.characteristics = () => {
            return manager.characteristicsForDevice(this.deviceUUID, this.uuid)
        }

        this.readCharacteristic = (characteristicUUID, transactionId) => {
            return manager.readCharacteristic(this.deviceUUID, this.uuid, characteristicUUID, transactionId)
        }

        this.writeCharacteristicWithResponse = (characteristicUUID, valueBase64, transactionId) => {
            return manager.writeCharacteristicWithResponseForDevice(this.deviceUUID, this.uuid, characteristicUUID, valueBase64, transactionId)
        }

        this.writeCharacteristicWithoutResponse = (characteristicUUID, valueBase64, transactionId) => {
            return manager.writeCharacteristicWithoutResponseForDevice(this.deviceUUID, this.uuid, characteristicUUID, valueBase64, transactionId)
        }

        this.monitorCharacteristic = (characteristicUUID, listener, transactionId) => {
            return manager.monitorCharacteristicForDevice(this.deviceUUID, this.uuid, characteristicUUID, listener, transactionId)
        }
    }
}