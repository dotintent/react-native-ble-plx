'use strict';

import React, { Component } from 'react';
import { Router, Scene } from 'react-native-router-flux';
import { connect } from 'react-redux';
import ServicesComponent from '../services/ServicesComponent';
import CharacteristicsComponent from '../characteristics/CharacteristicsComponent';
import ScannedDevicesComponent from '../scanning/ScannedDevicesComponent';
import * as SceneConst from '../scene/Const.js'
import * as ble from '../ble/BleActions'
import { Actions } from 'react-native-router-flux'

const RouterWithRedux = connect()(Router)

class RootComponent extends Component {

  _onBack() {
      Actions.pop();
      this.props.changeDeviceState(this.props.selectedDeviceId, ble.DEVICE_STATE_DISCONNECT);
  }

  render() {
    return (
      <RouterWithRedux>
        <Scene key="root">
          <Scene key={SceneConst.DEVICES_SCENE} component={ScannedDevicesComponent} title="Devices" initial={true}/>
          <Scene key={SceneConst.SERVICES_SCENE} component={ServicesComponent} title="Services" onBack={this._onBack.bind(this)}/>
          <Scene key={SceneConst.CHARACTERISTICS_SCENE} component={CharacteristicsComponent} title="Characteristics"/>
        </Scene>
      </RouterWithRedux>
    )
  }
}

export default connect((state) => ({
  selectedDeviceId: state.getIn(['ble', 'selectedDeviceId']),
  sceneState: state.getIn(['route', 'state'])
}), {
    changeDeviceState: ble.changeDeviceState
})(RootComponent)
