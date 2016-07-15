import {
  bleStartScanAction,
  bleStopScanAction,
  bleDeviceFoundAction,
  bleDeviceConnectAction,
} from './BleActions'

export default (state = { devices: [] }, action) => {
  // console.log(`Got action: ${action.type}`);
  switch (action.type) {
    case bleStartScanAction.type:
      return {...state, scanning: true}
    case bleStopScanAction.type:
      return {...state, scanning: false}
    case bleDeviceFoundAction.type: {
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
    case bleDeviceConnectAction.type:
      console.log("Connect action with deviceId: " + action.deviceId);
      return {...state, scanning: false, connecting: true, selectedDevice: action.deviceId}
    default:
      return state;
  }
}
