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
  Subscribable
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
      DeviceEventEmitter.addListener('SCAN_RESULT', (e) => {
        console.log(e);
        array[arrayCount] = e.identifier
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

  async asyncConnect(identifier) {
    try {
      var isConnected = await BleModule.establishConnection(identifier);
      if(isConnected) {
        console.log("Connected");

        // Discover services


      } else {
        console.log("NOT Connected");
      }
    } catch(e) {
      console.error(e);
    }

  }


  render() {
      // if (!this.state.loaded) {
      //     return this.renderLoadingView();
      // }

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
  renderTest(text) {
      return (
          <View><Text>{text}</Text></View>
    )
  }
  renderLoadingView() {
      return ( < View style = {
              styles.container
          } >
          < Text >
          Loading movies... < /Text> < /View >
      );
  }
  _onPressButton(text){
      ToastModule.justLogE(text);
      this.asyncConnect(text);
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
