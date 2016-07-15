import {
  bleStartScanAction,
  bleStopScanAction,
  blePeripheralFoundAction,
} from './BleActions'

export default (state = { devices: [] }, action) => {
  switch (action.type) {
    case bleStartScanAction.type:
      return {...state, scanning: true}
    case bleStopScanAction.type:
      return {...state, scanning: false}
    case blePeripheralFoundAction.type: {
      var found = false;
      var devices = state.devices.map((peripheral) => {
      if (peripheral.uuid !== action.peripheral.uuid) {
        return peripheral
      } else {
        found = true;
        return action.peripheral;
      }});
      devices = !found ? devices.concat([action.peripheral]) : devices;
      return {...state, devices: devices }
    }
    default:
      return state;
  }
}
