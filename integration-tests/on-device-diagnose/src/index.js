import React from 'react'
import TestSuite from './TestSuite'
import { BleManager } from 'react-native-ble-plx'

export default class Diagnose extends React.Component {
  render () {
    return (
      <TestSuite testCases={[
        ["Initialize BleManager", () => {
          if (!BleManager) {
            throw new Error('BleManager is null!');
          }
          const unsupportedState = new Promise((resolve, reject) => {
            const manager = new BleManager();
            manager.onStateChange((state) => {
              if (state === 'Unsupported') {
                resolve()
              }
              else if (state !== 'Unknown') {
                reject()
              }
            }, true);
          });
          return unsupportedState;
        }]
      ]}/>
    )
  }
}