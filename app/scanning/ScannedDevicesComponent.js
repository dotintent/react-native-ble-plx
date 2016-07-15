import React, { Component } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableHighlight,
} from 'react-native';
import { connect } from 'react-redux'

import ScannedDeviceListView from './ScannedDeviceListView'
import { bleStartScanAction, bleStopScanAction } from '../ble/BleActions'

class ScannedDevicesComponent extends Component {
  render() {
    return (
      <View style={{flex: 1, padding: 20}}>
        <Text style={styles.title}>
          Devices
        </Text>
        <ScannedDeviceListView
          scannedDevices={this.props.devices}/>
        <View style={styles.buttonRow}>
          <TouchableHighlight
            onPress={!this.props.scanning ? this.props.startScan : null}>
            <Text style={[styles.button, styles.buttonGreen]}>
              Start scanning
            </Text>
          </TouchableHighlight>
          <TouchableHighlight
            onPress={this.props.scanning ? this.props.stopScan : null}>
            <Text style={styles.button}>
              Stop scanning
            </Text>
          </TouchableHighlight>
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
  button: {
    fontWeight: 'bold',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#ffb2ac',
    padding: 10
  },
  buttonGreen: {
    backgroundColor: '#9effe5',
  }
});

function mapStateToProps(state) {
  return {
    devices: state.ble.devices,
    scanning: state.ble.scanning
  }
}

function mapDispatchToProps(dispatch) {
  return {
    startScan: () => {dispatch(bleStartScanAction.create())},
    stopScan: () => {dispatch(bleStopScanAction.create())}
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ScannedDevicesComponent)
