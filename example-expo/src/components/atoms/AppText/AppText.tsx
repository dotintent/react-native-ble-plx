import React from 'react'
import type { TextProps } from 'react-native'
import { StyledText } from './AppText.styled'

export function AppText(props: TextProps) {
  return <StyledText {...props} />
}
