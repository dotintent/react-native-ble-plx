'use strict';

import React, { Component, PropTypes } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

let borderColor = '#2d7599'

const ScannedDeviceView = ({name, uuid, rssi, onClick}) => {
  return (
    <TouchableOpacity onPress={onClick}>
      <View style={styles.background}>
        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            <Text style={styles.titleText}>Name:</Text>
            <Text style={styles.contentText}>{name ? name : '-'}</Text>
          </View>
          <View style={styles.rssiRow}>
            <Text style={styles.titleText}>RSSI:</Text>
            <Text style={styles.contentText}>{rssi}</Text>
          </View>
        </View>
        <View style={{backgroundColor: borderColor, height: 1}}/>
        <View style={styles.bottomRow}>
          <Text style={styles.titleText}>UUID:</Text>
          <Text style={styles.uuidText}>{uuid}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

ScannedDeviceView.propTypes = {
  name: PropTypes.string,
  uuid: PropTypes.string.isRequired,
  rssi: PropTypes.number.isRequired,
  onClick: PropTypes.func.isRequired
}

var styles = StyleSheet.create({
  background: {
    flexDirection: 'column',
    justifyContent: 'center',
    borderRadius: 10,
    borderColor: borderColor,
    borderWidth: 2,
    overflow: 'hidden'
  },
  titleText: {
    fontWeight: 'bold',
    fontSize: 8,
    backgroundColor: '#d2f3ff',
    padding: 2
  },
  contentText: {
    paddingHorizontal: 2,
    paddingVertical: 3
  },
  uuidText: {
    paddingHorizontal: 2,
    paddingVertical: 3,
    fontSize: 10,
  },
  topRow: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'white',
  },
  bottomRow: {
    flex: 1,
    backgroundColor: 'white',
  },
  nameRow: {
    flex: 1,
  },
  rssiRow: {
    flex: 1,
  }
});

export default ScannedDeviceView
