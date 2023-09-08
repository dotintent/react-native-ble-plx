import { View } from 'react-native'
import styled from 'styled-components'
import { AppText } from '../../../atoms'

export const Container = styled(View)`
  flex-direction: row;
  flex-wrap: wrap;
`

export const StyledTitleText = styled(AppText)`
  font-weight: 800;
`

export const StyledValueText = styled(AppText)`
  font-weight: 500;
`
