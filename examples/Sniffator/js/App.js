// @flow

import React, { Component } from 'react'
import { StyleSheet, Text, View, Button } from 'react-native'
import { connect } from 'react-redux'
import type { BleState } from './ble/BleState'
import {
  startScanning,
  stopScanning,
  connectToDevice,
  disconnectFromDevice,
  readCharacteristic,
  writeCharacteristic
} from './ble/BleManager'

type Props = {
  devices: string,
  errors: string,
  startScanning: typeof startScanning,
  stopScanning: typeof stopScanning,
  connectToDevice: typeof connectToDevice,
  disconnectFromDevice: typeof disconnectFromDevice,
  readCharacteristic: typeof readCharacteristic,
  writeCharacteristic: typeof writeCharacteristic
}

class App extends Component<Props> {
  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.instructions}>Devices:{this.props.devices}</Text>
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
            this.props.stopScanning()
          }}
        />
        <Button
          title="Connect to device: SensorTag"
          onPress={() => {
            this.props.connectToDevice('D5D9286C-8F73-7C04-6E17-913595327793')
          }}
        />
        <Button
          title="Disconnect from device: SensorTag"
          onPress={() => {
            this.props.disconnectFromDevice('D5D9286C-8F73-7C04-6E17-913595327793')
          }}
        />
        <Button
          title="SensorTag: enable temperature sensor"
          onPress={() => {
            this.props.writeCharacteristic(
              'D5D9286C-8F73-7C04-6E17-913595327793',
              'F000AA00-0451-4000-B000-000000000000',
              'F000AA02-0451-4000-B000-000000000000',
              'AQ=='
            )
          }}
        />
        <Button
          title="SensorTag: disable temperature sensor"
          onPress={() => {
            this.props.writeCharacteristic(
              'D5D9286C-8F73-7C04-6E17-913595327793',
              'F000AA00-0451-4000-B000-000000000000',
              'F000AA02-0451-4000-B000-000000000000',
              'AA=='
            )
          }}
        />
        <Button
          title="SensorTag: read temperature sensor data"
          onPress={() => {
            this.props.readCharacteristic(
              'D5D9286C-8F73-7C04-6E17-913595327793',
              'F000AA00-0451-4000-B000-000000000000',
              'F000AA01-0451-4000-B000-000000000000'
            )
          }}
        />
      </View>
    )
  }
}

export default connect(
  (state: BleState) => ({
    devices: Object.values(state.devices)
      // $FlowFixMe: It's OK!
      .map(device => device.name || '<no_device_name>')
      .join(','),
    errors: state.errors.join(',')
  }),
  {
    startScanning,
    stopScanning,
    connectToDevice,
    disconnectFromDevice,
    readCharacteristic,
    writeCharacteristic
  }
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
