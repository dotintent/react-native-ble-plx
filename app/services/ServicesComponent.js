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

class ServicesComponent extends Component {
  render() {
    return (
      <View style={{flex: 1, padding: 20}}>
        <ServicesListView
          services={this.props.services}/>
        <Text>Status: {this.props.state}</Text>
      </View>
    )
  }
}

var styles = StyleSheet.create({

});

export default connect(
  state => ({
    services: state.ble.services,
    state: state.ble.state
  }),
  {
  })
(ServicesComponent)
