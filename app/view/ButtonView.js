import React, { Component, PropTypes } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const ButtonView = ({onClick, disabled, color, text}) => {
  var style = [styles.button];
  style.push({backgroundColor: color})
  if (disabled) style.push(styles.buttonDisabled)

  return (
    <TouchableOpacity
      style={styles.highlight}
      onPress={onClick}
      disabled={disabled}>
      <Text style={style}>
        {text}
      </Text>
    </TouchableOpacity>
  )
}

ButtonView.propTypes = {
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
  color: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
}

var styles = StyleSheet.create({
  button: {
    fontWeight: 'bold',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 10
  },
  buttonDisabled: {
    backgroundColor: '#ede9eb'
  }
});

export default ButtonView
