'use strict';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { View, Switch, Text, TextInput, StyleSheet } from 'react-native';
import Style from '../view/Style';
import ButtonView from '../view/ButtonView';
import * as ble from '../ble/BleActions';

class CharacteristicDetailsComponent extends Component {
  render() {
    const characteristic = this.props.characteristic;
    const uuid = characteristic.get('uuid')
    const isReadable = characteristic.get('isReadable')
    const isWriteable = characteristic.get('isWriteable')
    const isNotifiable = characteristic.get('isNotifiable')
    const value = characteristic.get('value')

    const read = () => {
      this.props.readCharacteristic(this.props.deviceId,
                                    this.props.serviceId,
                                    this.props.characteristicId,
                                    'id')
    }

    return (
      <View style={Style.component}>
        <Text style={styles.header}>UUID</Text>
        <Text style={{fontSize: 12}}>{uuid}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={styles.header}>isReadable: </Text>
            <Text>{isReadable ? 'true' : 'false'}</Text>
          </View>
          <View>
            <Text style={styles.header}>isWriteable: </Text>
            <Text>{isWriteable ? 'true' : 'false'}</Text>
          </View>
          <View>
            <Text style={styles.header}>isNotifiable: </Text>
            <Text>{isNotifiable ? 'true' : 'false'}</Text>
          </View>
        </View>
        <Text style={styles.header}>Notify: </Text>
        <Switch/>
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10 }}>Value: </Text>
            <TextInput/>
            <Text>{value || '-'}</Text>
          </View>
          <ButtonView onClick={read} disabled={false} color={'#beffc6'} text={'Read'}/>
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 20,
    paddingBottom: 5,
    fontSize: 10,
  }
});

export default connect((state) => {
  const deviceId = state.getIn(['ble', 'selectedDeviceId'])
  const serviceId = state.getIn(['ble', 'selectedServiceId'])
  const characteristicId = state.getIn(['ble', 'selectedCharacteristicId'])
  return {
    deviceId,
    serviceId,
    characteristicId,
    characteristic: state.getIn(['ble', 'devices', deviceId, 'services', serviceId, 'characteristics', characteristicId])
  }
},
{
  readCharacteristic: ble.readCharacteristic
}
)(CharacteristicDetailsComponent)