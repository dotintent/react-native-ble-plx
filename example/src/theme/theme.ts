import { colors } from './colors';
import { sizes } from './sizes';
import type { DefaultTheme } from 'styled-components';

export const commonTheme: DefaultTheme = {
   sizes,
   colors,
} as const;

export type AppTheme = { sizes: typeof sizes; colors: typeof colors };
