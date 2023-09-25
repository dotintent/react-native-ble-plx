import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';

import { MainStackComponent, type MainStackParamList } from '.';

const mainTheme = {
   ...DefaultTheme,
   dark: false,
   colors: {
      ...DefaultTheme.colors,
      card: 'white',
      background: 'white',
   },
};

export interface AllScreenTypes extends MainStackParamList {}

declare global {
   namespace ReactNavigation {
      interface RootParamList extends AllScreenTypes {}
   }
}

const Navigation = () => (
   <NavigationContainer theme={mainTheme}>
      <MainStackComponent />
   </NavigationContainer>
);

export default Navigation;
