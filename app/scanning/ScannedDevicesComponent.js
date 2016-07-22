'use strict';

import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';
import { connect } from 'react-redux'

import ButtonView from '../view/ButtonView'
import ImmutableListView from '../view/ImmutableListView'
import ScannedDeviceView from './ScannedDeviceView'
import * as ble from '../ble/BleActions'

class ScannedDevicesComponent extends Component {

  _renderScannedDeviceCell(rowData) {
    const connectToDevice = () => {
      this.props.changeDeviceState(rowData.get('uuid'), ble.DEVICE_STATE_CONNECT)
    }
  
    return (
      <ScannedDeviceView
        name={rowData.get('name')}
        uuid={rowData.get('uuid')}
        rssi={rowData.get('rssi')}
        onClick={connectToDevice}
      />
    )
  }

  render() {
    return (
      <View style={{flex: 1, padding: 20}}>
        <ImmutableListView
          data={this.props.devices}
          onRenderCell={this._renderScannedDeviceCell.bind(this)}/>
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
    devices: state.getIn(['ble', 'devices']),
    scanning: state.getIn(['ble', 'scanning'])
  }),
  {
    startScan: ble.startScan,
    stopScan: ble.stopScan,
    changeDeviceState: ble.changeDeviceState
  })
(ScannedDevicesComponent)
