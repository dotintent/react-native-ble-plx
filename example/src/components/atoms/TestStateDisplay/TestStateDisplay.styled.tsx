import { View } from 'react-native'
import styled, { css } from 'styled-components'

export const Container = styled(View)`
  ${({ theme }) => css`
    flex-direction: row;
    justify-content: space-between;
    border-bottom-width: 1px;
    border-bottom-color: ${theme.colors.mainRed};
    padding-bottom: 5px;
    margin: 10px 0px;
  `}
`
