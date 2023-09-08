import React from 'react'
import { Container } from './BleDevice.styled'
import { Device } from 'react-native-ble-plx'
import { DeviceProperty } from './DeviceProperty/DeviceProperty'
export type BleDeviceProps = {
  onPress: (device: Device) => void,
  device: Device
}

export const BleDevice = ({ device, onPress }: BleDeviceProps) => {
  const isConnectableInfoValueIsUnavailable = typeof device.isConnectable !== 'boolean'
  const isConnectableValue = device.isConnectable ? 'ture' : 'false'
  const parsedIsConnectable = isConnectableInfoValueIsUnavailable ? '-' : isConnectableValue

  return (
    <Container onPress={() => onPress(device)}>
      <DeviceProperty name="name" value={device.name} />
      <DeviceProperty name="localName" value={device.localName} />
      <DeviceProperty name="id" value={device.id} />
      <DeviceProperty name="manufacturerData" value={device.manufacturerData} />
      <DeviceProperty name="isConnectable" value={parsedIsConnectable} />
      <DeviceProperty name="mtu" value={device.mtu.toString()} />
      <DeviceProperty name="rssi" value={device.rssi} />
    </Container>
  )
}
