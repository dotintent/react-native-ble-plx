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
  TouchableHighlight
} from 'react-native';

const BleModule = NativeModules.BleClientManager;

var array = [];
var arrayCount = 0;

class EmptyProject extends Component {

  constructor(props) {
    super(props);
    this.renderTest = this.renderTest.bind(this);
    this._onPressButton = this._onPressButton.bind(this);
    this.state = {
        dataSource: new ListView.DataSource({
            rowHasChanged: (row1, row2) => row1 !== row2,
        }),
        loaded: false,
    };
  }

  componentWillMount() {
      DeviceEventEmitter.addListener('SCAN_RESULT', (scanResult) => {
        console.log(scanResult);
        array[arrayCount] = scanResult;
        arrayCount = arrayCount + 1;
        this.setState({
            dataSource: this.state.dataSource.cloneWithRows(array),
            loaded: true,
        });
      });
      DeviceEventEmitter.addListener('ON_NOTIFICATION_GET', (e) => {
          console.log(JSON.stringify(e));
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

  componentDidMount

  async asyncConnect(deviceIdentifier) {
    try {
      var isConnected = await BleModule.establishConnection(deviceIdentifier);
      if(isConnected) {
        console.log("Connected!");

        // Discover services
        // this.asyncDiscoverServices(deviceIdentifier);
        // var isSynchronized = await BleModule.discoverServices(deviceIdentifier);
        // if(isSynchronized) {
        //   console.log("Synchronized!");
        // } else {
        //   console.log("NOT Synchronized!");
        // }

      } else {
        console.log("NOT Connected!");
      }
    } catch(e) {
      console.log(e);
    }
  }

  // async asyncDiscoverServices(deviceIdentifier) {
  //   try {
  //     var isSynchronized = await BleModule.discoverServices(deviceIdentifier);
  //     if(isSynchronized) {
  //       console.log("Synchronized!");
  //     } else {
  //       console.log("NOT Synchronized!");
  //     }
  //   } catch(e) {
  //     console.error(e);
  //   }
  // }


  render() {
      return ( < ListView dataSource = {
              this.state.dataSource
          }
          renderRow = {this.renderTest}
          style = {
              styles.listView
          }
          />
      );
  }
  renderTest(scanResult) {
      return (
        <TouchableHighlight onPress = {
            () => this._onPressButton(scanResult)
        }>
          <View><Text>{scanResult.identifier} {scanResult.name}</Text></View>
        </TouchableHighlight>
    )
  }
  _onPressButton(scanResult) {
      console.log('Connecting... ' + scanResult.identifier);
      // this.asyncConnect(text);


      this.asyncConnect(scanResult.identifier)
  }

}

var styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5FCFF',
    },
    rightContainer: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        marginBottom: 8,
        textAlign: 'center',
    },
    year: {
        textAlign: 'center',
    },
    thumbnail: {
        width: 53,
        height: 81,
    },
    listView: {
        paddingTop: 20,
        backgroundColor: '#F5FCFF',
    },
});

AppRegistry.registerComponent('EmptyProject', () => EmptyProject);
