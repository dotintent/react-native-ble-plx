import React, { useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { BleError } from 'react-native-ble-plx'
import { ScrollView, View } from 'react-native'
import type { MainStackParamList } from '../../../navigation/navigators'
import { AppButton, AppText, ScreenDefaultContainer, TestStateDisplay } from '../../../components/atoms'
import { functionsToTest } from './utils'
import { BLEService } from '../../../services'
import { TestStateType } from '../../../types'

type DeviceConnectDisconnectTestScreenProps = NativeStackScreenProps<MainStackParamList, 'INSTANCE_DESTROY_SCREEN'>
type TestData = { name: string; response: string | null }

export function InstanceDestroyScreen(_props: DeviceConnectDisconnectTestScreenProps) {
  const [dataReads, setDataReads] = useState<(TestData | string)[]>([])
  const [instanceExistsCalls, setInstanceExistsCalls] = useState(0)
  const [instanceDestroyedCalls, setInstanceDestroyedCalls] = useState(0)
  const [instanceDestroyedCallsWithCorrectInfo, setInstanceDestroyedCallsWithCorrectInfo] = useState(0)
  const [correctInstaceDestroy, setCorrectInstaceDestroy] = useState<TestStateType>('WAITING')
  const [secondInstaceDestroyFinishedWithError, setSecondInstaceDestroyFinishedWithError] =
    useState<TestStateType>('WAITING')

  const callPromise = async (promise: Promise<any>) =>
    promise
      .then(value => {
        const status = value?.toString() || 'finished'
        console.info(status)
        return status
      })
      .catch((error: BleError) => {
        const { reason } = error
        if (reason) {
          console.error(reason)
          return reason
        }
        console.error(error)
        return 'Error'
      })

  const startChain = async (increaseCounter: () => void) => {
    for (let i = 0; i < functionsToTest.length; i += 1) {
      try {
        const testObject = functionsToTest[i]
        if (testObject) {
          const { name, functionToCall } = testObject
          console.info(`${i} - ${name}`)
          const response = await callPromise(functionToCall())
          if (response && response.includes('BleManager has been destroyed')) {
            setInstanceDestroyedCallsWithCorrectInfo(prevState => prevState + 1)
          }
          addDataToTimeReads({
            name,
            response
          })
          increaseCounter()
        } else {
          addDataToTimeReads({
            name: `index-${i}`,
            response: '-----ERROR-----'
          })
        }
      } catch (e) {
        console.info(`PROBLEM WITH INDEX - ${i}`)
        console.error(e)
      }
    }
  }

  const addDataToTimeReads = ({ name, response }: TestData) => {
    setDataReads(prevState =>
      prevState.concat({
        name,
        response
      })
    )
  }

  const startTest = async () => {
    await startChain(() => setInstanceExistsCalls(prevState => prevState + 1))
    await BLEService.manager
      .destroy()
      .then(() => setCorrectInstaceDestroy('DONE'))
      .catch(() => setCorrectInstaceDestroy('ERROR'))
    await BLEService.manager
      .destroy()
      .then(() => setSecondInstaceDestroyFinishedWithError('ERROR'))
      .catch(error =>
        setSecondInstaceDestroyFinishedWithError(
          error?.reason?.includes('BleManager has been destroyed') ? 'DONE' : 'ERROR'
        )
      )

    await startChain(() => setInstanceDestroyedCalls(prevState => prevState + 1))
  }

  const timeEntriesToRender = dataReads.map((entry, index) => {
    if (typeof entry === 'object') {
      const { name, response } = entry

      return (
        <View key={`${name}-${index.toString()}`} style={{ marginBottom: 20 }}>
          <AppText>{name}</AppText>
          <AppText>result: {response}</AppText>
        </View>
      )
    }

    return (
      <View key={`error-${index.toString()}`} style={{ marginBottom: 20 }}>
        <AppText>{entry}</AppText>
      </View>
    )
  })

  return (
    <ScreenDefaultContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <AppButton label="Start" onPress={startTest} />
        <AppText>It can get stuck on several functions per minute</AppText>
        <AppText>
          Finished calls with existing instance: {instanceExistsCalls}/{functionsToTest.length}
        </AppText>
        <TestStateDisplay label="First destroy finished successful" state={correctInstaceDestroy} />
        <TestStateDisplay label="First destroy errored successful" state={secondInstaceDestroyFinishedWithError} />
        <AppText>
          Finished calls with destroyed instance: {instanceDestroyedCalls}/{functionsToTest.length}
        </AppText>
        <AppText>
          Finished calls with correct info about instance destroyed: {instanceDestroyedCallsWithCorrectInfo}/
          {functionsToTest.length}
        </AppText>
        {timeEntriesToRender}
      </ScrollView>
    </ScreenDefaultContainer>
  )
}
