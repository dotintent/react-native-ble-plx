// @flow

import type { BleState } from './BleState'
import type { BleAction } from './BleActions'

const initialState: BleState = {
  devices: {},
  selectedDeviceID: null,
  selectedServiceID: null,
  selectedCharacteristicID: null,
  scanning: false,
  selectedDeviceState: null,
  errors: []
}

/* eslint-disable no-redeclare */

export function bleReducer(state: BleState = initialState, action: BleAction): BleState {
  switch (action.type) {
    case 'START_SCAN':
      return {
        ...state,
        scanning: true,
        devices: {}
      }

    case 'STOP_SCAN':
      return { ...state, scanning: false }

    case 'DEVICE_FOUND':
      return {
        ...state,
        devices: { ...state.devices, [action.device.id]: action.device }
      }

    case 'CHANGE_SELECTED_DEVICE_STATE':
      return {
        ...state,
        scanning: false,
        selectedDeviceID: action.device != null ? action.device.id : null,
        selectedDeviceState: action.state
      }

    case 'FETCHED_SERVICES_AND_CHARACTERISTICS':
      return {
        ...state,
        devices: { ...state.devices, [action.device.device.id]: action.device }
      }

    case 'READ_CHARACTERISTIC':
      return state

    case 'MONITOR_CHARACTERISTIC':
      return state

    case 'SELECT_SERVICE':
      return {
        ...state,
        selectedDeviceID: action.deviceID,
        selectedServiceUUID: action.serviceID
      }

    case 'SELECT_CHARACTERISTIC':
      return {
        ...state,
        selectedDeviceID: action.deviceID,
        selectedServiceUUID: action.serviceID,
        selectedCharacteristicID: action.characteristicID
      }

    case 'PUSH_ERROR':
      return {
        ...state,
        errors: [...state.errors, action.errorMessage]
      }

    case 'POP_ERROR':
      var errors: string[] = state.errors.slice()
      errors.pop
      return {
        ...state,
        errors: errors
      }
  }

  return state
}

/* eslint-enable no-redeclare */
