// @flow

import React from 'react'
import { View, Text } from 'react-native'
import { addAccessibilityLabel } from './utils'

export type TestCaseType = { name: string, run: <T>() => Promise<T> }

type Props = TestCaseType

type State = {
  status: 'pending' | 'success' | 'failure',
  reason: string | null
}

export default class TestCase extends React.Component<Props, State> {
  state = {
    status: 'pending',
    reason: null
  }

  async componentDidMount() {
    const { run } = this.props
    try {
      await run()
      this.setState({ status: 'success' })
    } catch (error) {
      this.setState({ status: 'failure', reason: error.message || error })
    }
  }

  render() {
    const { name } = this.props
    const { status, reason } = this.state
    return (
      <View {...addAccessibilityLabel(`TestCase-${name}`)}>
        <Text {...addAccessibilityLabel('TestCaseStatus')}>{status}</Text>
        {reason ? <Text {...addAccessibilityLabel('TestCaseStatusReason')}>{reason}</Text> : null}
      </View>
    )
  }
}
