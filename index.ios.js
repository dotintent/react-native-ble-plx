import React, { Component } from 'react';
import { View, AppRegistry } from 'react-native';
import { createStore } from 'redux';
import { Provider } from 'react-redux';

import ScannedDevicesComponent from './app/scanning/ScannedDevicesComponent';
import BleComponent from './app/ble/BleComponent';
import reducer from './app/root/Reducer';

class EmptyProject extends Component {
  render() {
      return (
        <Provider store={createStore(reducer)}>
          <View style={{flex:1}}>
            <ScannedDevicesComponent/>
            <BleComponent/>
          </View>
        </Provider>
      );
  }
}

AppRegistry.registerComponent('EmptyProject', () => EmptyProject);
