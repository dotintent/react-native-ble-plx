import React, { useState } from 'react'
import { StyleSheet, Text, View, Button } from 'react-native'
import { checkBluetoothPermissionsAsync, requestBluetoothPermissionsAsync } from './permissions'
import { ScanScenario, scanForDevices } from './scan'

export function TestApp() {
  const [permissionsOk, setPermissionsOk] = useState(false)
  const [message, setMessage] = useState('')

  checkBluetoothPermissionsAsync()
    .then(isOk => {
      setPermissionsOk(isOk)
    })
    .catch(err => {
      setMessage(`${err}`)
    })

  function scanPressHandler(scenario: ScanScenario) {
    scanForDevices(30, scenario)
  }

  return (
    <View style={styles.container}>
      {permissionsOk ? (
        <Text>Permissions granted</Text>
      ) : (
        <Button
          title="Get permissions"
          onPress={() => {
            requestBluetoothPermissionsAsync()
              .then(isOk => {
                setPermissionsOk(isOk)
              })
              .catch(err => {
                setMessage(`${err}`)
              })
          }}
        />
      )}
      <Button title="Scan selected" onPress={() => scanPressHandler(ScanScenario.Selected)} />
      <Button title="Scan everything" onPress={() => scanPressHandler(ScanScenario.Everything)} />
      <Text>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 7
  }
})
