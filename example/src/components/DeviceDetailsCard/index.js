import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export const DeviceDetailsCard = ({ deviceDetails }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Device details</Text>
      <Text style={styles.deviceParam}>
        {`ID: `}
        <Text style={styles.deviceParamValue}>
          {deviceDetails.id}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`isConnectable: `}
        <Text style={styles.deviceParamValue}>
          {deviceDetails.isConnectable.toString()}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`localName: `}
        <Text style={styles.deviceParamValue}>
          {deviceDetails.localName}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`manufacturerData: `}
        <Text style={styles.deviceParamValue}>
          {deviceDetails.manufacturerData}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`mtu: `}
        <Text style={styles.deviceParamValue}>
          {deviceDetails.mtu}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`overflowServiceUUIDs: `}
        <Text style={styles.deviceParamValue}>
          {deviceDetails.overflowServiceUUIDs}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`rssi: `}
        <Text style={styles.deviceParamValue}>
          {deviceDetails.rssi}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`serviceData: `}
        <Text style={styles.deviceParamValue}>
          {deviceDetails.serviceData}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`serviceUUIDs: `}
        <Text style={styles.deviceParamValue}>
          {deviceDetails.serviceUUIDs}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`solicitedServiceUUIDs: `}
        <Text style={styles.deviceParamValue}>
          {deviceDetails.solicitedServiceUUIDs}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`txPowerLevel: `}
        <Text style={styles.deviceParamValue}>
          {deviceDetails.txPowerLevel}
        </Text>
      </Text>
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
    backgroundColor: '#fff',
    marginBottom: 10,
    padding: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    shadowColor: "#000",
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
