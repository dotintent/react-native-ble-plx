// @flow

import { Platform } from 'react-native'

export const addAccessibilityLabel = (id: string) =>
  Platform.select({
    ios: { testID: id },
    android: { accessible: true, accessibilityLabel: id }
  })
