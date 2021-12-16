/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import { BleManager } from 'react-native-ble-plx';

export const BLEmanager = new BleManager();

AppRegistry.registerComponent('reactNativeBLESampleApp', () => App);
