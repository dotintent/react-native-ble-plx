// @flow

import React from 'react'
import { View } from 'react-native'
import { addAccessibilityLabel } from './utils'
import TestCase, { type TestCaseType } from './TestCase'

type Props = {
  testCases: Array<TestCaseType>
}

export default class TestSuite extends React.Component<Props> {
  render() {
    const { testCases } = this.props
    return (
      <View {...addAccessibilityLabel('TestSuite')}>
        {testCases.map(({ name, run }) => (
          <TestCase key={`testCase-${name}`} name={name} run={run} />
        ))}
      </View>
    )
  }
}
