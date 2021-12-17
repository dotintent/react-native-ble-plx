import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export const ServicesCard = ({ services }) => {

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Device services</Text>
      {services.map((service, index) => (
        <View key={service.id} style={styles.serviceContainer}>
          <Text style={styles.subtitle}>Service {index}</Text>
          <Text style={styles.deviceParam}>
            {`deviceID: ${'\n'}`}
            <Text style={styles.deviceParamValue}>
              {service.deviceID}
            </Text>
          </Text>
          <Text style={styles.deviceParam}>
            {`id: `}
            <Text style={styles.deviceParamValue}>
              {service.id}
            </Text>
          </Text>
          <Text style={styles.deviceParam}>
            {`isPrimary: `}
            <Text style={styles.deviceParamValue}>
              {service.isPrimary}
            </Text>
          </Text>
          <Text style={styles.deviceParam}>
            {`UUID: `}
            <Text style={styles.deviceParamValue}>
              {service.UUID}
            </Text>
          </Text>
        </View>
      ))}
    </View>
  )
}


const styles = StyleSheet.create({
  deviceParam: {
    fontWeight: '500',
  },
  deviceParamValue: {
    fontWeight: 'normal',
    fontSize: 12,
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
    width: '100%'
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 15
  },
  subtitle: {
    fontWeight: '700',
    fontSize: 15,
  },
  serviceContainer: {
    marginBottom: 10,
  },
})