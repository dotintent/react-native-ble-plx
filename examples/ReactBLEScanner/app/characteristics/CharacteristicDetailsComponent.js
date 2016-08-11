'use strict';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { View, Switch, Text, TextInput, StyleSheet } from 'react-native';
import { Buffer } from 'buffer';
import Style from '../view/Style';
import ButtonView from '../view/ButtonView';
import * as ble from '../ble/BleActions';

class CharacteristicDetailsComponent extends Component {

  constructor() {
    super()
    this.state = { newValue: ''}
  }

  render() {
    const characteristic = this.props.characteristic;
    const uuid = characteristic.get('uuid')
    const isReadable = characteristic.get('isReadable')
    const isWritable = characteristic.get('isWritable')
    const isNotifiable = characteristic.get('isNotifiable')
    const isNotifying = characteristic.get('isNotifying')
    var value = characteristic.get('value')
    var valueAscii = '';

    if (value) {
      valueAscii = new Buffer(value, "base64").toString('ascii')
      value = new Buffer(value, "base64").toString('hex')
    } else {
      valueAscii = '-'
      value = '-'
    }

    const read = () => {
      this.props.readCharacteristic(this.props.deviceId,
                                    this.props.serviceId,
                                    this.props.characteristicId)
    }

    const write = () => {
      this.props.writeCharacteristic(this.props.deviceId,
                                    this.props.serviceId,
                                    this.props.characteristicId,
                                    new Buffer(this.state.newValue, 'hex').toString('base64'))
    }

    const notify = () => {
      this.props.monitorCharacteristic(this.props.deviceId,
                                       this.props.serviceId,
                                       this.props.characteristicId,
                                       !isNotifying)
    }

    return (
      <View style={[Style.component, {flex: 0}]}>
        <Text style={styles.header}>UUID</Text>
        <Text style={{fontSize: 12}}>{uuid}</Text>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={styles.header}>isReadable: </Text>
            <Text>{isReadable ? 'true' : 'false'}</Text>
          </View>
          <View>
            <Text style={styles.header}>isWritable: </Text>
            <Text>{isWritable ? 'true' : 'false'}</Text>
          </View>
          <View>
            <Text style={styles.header}>isNotifiable: </Text>
            <Text>{isNotifiable ? 'true' : 'false'}</Text>
          </View>
        </View>

        <Text style={styles.header}>Notify:</Text>
        <Switch 
          disabled={!isNotifiable}
          value={isNotifying} 
          onValueChange={notify}
        />
        
        <Text style={styles.header}>Value HEX:</Text>
        <View style={{ flex: 1, flexDirection: 'row'}}>
          <Text style={{flex: 1}}>{value}</Text>
          <ButtonView onClick={read} disabled={!isReadable} color={'#beffc6'} text={'Read'}/>
        </View>

        <Text style={styles.header}>Value ASCII:</Text>
        <Text>{valueAscii}</Text>

        <Text style={styles.header}>New value:</Text>
        <View style={{ flex: 1, flexDirection: 'row'}}>
          <TextInput 
            style={{ height: 40, flex: 1}} 
            value={this.state.newValue}
            autoCorrect={false}
            onChangeText={(text) => this.setState({newValue: text})}
          />
          <ButtonView onClick={write} disabled={!isWritable} color={'#ffd0d3'} text={'Write'}/>
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
  readCharacteristic: ble.readCharacteristic,
  writeCharacteristic: ble.writeCharacteristic,
  monitorCharacteristic: ble.monitorCharacteristic
}
)(CharacteristicDetailsComponent)