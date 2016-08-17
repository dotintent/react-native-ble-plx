"use strict"

export default class Characteristic {
    constructor(props, manager) {
        this.uuid = props.uuid
        this.deviceUUID = props.deviceUUID
        this.serviceUUID = props.serviceUUID
        this.isReadable = props.isReadable
        this.isWritableWithResponse = props.isWritableWithResponse
        this.isWritableWithoutResponse = props.isWritableWithoutResponse
        this.isNotifiable = props.isNotifiable
        this.isIndictable = props.isIndictable
        this.value = props.value

        this.read = (transactionId) => {
            return manager.readCharacteristicForDevice(this.deviceUUID, this.serviceUUID, this.uuid, transactionId)
        }

        this.writeWithResponse = (valueBase64, transactionId) => {
            return manager.writeCharacteristicWithResponseForDevice(this.deviceUUID, this.serviceUUID, this.uuid, valueBase64, transactionId)
        }

        this.writeWithoutResponse = (valueBase64, transactionId) => {
            return manager.writeCharacteristicWithoutResponseForDevice(this.deviceUUID, this.serviceUUID, this.uuid, valueBase64, transactionId)
        }

        this.monitor = (listener, transactionId) => {
            return manager.monitorCharacteristicForDevice(this.deviceUUID, this.serviceUUID, this.uuid, listener, transactionId)
        } 
    }
}