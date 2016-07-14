import React, { Component } from 'react';
import {
  AppRegistry,
  Text,
  View
} from 'react-native';

import { createStore } from 'redux';
import { Provider } from 'react-redux';
import ScannedDeviceListView from './app/view/ScannedDeviceListView';
import BleComponent from './app/ble/BleComponent';
import mainReducer from './app/reducers';

class EmptyProject extends Component {
  render() {
      return (
        <Provider store={createStore(mainReducer)}>
          <View style={{padding: 20, flex: 1}}>
            <Text>
              Scanned Devices
            </Text>
            <ScannedDeviceListView
              scannedDevices={[
                {name: 'Mat', uuid: 'ff00-ddee', rssi: -12},
                {name: 'Phone', uuid: 'ff00-daee', rssi: -32},
                {name: 'Super device', uuid: 'd400-ddee', rssi: -45}]}
            />
            <BleComponent/>
          </View>
        </Provider>
      );
  }
}

AppRegistry.registerComponent('EmptyProject', () => EmptyProject);
