import React from 'react'
import { AppText } from '../AppText/AppText'
import type { TextStateType } from 'example/types'
import { Container } from './TestStateDisplay.styled'
export type TestStateDisplayProps = {
  label?: string,
  state: TextStateType
}

const marks: Record<TextStateType, string> = {
  DONE: '\u2705',
  ERROR: '\u274C',
  WAITING: '\u231B',
  IN_PROGRESS: '\u260E'
}

export const TestStateDisplay = ({ label, state }: TestStateDisplayProps) => {
  return (
    <Container>
      <AppText>{label}</AppText>
      <AppText>{marks[state]}</AppText>
    </Container>
  )
}
