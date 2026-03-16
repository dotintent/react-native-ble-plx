import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Device'>;

// Known test peripheral characteristics for quick access
const TEST_SERVICE_UUID = '12345678-1234-1234-1234-123456789ABC';
const TEST_CHARACTERISTICS: {
  uuid: string;
  testID: string;
  label: string;
  props: {
    isReadable: boolean;
    isWritableWithResponse: boolean;
    isWritableWithoutResponse: boolean;
    isNotifying: boolean;
    isIndicatable: boolean;
  };
}[] = [
  { uuid: '12345678-1234-1234-1234-123456789A01', testID: 'char-read-counter', label: 'Read Counter', props: { isReadable: true, isWritableWithResponse: false, isWritableWithoutResponse: false, isNotifying: false, isIndicatable: false } },
  { uuid: '12345678-1234-1234-1234-123456789A02', testID: 'char-write-echo', label: 'Write Echo', props: { isReadable: true, isWritableWithResponse: true, isWritableWithoutResponse: false, isNotifying: false, isIndicatable: false } },
  { uuid: '12345678-1234-1234-1234-123456789A03', testID: 'char-notify-stream', label: 'Notify Stream', props: { isReadable: true, isWritableWithResponse: false, isWritableWithoutResponse: false, isNotifying: true, isIndicatable: false } },
  { uuid: '12345678-1234-1234-1234-123456789A04', testID: 'char-indicate-stream', label: 'Indicate Stream', props: { isReadable: true, isWritableWithResponse: false, isWritableWithoutResponse: false, isNotifying: false, isIndicatable: true } },
  { uuid: '12345678-1234-1234-1234-123456789A05', testID: 'char-mtu-test', label: 'MTU Test', props: { isReadable: true, isWritableWithResponse: false, isWritableWithoutResponse: false, isNotifying: false, isIndicatable: false } },
  { uuid: '12345678-1234-1234-1234-123456789A06', testID: 'char-write-no-response', label: 'Write No Response', props: { isReadable: true, isWritableWithResponse: false, isWritableWithoutResponse: true, isNotifying: false, isIndicatable: false } },
  { uuid: '12345678-1234-1234-1234-123456789A07', testID: 'char-l2cap-psm', label: 'L2CAP PSM', props: { isReadable: true, isWritableWithResponse: false, isWritableWithoutResponse: false, isNotifying: false, isIndicatable: false } },
];

export default function DeviceScreen({ navigation, route }: Props) {
  const { manager, deviceId, deviceName } = route.params;
  const [mtu, setMtu] = useState<number | null>(null);
  const [serviceUuids, setServiceUuids] = useState<string[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [customCharUuid, setCustomCharUuid] = useState('');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [mtuRequestStatus, setMtuRequestStatus] = useState<string | null>(null);

  useEffect(() => {
    manager.getMtu(deviceId).then(setMtu).catch(() => {});
  }, [manager, deviceId]);

  const discoverServices = useCallback(async () => {
    setDiscovering(true);
    try {
      const info = await manager.discoverAllServicesAndCharacteristics(deviceId);
      const uuids = (info.serviceUuids as string[]) || [];
      setServiceUuids(uuids);
      // Auto-expand the test service if found
      const testSvc = uuids.find((u) => u.toUpperCase() === TEST_SERVICE_UUID);
      if (testSvc) {
        setSelectedService(testSvc);
      }
    } catch (e: any) {
      Alert.alert('Discovery Error', e.message || String(e));
    } finally {
      setDiscovering(false);
    }
  }, [manager, deviceId]);

  const requestMtu = useCallback(async () => {
    try {
      await manager.requestMTUForDevice(deviceId, 247);
      const newMtu = await manager.getMtu(deviceId);
      setMtu(newMtu);
      setMtuRequestStatus(`Success: MTU is now ${newMtu}`);
    } catch (e: any) {
      setMtuRequestStatus(`Error: ${e.message || String(e)}`);
    }
  }, [manager, deviceId]);

  const disconnect = useCallback(async () => {
    try {
      await manager.cancelDeviceConnection(deviceId);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Disconnect Error', e.message || String(e));
    }
  }, [manager, deviceId, navigation]);

  const navigateToCharacteristic = useCallback(
    (serviceUuid: string, charUuid: string, props: {
      isReadable: boolean;
      isWritableWithResponse: boolean;
      isWritableWithoutResponse: boolean;
      isNotifying: boolean;
      isIndicatable: boolean;
    }) => {
      navigation.navigate('Characteristic', {
        manager,
        deviceId,
        serviceUuid,
        characteristicUuid: charUuid,
        properties: props,
      });
    },
    [manager, deviceId, navigation],
  );

  const L2CAP_PSM_UUID = '12345678-1234-1234-1234-123456789A07';

  const openL2CAP = useCallback(async (serviceUuid: string) => {
    try {
      const result = await manager.readCharacteristicForDevice(
        deviceId, serviceUuid, L2CAP_PSM_UUID,
      );
      if (!result.value) {
        Alert.alert('L2CAP Error', 'PSM characteristic returned no value');
        return;
      }
      // Decode base64 uint16 LE — use simple lookup table
      const b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      const raw = result.value.replace(/=/g, '');
      const decoded: number[] = [];
      for (let i = 0; i < raw.length; i += 4) {
        const a = b64.indexOf(raw[i]);
        const b = b64.indexOf(raw[i + 1] || 'A');
        const c = b64.indexOf(raw[i + 2] || 'A');
        const d = b64.indexOf(raw[i + 3] || 'A');
        decoded.push((a << 2) | (b >> 4));
        if (raw[i + 2]) decoded.push(((b & 15) << 4) | (c >> 2));
        if (raw[i + 3]) decoded.push(((c & 3) << 6) | d);
      }
      const psm = decoded[0] | ((decoded[1] || 0) << 8);
      if (psm === 0) {
        Alert.alert('L2CAP Error', 'PSM is 0 — L2CAP server not ready');
        return;
      }
      navigation.navigate('L2CAP', { manager, deviceId, psm });
    } catch (e: any) {
      Alert.alert('L2CAP Error', e.message || String(e));
    }
  }, [manager, deviceId, navigation]);

  const isTestService = (uuid: string) =>
    uuid.toUpperCase() === TEST_SERVICE_UUID;

  return (
    <View style={styles.container}>
      <View style={styles.infoSection}>
        <Text testID="device-name" style={styles.deviceName}>{deviceName || 'Unknown Device'}</Text>
        <Text testID="device-id" style={styles.deviceId}>ID: {deviceId}</Text>
        {mtu != null && <Text testID="device-mtu" style={styles.mtuText}>MTU: {mtu}</Text>}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          testID="discover-btn"
          style={[styles.button, discovering && styles.buttonDisabled]}
          onPress={discoverServices}
          disabled={discovering}>
          <Text style={styles.buttonText}>
            {discovering ? 'Discovering...' : 'Discover Services'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="disconnect-btn"
          style={[styles.button, styles.disconnectButton]}
          onPress={disconnect}>
          <Text style={styles.buttonText}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      {Platform.OS === 'android' && (
        <View style={styles.mtuRequestSection}>
          <TouchableOpacity
            testID="request-mtu-btn"
            style={styles.button}
            onPress={requestMtu}>
            <Text style={styles.buttonText}>Request MTU 247</Text>
          </TouchableOpacity>
          {mtuRequestStatus != null && (
            <Text testID="mtu-request-status" style={styles.mtuStatusText}>
              {mtuRequestStatus}
            </Text>
          )}
        </View>
      )}

      {serviceUuids.length > 0 && (
        <FlatList
          testID="service-list"
          data={serviceUuids}
          keyExtractor={(item) => item}
          renderItem={({ item: svcUuid }) => (
            <View style={styles.serviceGroup}>
              <TouchableOpacity
                testID={isTestService(svcUuid) ? 'service-test' : `service-${svcUuid}`}
                onPress={() => setSelectedService(selectedService === svcUuid ? null : svcUuid)}
                style={styles.serviceHeader}>
                <Text style={styles.serviceUuid}>
                  {selectedService === svcUuid ? '▼' : '▶'} Service: {svcUuid}
                </Text>
                {isTestService(svcUuid) && (
                  <Text style={styles.testBadge}>TEST</Text>
                )}
              </TouchableOpacity>

              {selectedService === svcUuid && isTestService(svcUuid) && (
                <View testID="test-char-list" style={styles.charList}>
                  {TEST_CHARACTERISTICS.map(({ uuid: charUuid, testID, label, props }) => (
                    <TouchableOpacity
                      key={charUuid}
                      testID={testID}
                      style={styles.charRow}
                      onPress={() => charUuid.toUpperCase().endsWith('9A07')
                        ? openL2CAP(svcUuid)
                        : navigateToCharacteristic(svcUuid, charUuid, props)}>
                      <Text style={styles.charLabel}>{label}</Text>
                      <Text style={styles.charUuid}>{charUuid}</Text>
                      <Text style={styles.charProps}>
                        {[
                          props.isReadable && 'Read',
                          props.isWritableWithResponse && 'Write',
                          props.isNotifying && 'Notify',
                          props.isIndicatable && 'Indicate',
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {selectedService === svcUuid && !isTestService(svcUuid) && (
                <View style={styles.charList}>
                  <Text style={styles.unknownNote}>
                    Enter a characteristic UUID to interact with:
                  </Text>
                  <TextInput
                    testID="custom-char-input"
                    style={styles.textInput}
                    value={customCharUuid}
                    onChangeText={setCustomCharUuid}
                    placeholder="e.g. 00002a00-0000-1000-8000-00805f9b34fb"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    testID="custom-char-open-btn"
                    style={[styles.button, !customCharUuid && styles.buttonDisabled]}
                    disabled={!customCharUuid}
                    onPress={() =>
                      navigateToCharacteristic(svcUuid, customCharUuid, {
                        isReadable: true,
                        isWritableWithResponse: true,
                        isWritableWithoutResponse: false,
                        isNotifying: true,
                        isIndicatable: true,
                      })
                    }>
                    <Text style={styles.buttonText}>Open</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  infoSection: { marginBottom: 16 },
  deviceName: { fontSize: 20, fontWeight: '700' },
  deviceId: { fontSize: 13, color: '#888', marginTop: 4 },
  mtuText: { fontSize: 13, color: '#888', marginTop: 2 },
  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  mtuRequestSection: { marginBottom: 16 },
  mtuStatusText: { fontSize: 13, color: '#333', marginTop: 8 },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonDisabled: { backgroundColor: '#ccc' },
  disconnectButton: { backgroundColor: '#FF3B30' },
  buttonText: { color: '#fff', fontWeight: '600' },
  serviceGroup: { marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, overflow: 'hidden' },
  serviceHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f8f8f8' },
  serviceUuid: { fontSize: 13, fontWeight: '600', flex: 1 },
  testBadge: { fontSize: 10, fontWeight: '700', color: '#007AFF', backgroundColor: '#E8F0FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  charList: { padding: 12 },
  charRow: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  charLabel: { fontSize: 14, fontWeight: '600' },
  charUuid: { fontSize: 11, color: '#888', marginTop: 2 },
  charProps: { fontSize: 11, color: '#007AFF', marginTop: 2 },
  unknownNote: { fontSize: 13, color: '#666', marginBottom: 8 },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 8,
  },
});
