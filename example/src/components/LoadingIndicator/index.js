import React from 'react'
import { ActivityIndicator} from 'react-native'

export const LoadingIndicator = ({ isLoading }) => {
  return (
    isLoading && <ActivityIndicator size="large" />
  )
}

