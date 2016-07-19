'use strict';

import React, { Component } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableHighlight,
} from 'react-native';
import { connect } from 'react-redux'

import ButtonView from '../view/ButtonView'
import ScannedDeviceListView from './ScannedDeviceListView'
import {
  startScan,
  stopScan,
  connectToDevice
} from '../ble/BleActions'

class ScannedDevicesComponent extends Component {
  render() {
    return (
      <View style={{flex: 1, padding: 20}}>
        <ScannedDeviceListView
          scannedDevices={this.props.devices}
          onScannedDeviceClicked={this.props.connectToDevice}/>
        <View style={styles.buttonRow}>
          <ButtonView
            onClick={this.props.startScan}
            disabled={this.props.scanning}
            text={'Start scanning'}
            color={'#beffc6'}/>
          <ButtonView
            onClick={this.props.stopScan}
            disabled={!this.props.scanning}
            text={'Stop scanning'}
            color={'#ffcbdc'}/>
        </View>
      </View>
    )
  }
}

var styles = StyleSheet.create({
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 10
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default connect(
  state => ({
    devices: state.ble.devices,
    scanning: state.ble.scanning !== undefined ? state.ble.scanning : false
  }),
  {
    startScan,
    stopScan,
    connectToDevice
  })
(ScannedDevicesComponent)
