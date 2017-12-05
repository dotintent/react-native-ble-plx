'use strict';

import * as ble from './BleActions'
import { Map, List, OrderedMap } from 'immutable'

const defaultState = Map({
  devices: OrderedMap(),
  selecteddeviceIdentifier: null,
  selectedserviceUUID: null,
  selectedcharacteristicUUID: null,
  enabling: false,
  scanning: false,
  errors: List(),
  state: ble.DEVICE_STATE_DISCONNECTED,
  operations: Map(),
  transactionId: 0,
});

export default (state = defaultState, action) => {
  const transactionId = state.get('transactionId')

  switch (action.type) {
    case ble.ENABLE_BLUETOOTH:
      return state.set('enabling', true);
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
             .set('selectedDeviceId', action.deviceIdentifier)
      });
    case ble.UPDATE_SERVICES:
      return state.mergeDeepIn(['devices', action.deviceIdentifier, 'services'], action.services);
    case ble.UPDATE_CHARACTERISTIC:
      return state.mergeDeepIn(['devices', action.deviceIdentifier, 
                                'services', action.serviceUUID, 
                                'characteristics', action.characteristicUUID], action.characteristic)
    case ble.SELECT_SERVICE:
      return state.set('selectedServiceId', action.serviceUUID);
    case ble.SELECT_CHARACTERISTIC:
      return state.set('selectedCharacteristicId', action.characteristicUUID);
    case ble.WRITE_CHARACTERISTIC:
      return state.withMutations(state => {
        state.setIn(['operations', transactionId], Map({
          type: 'write',
          state: 'new',
          deviceIdentifier: action.deviceIdentifier,
          serviceUUID: action.serviceUUID,
          characteristicUUID: action.characteristicUUID,
          base64Value: action.base64Value,
          transactionId
        })).set('transactionId', transactionId + 1);
      }); 
    case ble.READ_CHARACTERISTIC:
      return state.withMutations(state => {
        state.setIn(['operations', transactionId], Map({
          type: 'read',
          state: 'new',
          deviceIdentifier: action.deviceIdentifier,
          serviceUUID: action.serviceUUID,
          characteristicUUID: action.characteristicUUID,
          transactionId
        })).set('transactionId', transactionId + 1);
      });
    case ble.MONITOR_CHARACTERISTIC:
      const id = action.deviceIdentifier + " " + action.serviceUUID + " " + action.characteristicUUID
      if (!action.monitor) {
        return state.setIn(['operations', id, 'state'], 'cancel')
      }
      return state.setIn(['operations', id], Map({
          type: 'monitor',
          state: 'new',
          deviceIdentifier: action.deviceIdentifier,
          serviceUUID: action.serviceUUID,
          characteristicUUID: action.characteristicUUID,
          transactionId: id
        }));
    case ble.EXECUTE_TRANSACTION:
      return state.setIn(['operations', action.transactionId, 'state'], 'inProgress');
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
