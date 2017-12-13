// @flow

import type { bleState } from './BleState'
import type { operation } from './BleState'
import type { bleAction } from './BleActions'

const initialState: bleState = {
  devices: {},
  selectedDeviceUUID: null,
  selectedServiceUUID: null,
  selectedCharacteristicUUID: null,
  scanning: false,
  errors: [],
  state: 'DISCONNECTED',
  operations: {},
  operationId: null
}

/* eslint-disable no-redeclare */

export function bleReducer(state: bleState = initialState, action: bleAction) {
  switch (action.type) {
    case 'START_SCAN':
      return Object.assign({}, state, {
        scanning: true
      })

    case 'STOP_SCAN':
      return Object.assign({}, state, {
        scanning: false
      })

    case 'DEVICE_FOUND':
      var devices: devices = Object.assign({}, state.devices)
      devices[action.device.uuid] = action.device
      return Object.assign({}, state, {
        devices: devices
      })

    case 'CHANGE_DEVICE_STATE':
      return Object.assign({}, state, {
        scanning: false,
        state: action.state,
        selectedDeviceUUID: action.deviceUUID
      })

    case 'UPDATE_SERVICES':
      var devices: devices = Object.assign({}, state.devices)
      devices[action.deviceUUID].services = action.services

      return Object.assign({}, state, {
        devices: devices
      })

    case 'UPDATE_CHARACTERISTICS':
      var devices: devices = Object.assign({}, state.devices)
      devices[action.deviceUUID][action.serviceUUID].characteristics = action.characteristics

      return Object.assign({}, state, {
        devices: devices
      })

    case 'WRITE_CHARACTERISTIC':
      var operationId: string =
        'WRITE_' + action.deviceUUID + '_' + action.serviceUUID + '_' + action.characteristicUUID
      var op: operation = {
        type: 'WRITE',
        state: 'NEW',
        deviceUUID: action.deviceUUID,
        serviceUUID: action.serviceUUID,
        characteristicUUID: action.characteristicUUID,
        base64Value: action.base64Value,
        operationId: operationId
      }
      var operations: operations = Object.assign({}, state.operations)
      operations[operationId] = op
      return Object.assign({}, state, {
        operations: operations,
        operationId: operationId
      })

    case 'READ_CHARACTERISTIC':
      var operationId: string = 'READ_' + action.deviceUUID + '_' + action.serviceUUID + '_' + action.characteristicUUID
      var op: operation = {
        type: 'READ',
        state: 'NEW',
        deviceUUID: action.deviceUUID,
        serviceUUID: action.serviceUUID,
        characteristicUUID: action.characteristicUUID,
        base64Value: null,
        operationId: operationId
      }
      var operations: operations = Object.assign({}, state.operations)
      operations[operationId] = op
      return Object.assign({}, state, {
        operations: operations,
        operationId: operationId
      })

    case 'MONITOR_CHARACTERISTIC':
      var operationId: string =
        'MONITOR_' + action.deviceUUID + '_' + action.serviceUUID + '_' + action.characteristicUUID

      if (!action.monitor) {
        let operation: operation = Object.assign({}, state.operations[operationId], {
          state: 'CANCEL'
        })
        let operations: operations = Object.assign({}, state.operations)
        operations[operationId] = operation
        return Object.assign({}, state, {
          operations: operations
        })
      }
      var op: operation = {
        type: 'MONITOR',
        state: 'NEW',
        deviceUUID: action.deviceUUID,
        serviceUUID: action.serviceUUID,
        characteristicUUID: action.characteristicUUID,
        base64Value: null,
        operationId: operationId
      }
      var operations: operations = Object.assign({}, state.operations)
      operations[operationId] = op
      return Object.assign({}, state, {
        operations: operations,
        operationId: operationId
      })

    case 'SELECT_SERVICE':
      return Object.assign({}, state, {
        selectedServiceUUID: action.serviceUUID
      })

    case 'SELECT_CHARACTERISTIC':
      return Object.assign({}, state, {
        selectedCharacteristicUUID: action.characteristicUUID
      })

    case 'PUSH_ERROR':
      var errors: string[] = state.errors.slice()
      errors.push(action.errorMessage)
      return Object.assign({}, state, {
        errors: errors
      })

    case 'POP_ERROR':
      var errors: string[] = state.errors.slice()
      errors.pop
      return Object.assign({}, state, {
        errors: errors
      })

    case 'EXECUTE_TRANSACTION':
      var operations: operations = Object.assign({}, state.operations)
      operations[action.operationId].state = 'IN_PROGRESS'
      return Object.assign({}, state, {
        operations: operations
      })

    case 'COMPLETE_TRANSACTION':
      var operations: operations = Object.assign({}, state.operations)
      delete operations[action.operationId]
      return Object.assign({}, state, {
        operations: operations
      })
  }
}

/* eslint-enable no-redeclare */
