'use strict';

import React, { Component } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableHighlight,
} from 'react-native';
import { bindActionCreators } from 'redux'
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
        <Text style={styles.title}>
          Devices
        </Text>
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

function mapStateToProps(state) {
  return {
    devices: state.ble.devices,
    scanning: state.ble.scanning !== undefined ? state.ble.scanning : false
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    startScan,
    stopScan,
    connectToDevice
  }, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps)(ScannedDevicesComponent)
