import { TextInput } from 'react-native'
import styled, { css } from 'styled-components'

export const StyledTextInput = styled(TextInput)`
  ${({ theme }) => css`
    font-size: ${theme.sizes.defaultFontSize}px;
    font-weight: 800;
    border-radius: 100px;
    border-color: ${theme.colors.mainRed};
    border-width: 1px;
    padding: 6px 24px;
  `}
`
