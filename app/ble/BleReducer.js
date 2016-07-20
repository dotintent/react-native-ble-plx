'use strict';

import * as ble from './BleActions'
import Immutable from 'immutable'

const defaultState = {
  devices: [],
  selectedDevice: null,
  selectedService: null,
  selectedCharacteristic: null,
  state: ble.DEVICE_STATE_DISCONNECTED
};

function createDevice(uuid, name, rssi, state, services) {
  return {
    "uuid": uuid,
    "name": name,
    "rssi": rssi,
    "state": state,
    "services": services
  }
}

function createService(uuid, characteristics) {
  return {
    "uuid": uuid,
    "characteristics": characteristics
  }
}

function createCharacteristic(uuid, isWritable, isReadable, isNotifiable) {
  return {
    "uuid": uuid,
    "isWritable": isWritable,
    "isReadable": isReadable,
    "isNotifiable": isNotifiable,
  }
}

function updateDevicesState(devices, device) {
  var oldDevice = Immutable.fromJS(devices[device.uuid]);
  var newDevice = Immutable.fromJS(device);
  resultDevice = oldDevice.mergeDeep(newDevice);
  const uuid = device.uuid
  return  {...devices, uuid: resultDevice.toJS()}
}

function updateServices(oldServices, newServices) {
  oldServicesImmutable = Immutable.fromJS(oldServices);
  newServicesImmutable = Immutable.fromJS(newServices);
  return oldServicesImmutable.mergeDeep(newServicesImmutable).toJS();
}

export default (state = defaultState, action) => {
  switch (action.type) {
    case ble.START_SCAN:
      return {...state, scanning: true}
    case ble.STOP_SCAN:
      return {...state, scanning: false}
    case ble.DEVICE_FOUND:
      return {...state, devices: updateDevicesState(state.devices, action.device)}
    case ble.CHANGE_DEVICE_STATE:
      return {...state, scanning: false, state: action.state, selectedDevice: action.deviceId}
    case ble.UPDATE_SERVICES:
      services = updateServices(state.devices[action.deviceId].services, action.services);
      return {...state, devices: {...state.devices, services: services}};
    case ble.UPDATE_CHARACTERISTICS:
      return {...state}
    case ble.WRITE_CHARACTERISTIC:
      return {...state, writing: true,
              deviceId: action.deviceId,
              serviceId: action.serviceId,
              characteristicId: action.characteristicId,
              value: action.base64Value,
              transactionId: action.transactionId}
    case ble.READ_CHARACTERISTIC:
      return {...state, reading: true,
              deviceId: action.deviceId,
              serviceId: action.serviceId,
              characteristicId: action.characteristicId,
              transactionId: action.transactionId}
    default:
      return state;
  }
}
