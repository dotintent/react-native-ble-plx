// @flow

import React, { Component } from 'react'
import { StyleSheet, Text, View, Button } from 'react-native'
import { connect } from 'react-redux'
import type { BleState, Devices, DeviceWithServices, ServiceWithCharacteristics } from './ble/BleState'
import { Characteristic } from 'react-native-ble-plx'
import {
  startScanning,
  stopScanning,
  connectToDevice,
  disconnectFromDevice,
  readCharacteristic,
  writeCharacteristic
} from './ble/BleManager'

type Props = {
  devices: Devices,
  errors: string,
  dispatch: Function,
  startScanning: typeof startScanning,
  stopScanning: typeof stopScanning,
  connectToDevice: typeof connectToDevice,
  disconnectFromDevice: typeof disconnectFromDevice,
  readCharacteristic: typeof readCharacteristic,
  writeCharacteristic: typeof writeCharacteristic
}

class App extends Component<Props> {
  getCharacteristic = (deviceId: string, serviceId: string, characteristicId: string): ?Characteristic => {
    const device: DeviceWithServices = this.props.devices[deviceId]
    if (device.services == null) {
      return null
    }
    for (var service: ServiceWithCharacteristics of device.services) {
      if (service.service.uuid.toUpperCase() === serviceId.toUpperCase()) {
        for (var characteristic: Characteristic of service.characteristics) {
          if (characteristic.uuid.toUpperCase() === characteristicId.toUpperCase()) {
            return characteristic
          }
        }
      }
    }
    return null
  }

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.instructions}>Errors:{this.props.errors}</Text>
        <Button
          title="Start scanning"
          onPress={() => {
            this.props.startScanning()
          }}
        />
        <Button
          title="Stop scanning"
          onPress={() => {
            this.props.dispatch(
              this.props.stopScanning()
            )
          }}
        />
        <Button
          title="Connect to device: SensorTag"
          onPress={() => {
            this.props.dispatch(
              this.props.connectToDevice('D5D9286C-8F73-7C04-6E17-913595327793')
            )
          }}
        />
        <Button
          title="Disconnect from device: SensorTag"
          onPress={() => {
            this.props.dispatch(
              this.props.disconnectFromDevice('D5D9286C-8F73-7C04-6E17-913595327793')
            )
          }}
        />
        <Button
          title="SensorTag: enable temperature sensor"
          onPress={() => {
            const characteristic = this.getCharacteristic(
              'D5D9286C-8F73-7C04-6E17-913595327793',
              'F000AA00-0451-4000-B000-000000000000',
              'F000AA02-0451-4000-B000-000000000000'
            )
            if (characteristic != null) {
              this.props.dispatch(
                this.props.writeCharacteristic(characteristic, 'AQ==')
              )
            }
          }}
        />
        <Button
          title="SensorTag: disable temperature sensor"
          onPress={() => {
            const characteristic = this.getCharacteristic(
              'D5D9286C-8F73-7C04-6E17-913595327793',
              'F000AA00-0451-4000-B000-000000000000',
              'F000AA02-0451-4000-B000-000000000000'
            )
            if (characteristic != null) {
              this.props.dispatch(
                this.props.writeCharacteristic(characteristic, 'AA==')
              )
            }
          }}
        />
        <Button
          title="SensorTag: read temperature sensor data"
          onPress={() => {
            const characteristic = this.getCharacteristic(
              'D5D9286C-8F73-7C04-6E17-913595327793',
              'F000AA00-0451-4000-B000-000000000000',
              'F000AA01-0451-4000-B000-000000000000'
            )
            if (characteristic != null) {
              this.props.dispatch(
                this.props.readCharacteristic(characteristic)
              )
            }
          }}
        />
      </View>
    )
  }
}

export default connect(
  (state: BleState) => ({
    devices: state.devices,
    errors: state.errors.join(',')
  }),
  dispatch => ({
    dispatch,
    startScanning,
    stopScanning,
    connectToDevice,
    disconnectFromDevice,
    readCharacteristic,
    writeCharacteristic
  })
)(App)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF'
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
    height: 70
  }
})
