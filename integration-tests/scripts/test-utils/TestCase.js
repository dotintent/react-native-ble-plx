// @flow

import React from 'react'
import { View, Text } from 'react-native'
import { addAccessibilityLabel } from './utils'

export type TestCaseType = { name: string, run: <T>() => Promise<T> }

type Props = TestCaseType

type State = {
  status: 'pending' | 'success' | 'failure'
}

export default class TestCase extends React.Component<Props, State> {
  state = {
    status: 'pending'
  }

  async componentDidMount() {
    const { run } = this.props
    try {
      await run()
      this.setState({ status: 'success' })
    } catch (e) {
      this.setState({ status: 'failure' })
    }
  }

  render() {
    const { name } = this.props
    const { status } = this.state
    return (
      <View {...addAccessibilityLabel(`TestCase-${name}`)}>
        <Text {...addAccessibilityLabel('TestCaseStatus')}>{status}</Text>
      </View>
    )
  }
}
