'use strict';

import { combineReducers } from 'redux'
import bleReducer from '../ble/BleReducer'

export default combineReducers({
  ble: bleReducer
})
