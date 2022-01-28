import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

import { COLORS } from '../../contants/colors'

export const DeviceDetailsCard = ({ deviceDetails }) => {
  const renderDeviceDetails = () => {
    const data = []
    delete deviceDetails._manager
    delete deviceDetails.name

    for (const i in deviceDetails) {
      data.push(
        <Text key={i} style={styles.deviceParam}>
          {`${i}: `}
          <Text style={styles.deviceParamValue}>{`${deviceDetails[i]}`}</Text>
        </Text>,
      )
    }
    return data
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Device details</Text>
      {renderDeviceDetails()}
    </View>
  )
}

const styles = StyleSheet.create({
  deviceParam: {
    fontWeight: '500',
  },
  deviceParamValue: {
    fontWeight: 'normal',
    fontSize: 13,
  },
  card: {
    backgroundColor: COLORS.WHITE,
    marginBottom: 10,
    padding: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    shadowColor: COLORS.BLACK,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: '100%',
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 15,
  },
})
