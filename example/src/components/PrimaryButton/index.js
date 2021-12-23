import React from 'react'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'

const PrimaryButton = props => {
  const { onPress, title, isDisabled, isScanning } = props
  const titleColor = isScanning ? 'green' : 'black'

  return (
    <TouchableOpacity disabled={isDisabled} onPress={onPress} style={styles.scanButton}>
      <Text style={[styles.buttonText, { color: titleColor }]}>{title}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  scanButton: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonText: {
    color: 'black',
    fontWeight: '600',
  },
})

export default PrimaryButton
