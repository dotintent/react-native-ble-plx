'use strict';

import React, { Component } from 'react';
import { View, AppRegistry } from 'react-native';
import { applyMiddleware, createStore } from 'redux';
import { Provider } from 'react-redux';
import createLogger from 'redux-logger';
import freeze from 'redux-freeze';

import ScannedDevicesComponent from './app/scanning/ScannedDevicesComponent';
import BleComponent from './app/ble/BleComponent';
import reducer from './app/root/Reducer';

const logger = createLogger()
const store = createStore(reducer, applyMiddleware(freeze, logger))

class EmptyProject extends Component {
  render() {
      return (
        <Provider store={store}>
          <View style={{flex:1}}>
            <ScannedDevicesComponent/>
            <BleComponent/>
          </View>
        </Provider>
      );
  }
}

AppRegistry.registerComponent('EmptyProject', () => EmptyProject);
