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
    return (
      <View style={{flex: 1, padding: 20}}>
        <ServicesListView
          services={this.props.services}
          // onServiceClicked={onServiceClicked}
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
    services: state.getIn(['ble', 'devices', state.getIn(['ble', 'selectedDeviceId']), 'services']).toList().toJS(),
    state: state.getIn(['ble', 'state'])
  }),
  {
    // onServiceClicked: ()=>{}
  })
(ServicesComponent)
