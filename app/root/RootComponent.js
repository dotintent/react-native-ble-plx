'use strict';

import React, { Component } from 'react';
import { Router, Scene } from 'react-native-router-flux';
import { connect } from 'react-redux';
import ServicesComponent from '../services/ServicesComponent';
import CharacteristicsComponent from '../characteristics/CharacteristicsComponent';
import ScannedDevicesComponent from '../scanning/ScannedDevicesComponent';

class RootComponent extends Component {
  render() {
    return (
      <Router>
        <Scene key="root">
          <Scene key="scannedDevices" component={ScannedDevicesComponent} title="Devices" initial={true}/>
          <Scene key="services" component={ServicesComponent} title="Services"/>
          <Scene key="characteristics" component={CharacteristicsComponent} title="Characteristics"/>
        </Scene>
      </Router>
    )
  }
}

export default connect()(RootComponent)
