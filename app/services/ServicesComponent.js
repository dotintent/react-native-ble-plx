'use strict';

import React, { Component } from 'react';
import { View, Text } from 'react-native';
import { connect } from 'react-redux'
import * as ble from '../ble/BleActions'
import ServiceView from './ServiceView'
import ImmutableListView from '../view/ImmutableListView'

class ServicesComponent extends Component {

  _renderServiceCell(rowData) {
    const serviceClicked = () => {
      this.props.selectService(this.props.deviceId, rowData.get('uuid'))
    }

    return (
      <ServiceView
        characteristicsCount={rowData.get('characteristicsCount')}
        isPrimary={rowData.get('isPrimary')}
        uuid={rowData.get('uuid')}
        onClick={serviceClicked}
        />
    )
  }

  render() {
    return (
      <View style={{flex: 1, padding: 20}}>
        <ImmutableListView
          data={this.props.services}
          onRenderCell={this._renderServiceCell.bind(this)}
        />
        <Text>Device status: {this.props.state}</Text>
      </View>
    )
  }
}

export default connect(
  state => {
    const deviceId = state.getIn(['ble', 'selectedDeviceId'])
    return {
      deviceId,
      services: state.getIn(['ble', 'devices', deviceId, 'services']),
      state: state.getIn(['ble', 'state'])
    }
  },
  {
    selectService: ble.selectService
  })
(ServicesComponent)
