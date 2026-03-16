import type { BleManager, DeviceInfo, Subscription } from './BleManager'
import type { ConnectOptions, ConnectionPriority } from './types'

export class Device {
  readonly id: string
  readonly name: string | null
  readonly rssi: number
  readonly mtu: number
  readonly isConnectable: boolean | null
  readonly serviceUuids: readonly string[]
  readonly manufacturerData: string | null

  private manager: BleManager

  constructor(info: DeviceInfo, manager: BleManager) {
    this.id = info.id
    this.name = info.name
    this.rssi = info.rssi
    this.mtu = info.mtu
    this.isConnectable = info.isConnectable
    this.serviceUuids = info.serviceUuids
    this.manufacturerData = info.manufacturerData
    this.manager = manager
  }

  async connect(options?: ConnectOptions | null): Promise<Device> {
    const info = await this.manager.connectToDevice(this.id, options)
    return new Device(info, this.manager)
  }

  async cancelConnection(): Promise<Device> {
    const info = await this.manager.cancelDeviceConnection(this.id)
    return new Device(info, this.manager)
  }

  async isConnected(): Promise<boolean> {
    return this.manager.isDeviceConnected(this.id)
  }

  async discoverAllServicesAndCharacteristics(): Promise<Device> {
    const info = await this.manager.discoverAllServicesAndCharacteristics(this.id)
    return new Device(info, this.manager)
  }

  async requestMTU(mtu: number): Promise<Device> {
    const info = await this.manager.requestMTUForDevice(this.id, mtu)
    return new Device(info, this.manager)
  }

  async requestConnectionPriority(priority: ConnectionPriority): Promise<Device> {
    const info = await this.manager.requestConnectionPriority(this.id, priority)
    return new Device(info, this.manager)
  }

  onDisconnected(callback: Parameters<BleManager['onDeviceDisconnected']>[1]): Subscription {
    return this.manager.onDeviceDisconnected(this.id, callback)
  }
}
