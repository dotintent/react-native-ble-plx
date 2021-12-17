import React from 'react'
import { StatusBar } from 'react-native'

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { HomeScreen } from './src/screens/Home'
import { DeviceDetailsScreen } from './src/screens/DeviceDetails'
import { DevicesContext, DevicesContextProvider } from './src/contexts/DevicesContext'

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <SafeAreaProvider>
      <DevicesContextProvider>
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Home">
              <Stack.Screen options={{ headerShown: false }} name="Home" component={HomeScreen} />
              <Stack.Screen name="DeviceDetails" component={DeviceDetailsScreen} />
            </Stack.Navigator>
        </NavigationContainer>
      </DevicesContextProvider>
      <StatusBar barStyle="dark-content" />
      <Toast />
    </SafeAreaProvider>
  )
}

export default App
