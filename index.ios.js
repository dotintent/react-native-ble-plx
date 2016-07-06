/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  Image,
  ListView,
  NativeModules,
  DeviceEventEmitter,
  NativeAppEventEmitter,
  Subscribable,
  TouchableNativeFeedback
} from 'react-native';

const BleModule = NativeModules.BleClientManager;

class EmptyProject extends Component {

  constructor(props) {
    super(props);
  }

  componentWillMount() {
      DeviceEventEmitter.addListener('TEST_EVENT', (e) => {
        console.log(e);
        // this.asyncConnect(e.identifier)
      });
  }

  componentDidMount() {
      console.log("Create BLE client");
      BleModule.createClient();
      BleModule.scanBleDevices((e)=> {
        console.log(e);
      });
      setTimeout(
          () => {
            console.log("Scan stop");
            BleModule.stopScanBleDevices(); },
          20000
      );
  }


  async asyncConnect(identifier) {
    var isConnected = await BleModule.establishConnection(identifier);
    if(isConnected) {
      console.log("Connected");
    } else {
      console.log("NOT Connected");
    }
  }


  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
          Welcome to React Native!
        </Text>
        <Text style={styles.instructions}>
          To get started, edit index.ios.js
        </Text>
        <Text style={styles.instructions}>
          Press Cmd+R to reload,{'\n'}
          Cmd+D or shake for dev menu
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

AppRegistry.registerComponent('EmptyProject', () => EmptyProject);
