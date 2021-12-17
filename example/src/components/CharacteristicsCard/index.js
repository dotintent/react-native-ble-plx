import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export const CharacteristicsCard = ({ characteristics }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Device characteristics</Text>
      <Text style={styles.deviceParam}>
        {`ID: `}
        <Text style={styles.deviceParamValue}>
          {characteristics.id}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`isConnectable: `}
        <Text style={styles.deviceParamValue}>
          {characteristics.isConnectable}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`localName: `}
        <Text style={styles.deviceParamValue}>
          {characteristics.localName}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`manufacturerData: `}
        <Text style={styles.deviceParamValue}>
          {characteristics.manufacturerData}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`mtu: `}
        <Text style={styles.deviceParamValue}>
          {characteristics.mtu}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`overflowServiceUUIDs: `}
        <Text style={styles.deviceParamValue}>
          {characteristics.overflowServiceUUIDs}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`rssi: `}
        <Text style={styles.deviceParamValue}>
          {characteristics.rssi}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`serviceData: `}
        <Text style={styles.deviceParamValue}>
          {characteristics.serviceData}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`serviceUUIDs: `}
        <Text style={styles.deviceParamValue}>
          {characteristics.serviceUUIDs}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`solicitedServiceUUIDs: `}
        <Text style={styles.deviceParamValue}>
          {characteristics.solicitedServiceUUIDs}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`txPowerLevel: `}
        <Text style={styles.deviceParamValue}>
          {characteristics.txPowerLevel}
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
