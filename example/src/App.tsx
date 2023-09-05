import React from 'react';
import { Navigation } from './navigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from 'styled-components';
import { commonTheme } from './theme/theme';
import Toast from 'react-native-toast-message';

const App = () => (
   <SafeAreaProvider>
      <ThemeProvider theme={commonTheme}>
         <Navigation />
         <Toast />
      </ThemeProvider>
   </SafeAreaProvider>
);

export default App;
