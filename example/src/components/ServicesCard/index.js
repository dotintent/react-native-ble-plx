import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export const ServicesCard = ({ servicesAndcharacteristics }) => {
  return (
    <View>
      {servicesAndcharacteristics.map((item, index) => {
        delete item._manager
        return (
          <View key={item.id} style={styles.card}>
            <Text style={styles.title}>Service {index}</Text>
            <Text style={styles.deviceParam}>
              {`deviceID: ${'\n'}`}
              <Text style={styles.deviceParamValue}>{item.deviceID}</Text>
            </Text>
            <Text style={styles.deviceParam}>
              {`id: `}
              <Text style={styles.deviceParamValue}>{item.id}</Text>
            </Text>
            <Text style={styles.deviceParam}>
              {`isPrimary: `}
              <Text style={styles.deviceParamValue}>{item.isPrimary.toString()}</Text>
            </Text>
            <Text style={[styles.deviceParam, { marginBottom: 20 }]}>
              {`UUID: `}
              <Text style={styles.deviceParamValue}>{item.uuid}</Text>
            </Text>
            {item.characteristics.map((characteristic, index) => {
              delete characteristic._manager
              const data = []
              data.push(<Text style={styles.subtitle}>Characteristic {index}</Text>)
              for (const i in characteristic) {
                data.push(
                  <Text style={styles.deviceParam}>
                    {`${i}:`}
                    <Text style={styles.deviceParamValue}>{`${characteristic[i]}`}</Text>
                  </Text>,
                )
              }
              return data
            })}
          </View>
        )
      })}
    </View>
  )
  // return (
  //   <View style={styles.card}>
  //     {servicesAndcharacteristics.map(item => {
  //       delete item._manager
  //       const data = []
  //       for (const i in item) {
  //         data.push(
  //           <Text style={styles.deviceParam}>
  //             {`${i}:`}
  //             <Text style={styles.deviceParamValue}>
  //               {`${item[i]}`}
  //             </Text>
  //           </Text>)
  //       }
  //       return data
  //     })}
  //   </View>
  // )
  // return (
  //   services.length ? (
  //     <View style={styles.card}>
  //       <Text style={styles.title}>Device services</Text>
  //       {services.map((service, index) => (
  //         <View key={service.id} style={styles.serviceContainer}>
  //           <Text style={styles.subtitle}>Service {index}</Text>
  //           <Text style={styles.deviceParam}>
  //             {`deviceID: ${'\n'}`}
  //             <Text style={styles.deviceParamValue}>
  //               {service.deviceID}
  //             </Text>
  //           </Text>
  //           <Text style={styles.deviceParam}>
  //             {`id: `}
  //             <Text style={styles.deviceParamValue}>
  //               {service.id}
  //             </Text>
  //           </Text>
  //           <Text style={styles.deviceParam}>
  //             {`isPrimary: `}
  //             <Text style={styles.deviceParamValue}>
  //               {service.isPrimary.toString()}
  //             </Text>
  //           </Text>
  //           <Text style={styles.deviceParam}>
  //             {`UUID: `}
  //             <Text style={styles.deviceParamValue}>
  //               {service.uuid}
  //             </Text>
  //           </Text>
  //         </View>
  //       ))}
  //     </View>
  //   ) : null
  // )
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
    shadowColor: '#000',
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
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontWeight: '700',
    fontSize: 16,
  },
  serviceContainer: {
    marginBottom: 10,
  },
})
