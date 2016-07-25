'use strict';

import React, { Component } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import * as ble from '../ble/BleActions';

class ErrorComponent extends Component {
  render() {
    const lastError = this.props.errorMessages.last()

    if (!lastError) {
      return null
    }

    return (
      <TouchableOpacity onPress={this.props.pop}>
        <View style={styles.container}>
          <Text style={styles.message}>{lastError}</Text>
        </View>
      </TouchableOpacity>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'red',
  },
  message: {
    color: 'white',
    fontWeight: 'bold'
  }
});

export default connect(
  state => ({
    errorMessages: state.getIn(['ble', 'errors'])
  }),
  {
    pop: ble.popError
  }
)(ErrorComponent)