'use strict';

import { combineReducers } from 'redux-immutable'
import bleReducer from '../ble/BleReducer'
import sceneReducer from '../scene/SceneReducer'

export default combineReducers({
  ble:   bleReducer,
  route: sceneReducer
})
