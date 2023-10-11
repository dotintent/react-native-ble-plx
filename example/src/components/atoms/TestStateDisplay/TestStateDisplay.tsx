import React from 'react'
import type { TestStateType } from '../../../types'
import { AppText } from '../AppText/AppText'
import { Container, Header, Label } from './TestStateDisplay.styled'

export type TestStateDisplayProps = {
  label?: string
  state?: TestStateType
  value?: string
}

const marks: Record<TestStateType, string> = {
  DONE: '\u2705',
  ERROR: '\u274C',
  WAITING: '\u231B',
  IN_PROGRESS: '\u260E'
}

export function TestStateDisplay({ label, state, value }: TestStateDisplayProps) {
  return (
    <Container>
      <Header>
        <Label>{label}</Label>
        {!!state && <AppText>{marks[state]}</AppText>}
      </Header>
      {!!value && <AppText>{value}</AppText>}
    </Container>
  )
}
