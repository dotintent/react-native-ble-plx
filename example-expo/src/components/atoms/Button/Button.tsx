import React from 'react'
import type { TouchableOpacityProps } from 'react-native'
import { Container, StyledText } from './Button.styled'

export type AppButtonProps = TouchableOpacityProps & {
  label: string
}

export function AppButton({ label, ...props }: AppButtonProps) {
  return (
    <Container {...props}>
      <StyledText>{label}</StyledText>
    </Container>
  )
}
