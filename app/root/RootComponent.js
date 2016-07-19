'use strict';

import React, { Component } from 'react';
import { Router, Scene } from 'react-native-router-flux';
import { connect } from 'react-redux';
import ServicesComponent from '../services/ServicesComponent';
import ScannedDevicesComponent from '../scanning/ScannedDevicesComponent';

class RootComponent extends Component {
  render() {
    return (
      <Router>
        <Scene key="root">
          <Scene key="scannedDevices" component={ScannedDevicesComponent} title="Devices" initial={true}/>
          <Scene key="services" component={ServicesComponent} title="Services"/>
        </Scene>
      </Router>
    )
  }
}

export default connect()(RootComponent)
