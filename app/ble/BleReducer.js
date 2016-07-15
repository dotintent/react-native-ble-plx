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
    case blePeripheralFoundAction.type:
      return {...state, devices: state.devices.filter((peripheral) => {
        return peripheral.uuid !== action.peripheral.uuid
      }).concat([action.peripheral])}
    default:
      return state;
  }
}
