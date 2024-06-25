import { FlatList, View } from 'react-native'
import styled from 'styled-components'

export const DropDown = styled(View)`
  z-index: 100;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: #00000066;
  align-items: center;
  justify-content: center;
`

export const DevicesList = styled(FlatList)`
  flex: 1;
`
