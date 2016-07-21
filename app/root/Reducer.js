'use strict';

import { combineReducers } from 'redux-immutable'
import bleReducer from '../ble/BleReducer'

export default combineReducers({
  ble: bleReducer
})
