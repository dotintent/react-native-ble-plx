import { combineReducers } from 'redux'
import { bleManagerSingleton } from '../ble/BleComponent'
import bleReducer from './BleReducer'

export default combineReducers({
  ble: bleReducer
})
