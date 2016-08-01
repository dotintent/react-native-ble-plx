'use strict';

import * as ble from './BleActions'
import { Map, List, OrderedMap } from 'immutable'

const defaultState = Map({
  devices: OrderedMap(),
  selectedDeviceId: null,
  selectedServiceId: null,
  selectedCharacteristicId: null,
  scanning: false,
  errors: List(),
  state: ble.DEVICE_STATE_DISCONNECTED,
  operations: Map(), 
});

export default (state = defaultState, action) => {
  switch (action.type) {
    case ble.START_SCAN:
      return state.set('scanning', true);
    case ble.STOP_SCAN:
      return state.set('scanning', false);
    case ble.DEVICE_FOUND:
      return state.mergeDeepIn(['devices', action.device.uuid], action.device);
    case ble.CHANGE_DEVICE_STATE:
      return state.withMutations(state => {
        state.set('scanning', false)
             .set('state', action.state)
             .set('selectedDeviceId', action.deviceId)
      });
    case ble.UPDATE_SERVICES:
      return state.mergeDeepIn(['devices', action.deviceId, 'services'], action.services);
    case ble.UPDATE_CHARACTERISTIC:
      return state.mergeDeepIn(['devices', action.deviceId, 
                                'services', action.serviceId, 
                                'characteristics', action.characteristicId], action.characteristic)
    case ble.SELECT_SERVICE:
      return state.set('selectedServiceId', action.serviceId);
    case ble.SELECT_CHARACTERISTIC:
      return state.set('selectedCharacteristicId', action.characteristicId);
    case ble.WRITE_CHARACTERISTIC:
      return state.setIn(['operations', action.transactionId], {
        type: 'write',
        state: 'new',
        deviceId: action.deviceId,
        serviceId: action.serviceId,
        characteristicId: action.characteristicId,
        base64Value: action.base64Value,
        transactionId: action.transactionId
      })
    case ble.READ_CHARACTERISTIC:
      return state.setIn(['operations', action.transactionId], Map({
        type: 'read',
        state: 'new',
        deviceId: action.deviceId,
        serviceId: action.serviceId,
        characteristicId: action.characteristicId,
        transactionId: action.transactionId
      }));
    case ble.EXECUTE_TRANSACTION:
      return state.setIn(['operations', action.transactionId, 'state'], 'inProgress')
    case ble.COMPLETE_TRANSACTION:
      return state.removeIn(['operations', action.transactionId])
    case ble.PUSH_ERROR:
      return state.set('errors', state.get('errors').push(action.errorMessage))
    case ble.POP_ERROR:
      return state.set('errors', state.get('errors').pop())
    default:
      return state;
  }
}
