/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import { BleManager } from 'react-native-ble-plx';

export const BLEmanager = new BleManager();

AppRegistry.registerComponent(appName, () => App);
