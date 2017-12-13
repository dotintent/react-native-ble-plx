import { AppRegistry } from 'react-native'
import App from './js/App'
import { createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import { bleReducer } from './js/ble/BleReducer'

export const store = createStore(bleReducer, applyMiddleware(thunk))

AppRegistry.registerComponent('Sniffator', () => App)
