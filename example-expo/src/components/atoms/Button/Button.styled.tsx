import { TouchableOpacity } from 'react-native'
import styled, { css } from 'styled-components'
import { AppText } from '../AppText/AppText'

export const Container = styled(TouchableOpacity)`
  ${({ theme }) => css`
    background-color: ${theme.colors.mainRed};
    margin: 5px 0px;
    padding: 12px;
    align-items: center;
    border-radius: 100px;
  `}
`

export const StyledText = styled(AppText)`
  color: white;
`
