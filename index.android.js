/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';
import React, {
    Component,
} from 'react';
import {
    AppRegistry,
    Image,
    ListView,
    StyleSheet,
    Text,
    View,
    NativeModules,
    DeviceEventEmitter,
    Subscribable,
    TouchableNativeFeedback
} from 'react-native';
const ToastModule = NativeModules.TestBLEModule;
const RxBleClient = NativeModules.RxBleClient;
const BleModule = NativeModules.BleModule;

var array = [];

var arrayCount = 0;
var REQUEST_URL = 'https://raw.githubusercontent.com/facebook/react-native/master/docs/MoviesExample.json';
class ReactNativeTest extends Component {
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
            array[arrayCount] = e.BLE_DEVICE.MAC_ADDRESS;
            arrayCount = arrayCount + 1;
            this.setState({
                dataSource: this.state.dataSource.cloneWithRows(array),
                loaded: true,
            });
        });

        DeviceEventEmitter.addListener('ON_NOTIFICATION_GET', (e) => {
            ToastModule.show(JSON.stringify(e), ToastModule.SHORT);
        });
    }


    componentDidMount() {
        // ToastModule.pingEvent("costam");
        // RxBleClient.createContext((b) => {
        //     RxBleClient.scanBleDevices();
        // });

        BleModule.createClient();
        BleModule.scanBleDevices((e)=> {ToastModule.show(e, ToastModule.SHORT)});
        setTimeout(
            () => {
              ToastModule.show("Scan stop", ToastModule.SHORT);
              BleModule.stopScanBleDevices(); },
            20000
        );
        // this.ping();
        // this.fetchData();
    }

    fetchData() {
        fetch(REQUEST_URL)
            .then((response) => response.json())
            .then((responseData) => {
                this.setState({
                    dataSource: this.state.dataSource.cloneWithRows(responseData.movies),
                    loaded: true,
                });
            })
            // .then(() => ToastModule.ping("Myk", (msg) => ToastModule.show(msg, ToastModule.SHORT)))
            .done();
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
          <TouchableNativeFeedback
          onPress = {
              () => this._onPressButton(text)
          }
          background = {
              TouchableNativeFeedback.SelectableBackground()
          }>
            <View><Text>{text}</Text></View>
          </TouchableNativeFeedback>
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

/*
{
    SERVICES  :[ {
      UUID : "00a-sa-das-dasd-a"
      CHARACTERISTICS : [{
        UUID : "00a-sa-das-dasd-a"
    }
    ]
  }]
}
*/
    async asyncConnect(text) {
        try {

          var isConnected = await BleModule.establishConnection("34:B1:F7:D5:04:01", true);
          var saved = await BleModule.writeCharacteristic("34:B1:F7:D5:04:01", "xxx", "F000AA12-0451-4000-B000-000000000000", "MQ==");
          BleModule.setupNotification("34:B1:F7:D5:04:01", "xxx", "F000AA11-0451-4000-B000-000000000000", (e)=> {ToastModule.show(e.DATA, ToastModule.SHORT)});
            //var response1 = await  RxBleClient.establishConnection(text, false);
          //  var response2 = await  RxBleClient.discoverServices(text);
            //First option
            //var response3 = await  RxBleClient.getFirstCharacteristic(text, response2.SERVICES[0].CHARACTERISTICS[1].UUID);
            //Socond option
        //    var response3 = await  RxBleClient.getCharacteristic(text, response2.SERVICES[0].UUID, response2.SERVICES[0].CHARACTERISTICS[0].UUID);
            //var response = await  RxBleClient.readCharacteristic(text, response3);
            //Third option
            // var response = await  RxBleClient.readCharacteristic(text, response2.SERVICES[0].CHARACTERISTICS[0].UUID);
            //RxBleClient.setupNotification(text, response2.SERVICES[0].CHARACTERISTICS[0].UUID)
          //  RxBleClient.xxXX();

          //  ToastModule.show(JSON.stringify(response), ToastModule.SHORT);

          //New solution


        } catch (e) {
            ToastModule.show(e.code, ToastModule.SHORT);
        }
    }

    async delay(){

    }
    renderMovie(movie) {
        return ( < View style = {
                    styles.container
                } >
                < Image source = {
                    {
                        uri: movie.posters.thumbnail
                    }
                }
                style = {
                    styles.thumbnail
                }
                /> < View style = {
                styles.rightContainer
            } >
            < Text style = {
                styles.title
            } > {
                movie.title
            } < /Text> < Text style = {
        styles.year
    } > {
        movie.year
    } < /Text> < /View > < /View>
);
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

AppRegistry.registerComponent('EmptyProject', () => ReactNativeTest);
