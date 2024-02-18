import { AppRegistry } from 'react-native'
import { TestApp } from './entry'
import { name as appName } from './app.json'

AppRegistry.registerComponent(appName, () => TestApp)
