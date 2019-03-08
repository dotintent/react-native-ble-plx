// @flow

import React from 'react'
import { SafeAreaView,StyleSheet } from 'react-native'
import { addAccessibilityLabel } from './utils'
import TestCase, { type TestCaseType } from './TestCase'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'papayawhip'
  }
})

type Props = {
  testCases: Array<TestCaseType>
}

export default class TestSuite extends React.Component<Props> {
  render() {
    const { testCases } = this.props
    return (
      <SafeAreaView style={styles.container} {...addAccessibilityLabel('TestSuite')}>
        {testCases.map(({ name, run }) => (
          <TestCase key={`testCase-${name}`} name={name} run={run} />
        ))}
      </SafeAreaView>
    )
  }
}
