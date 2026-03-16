export class Service {
  readonly uuid: string
  readonly deviceId: string

  constructor(uuid: string, deviceId: string) {
    this.uuid = uuid
    this.deviceId = deviceId
  }
}
