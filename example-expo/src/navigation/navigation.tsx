import React from 'react'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'

import { MainStackComponent, type MainStackParamList } from './navigators'

const mainTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    card: 'white',
    background: 'white'
  }
}

export type AllScreenTypes = MainStackParamList

// eslint-disable-next-line prettier/prettier
declare global {
  namespace ReactNavigation {
    interface RootParamList extends AllScreenTypes {}
  }
}

export function Navigation() {
  return (
    <NavigationContainer theme={mainTheme}>
      <MainStackComponent />
    </NavigationContainer>
  )
}
