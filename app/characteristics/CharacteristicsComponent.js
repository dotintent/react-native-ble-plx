'use strict';

import React, { Component } from 'react';
import { View, Text } from 'react-native';
import { connect } from 'react-redux'
import CharacteristicView from './CharacteristicView'
import ImmutableListView from '../view/ImmutableListView'

class CharacteristicsComponent extends Component {

  _renderCharacteristicCell(rowData) {
    return (
      <CharacteristicView
        isReadable={rowData.get('isReadable')}
        isWritable={rowData.get('isWritable')}
        isNotifiable={rowData.get('isNotifiable')}
        uuid={rowData.get('uuid')}
      />
    )
  }

  render() {
    return (
      <View style={{flex: 1, padding: 20}}>
        <ImmutableListView
          data={this.props.characteristics}
          onRenderCell={this._renderCharacteristicCell.bind(this)}/>
        <Text>Device status: {this.props.state}</Text>
      </View>
    )
  }
}

export default connect(
  state => {
    const deviceId = state.getIn(['ble', 'selectedDeviceId']);
    const serviceId = state.getIn(['ble', 'selectedServiceId']);

    return {
      deviceId,
      serviceId,
      state: state.getIn(['ble', 'state']),
      characteristics: state.getIn(['ble', 'devices', deviceId, 'services', serviceId, 'characteristics']) 
    }
  },
  {
    // selectService: ble.selectService
  })
(CharacteristicsComponent)