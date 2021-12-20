import React from 'react'
import { ActivityIndicator, StyleSheet } from 'react-native'

export const LoadingIndicator = ({ isLoading }) => {
  return (
    isLoading && <ActivityIndicator style={styles.indicator} size="large" />
  )
}

const styles = StyleSheet.create({
  indicator: {
    position: 'absolute',
    bottom: '50%',
    right: '50%', 
    left: '50%',
    top: '50%',
  },
})
