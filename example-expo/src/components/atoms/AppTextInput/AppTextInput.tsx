import React from 'react'
import type { TextInputProps } from 'react-native'
import { StyledTextInput } from './AppTextInput.styled'

export function AppTextInput(props: TextInputProps) {
  return <StyledTextInput {...props} />
}
