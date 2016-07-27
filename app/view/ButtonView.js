'use strict';

import React, { Component, PropTypes } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Button from 'react-native-button'

const ButtonView = ({onClick, disabled, color, text}) => {
  var style = [styles.containerStyle];
  style.push({backgroundColor: color})
  if (disabled) style.push(styles.buttonDisabled)

  return (
    <Button
      onPress={onClick}
      disabled={disabled}
      containerStyle={style}>
        {text}
    </Button>
  )
}

ButtonView.propTypes = {
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
  color: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
}

var styles = StyleSheet.create({
  containerStyle: {
    padding: 10,
    height: 45,
    overflow: 'hidden',
    borderRadius: 10,
    borderWidth: 1,
  },
  buttonDisabled: {
    backgroundColor: '#ede9eb'
  }
});

export default ButtonView
