import React from 'react'
import { Container } from './ScreenDefaultContainer.styled'

export type ScreenDefaultContainerProps = {
  children: React.ReactNode
}

export function ScreenDefaultContainer({ children }: ScreenDefaultContainerProps) {
  return <Container edges={['bottom', 'left', 'right']}>{children}</Container>
}
