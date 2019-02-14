import React from 'react';
import { View } from 'react-native';
import { addAccessibilityLabel } from './utils';
import TestCase from './TestCase'

export default class TestSuite extends React.Component {
  render() {
    const { testCases } = this.props;
    return (
      <View {...addAccessibilityLabel('TestSuite')}>
        {testCases.map(([testName, testFn]) => (
          <TestCase
            key={`testCase-${testName}`}
            name={testName}
            run={testFn}
          />
        ))}
      </View>
    );
  }
}
