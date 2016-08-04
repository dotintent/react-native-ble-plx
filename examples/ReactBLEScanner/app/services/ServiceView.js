'use strict';

import React, { Component, PropTypes } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

let borderColor = '#a2001d'

const ServiceView = ({characteristicsCount, isPrimary, uuid, onClick}) => {
  return (
    <TouchableOpacity onPress={onClick}>
      <View style={styles.background}>
        <View style={styles.topRow}>
          <View style={styles.row}>
            <Text style={styles.titleText}>Characteristic #:</Text>
            <Text style={styles.contentText}>{characteristicsCount ? characteristicsCount : '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.titleText}>isPrimary:</Text>
            <Text style={styles.contentText}>{isPrimary ? 'true' : 'false'}</Text>
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

ServiceView.propTypes = {
  characteristicsCount: PropTypes.number,
  isPrimary: PropTypes.bool.isRequired,
  uuid: PropTypes.string.isRequired,
  onClick: PropTypes.func
}

var styles = StyleSheet.create({
  background: {
    flexDirection: 'column',
    justifyContent: 'center',
    borderColor: borderColor,
    borderWidth: 2,
    overflow: 'hidden'
  },
  titleText: {
    fontWeight: 'bold',
    fontSize: 8,
    backgroundColor: '#ffd0d3',
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
  row: {
    flex: 1,
  }
});

export default ServiceView
