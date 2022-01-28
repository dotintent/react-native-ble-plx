import React from 'react'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'

import { COLORS } from '../../contants/colors'

export const PrimaryButton = props => {
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
    backgroundColor: COLORS.WHITE,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonText: {
    color: COLORS.BLACK,
    fontWeight: '600',
  },
})
