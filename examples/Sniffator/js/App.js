// @flow

import React, { Component } from 'react'
import { StyleSheet, Text, View, Button } from 'react-native'
import { connect } from 'react-redux'
import type { BleState } from './ble/BleState'
import { startScanning, stopScanning, connectToDevice } from './ble/BleManager'

type Props = {
  devices: string,
  errors: string,
  startScanning: typeof startScanning,
  stopScanning: typeof stopScanning,
  connectToDevice: typeof connectToDevice
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
    connectToDevice
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
    marginBottom: 5
  }
})
