export class Descriptor {
  readonly uuid: string
  readonly characteristicUuid: string
  readonly serviceUuid: string
  readonly deviceId: string
  readonly value: string | null

  constructor(uuid: string, characteristicUuid: string, serviceUuid: string, deviceId: string, value: string | null) {
    this.uuid = uuid
    this.characteristicUuid = characteristicUuid
    this.serviceUuid = serviceUuid
    this.deviceId = deviceId
    this.value = value
  }
}
