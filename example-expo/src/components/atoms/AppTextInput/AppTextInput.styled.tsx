import { TextInput } from 'react-native'
import styled, { css } from 'styled-components'

export const StyledTextInput = styled(TextInput)`
  ${({ theme }) => css`
    font-size: ${theme.sizes.defaultFontSize}px;
    font-weight: 800;
    border-radius: 100px;
    border-color: ${theme.colors.mainRed};
    border-width: 1px;
    padding: 0px 24px;
    height: 50px;
    margin-bottom: 12px;
  `}
`
