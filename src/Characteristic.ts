import type {
  BleManager,
  CharacteristicInfo,
  Subscription,
  MonitorOptions,
  CharacteristicValueEvent
} from './BleManager'
import type { BleError } from './BleError'

export class Characteristic {
  readonly deviceId: string
  readonly serviceUuid: string
  readonly uuid: string
  readonly value: string | null
  readonly isNotifying: boolean
  readonly isIndicatable: boolean
  readonly isReadable: boolean
  readonly isWritableWithResponse: boolean
  readonly isWritableWithoutResponse: boolean

  private manager: BleManager

  constructor(info: CharacteristicInfo, manager: BleManager) {
    this.deviceId = info.deviceId
    this.serviceUuid = info.serviceUuid
    this.uuid = info.uuid
    this.value = info.value
    this.isNotifying = info.isNotifying
    this.isIndicatable = info.isIndicatable
    this.isReadable = info.isReadable
    this.isWritableWithResponse = info.isWritableWithResponse
    this.isWritableWithoutResponse = info.isWritableWithoutResponse
    this.manager = manager
  }

  async read(): Promise<Characteristic> {
    const info = await this.manager.readCharacteristicForDevice(this.deviceId, this.serviceUuid, this.uuid)
    return new Characteristic(info, this.manager)
  }

  async writeWithResponse(value: string): Promise<Characteristic> {
    const info = await this.manager.writeCharacteristicForDevice(
      this.deviceId,
      this.serviceUuid,
      this.uuid,
      value,
      true
    )
    return new Characteristic(info, this.manager)
  }

  async writeWithoutResponse(value: string): Promise<Characteristic> {
    const info = await this.manager.writeCharacteristicForDevice(
      this.deviceId,
      this.serviceUuid,
      this.uuid,
      value,
      false
    )
    return new Characteristic(info, this.manager)
  }

  monitor(
    listener: (error: BleError | null, characteristic: CharacteristicValueEvent | null) => void,
    options?: MonitorOptions
  ): Subscription {
    return this.manager.monitorCharacteristicForDevice(this.deviceId, this.serviceUuid, this.uuid, listener, options)
  }
}
