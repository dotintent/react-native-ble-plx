'use strict';

import React, { Component } from 'react';
import { View, Text } from 'react-native';
import { connect } from 'react-redux'
import CharacteristicView from './CharacteristicView'
import ImmutableListView from '../view/ImmutableListView'
import Style from '../view/Style'
import { Actions } from  'react-native-router-flux'
import * as SceneConst from '../scene/Const'
import * as ble from '../ble/BleActions'

class CharacteristicsComponent extends Component {

  _characteristicClicked(rowData) {
    this.props.selectCharacteristic(this.props.deviceId, this.props.serviceId, rowData.get('uuid'))
    Actions[SceneConst.CHARACTERISTIC_DETAILS_SCENE]();
  }

  _renderCharacteristicCell(rowData) {
    return (
      <CharacteristicView
        isReadable={rowData.get('isReadable')}
        isWritable={rowData.get('isWritable')}
        isNotifiable={rowData.get('isNotifiable')}
        uuid={rowData.get('uuid')}
        value={rowData.get('value')}
        onClick={this._characteristicClicked.bind(this, rowData)}
      />
    )
  }

  render() {
    return (
      <View style={Style.component}>
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
    selectCharacteristic: ble.selectCharacteristic
  })
(CharacteristicsComponent)