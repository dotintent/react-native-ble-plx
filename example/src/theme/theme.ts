import type { DefaultTheme } from 'styled-components'
import { colors } from './colors'
import { sizes } from './sizes'

export const commonTheme: DefaultTheme = {
  sizes,
  colors
} as const

export type AppTheme = { sizes: typeof sizes; colors: typeof colors }
