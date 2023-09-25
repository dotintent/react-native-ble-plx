import type { AppTheme } from '../src/theme/theme'
import 'styled-components'

// Allows for type checking of theme in styled-components and IntelliSense support
declare module 'styled-components' {
  export interface DefaultTheme extends AppTheme {}
}
