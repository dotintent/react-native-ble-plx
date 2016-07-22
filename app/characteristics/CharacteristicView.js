'use strict';

import React, { Component, PropTypes } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

let borderColor = '#a2001d'

const CharacteristicView = ({uuid, isReadable, isWritable, isNotifiable, onClick}) => {
    return (
        <TouchableOpacity onPress={onClick}>
        <View style={styles.background}>
            <View style={styles.topRow}>
            <View style={styles.row}>
                <Text style={styles.titleText}>isReadable:</Text>
                <Text style={styles.contentText}>{isReadable ? 'true' : 'false'}</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.titleText}>isWritable:</Text>
                <Text style={styles.contentText}>{isWritable ? 'true' : 'false'}</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.titleText}>isNotifiable:</Text>
                <Text style={styles.contentText}>{isNotifiable ? 'true' : 'false'}</Text>
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

CharacteristicView.propTypes = {
  isReadable: PropTypes.bool.isRequired,
  isWritable: PropTypes.bool.isRequired,
  isNotifiable: PropTypes.bool.isRequired,
  uuid: PropTypes.string.isRequired,
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

export default CharacteristicView