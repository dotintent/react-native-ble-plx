'use strict';

import React, { Component } from 'react';
import { View, AppRegistry } from 'react-native';
import { applyMiddleware, createStore } from 'redux';
import { Provider } from 'react-redux';
import createLogger from 'redux-logger';

import RootComponent from './app/root/RootComponent';
import ErrorComponent from './app/root/ErrorComponent';
import BleComponent from './app/ble/BleComponent';
import reducer from './app/root/Reducer';

import { Iterable } from 'immutable';

import { checkPermission } from 'react-native-android-permissions';
import { requestPermission } from 'react-native-android-permissions';

const stateTransformer = (state) => {
  if (Iterable.isIterable(state)) {
    return state.toJS()
  } else {
    return state;
  }
};

const logger = createLogger({ stateTransformer });
const store = createStore(reducer)

class ReactBLEScanner extends Component {

  componentDidMount() {
    this.checkAndGrantPermissions()
  }

  checkAndGrantPermissions() {
    checkPermission("android.permission.ACCESS_COARSE_LOCATION").then((result) => {
      console.log("Already Granted!");
      console.log(result);
    }, (result) => {
      console.log("Not Granted!");
      console.log(result);
      requestPermission("android.permission.ACCESS_COARSE_LOCATION").then((result) => {
        console.log("Granted!", result);
      }, (result) => {
        console.log("Not Granted!");
        console.log(result);
      });
    });
  }

  render() {
    return (
      <Provider store={store}>
        <View style={{flex:1}}>
          <ErrorComponent/>
          <RootComponent/>
          <BleComponent/>
        </View>
      </Provider>
    );
  }
}

AppRegistry.registerComponent('ReactBLEScanner', () => ReactBLEScanner);
