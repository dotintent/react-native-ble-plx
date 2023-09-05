import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useTheme } from 'styled-components';

export const useCommonScreenOptions: () => NativeStackNavigationOptions =
   () => {
      const theme = useTheme();

      return {
         headerShadowVisible: false,
         headerTitleStyle: {
            fontSize: 22,
         },
         headerTitleAlign: 'center',
         headerBackTitleVisible: false,
         orientation: 'portrait',
         title: '',
         headerTintColor: 'white',
         headerStyle: {
            backgroundColor: theme.colors.mainRed,
         },
      };
   };
