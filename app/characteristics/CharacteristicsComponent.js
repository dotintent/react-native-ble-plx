'use strict';

import React, { Component } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableHighlight,
} from 'react-native';
import { connect } from 'react-redux'

import CharacteristicsListView from './CharacteristicsListView'

class CharacteristicsComponent extends Component {
  render() {

    const characteristics = this.props.characteristics.toJS();

    return (
      <View style={{flex: 1, padding: 20}}>
        <CharacteristicsListView
          characteristics={characteristics}/>
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
    serviceId: state.getIn(['ble', 'selectedServiceId']),
    characteristics: state.getIn(['ble', 
                                  'devices', 
                                  state.getIn(['ble', 'selectedDeviceId']), 
                                  'services', 
                                  state.getIn(['ble', 'selectedServiceId']), 
                                  'characteristics']).toList(),
    state: state.getIn(['ble', 'state'])
  }),
  {
    // selectService: ble.selectService
  })
(CharacteristicsComponent)