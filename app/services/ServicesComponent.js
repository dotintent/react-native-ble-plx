'use strict';

import React, { Component } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableHighlight,
} from 'react-native';
import { connect } from 'react-redux'

import ServicesListView from './ServicesListView'

import * as ble from '../ble/BleActions'

class ServicesComponent extends Component {
  render() {
    const serviceClicked = (serviceId) => {
      this.props.selectService(this.props.deviceId, serviceId)
    }

    const services = this.props.services.toJS();

    return (
      <View style={{flex: 1, padding: 20}}>
        <ServicesListView
          services={services}
          onServiceClicked={serviceClicked}
        />
        <Text>Status: {this.props.state}</Text>
      </View>
    )
  }
}

var styles = StyleSheet.create({
});

export default connect(
  state => ({
    deviceId: state.getIn(['ble', 'selectedDeviceId']),
    services: state.getIn(['ble', 'devices', state.getIn(['ble', 'selectedDeviceId']), 'services']).toList(),
    state: state.getIn(['ble', 'state'])
  }),
  {
    selectService: ble.selectService
  })
(ServicesComponent)
