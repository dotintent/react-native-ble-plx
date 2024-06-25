import { Text } from 'react-native'
import styled, { css } from 'styled-components'

export const StyledText = styled(Text)`
  ${({ theme }) => css`
    font-size: ${theme.sizes.defaultFontSize}px;
    font-weight: 800;
  `}
`
