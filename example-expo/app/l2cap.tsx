import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useBleManager } from './_layout';

export default function L2CAPScreen() {
  const manager = useBleManager();
  const params = useLocalSearchParams<{ deviceId: string; psm: string }>();
  const deviceId = params.deviceId!;
  const psm = Number(params.psm);

  const [channelId, setChannelId] = useState<number | null>(null);
  const [writeData, setWriteData] = useState('');
  const [status, setStatus] = useState('Not connected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [rxData, setRxData] = useState<string | null>(null);
  const channelIdRef = useRef<number | null>(null);
  const rxSub = useRef<any>(null);

  useEffect(() => {
    return () => {
      rxSub.current?.remove();
      rxSub.current = null;
      if (channelIdRef.current != null) {
        manager.closeL2CAPChannel(channelIdRef.current).catch(() => {});
      }
    };
  }, [manager]);

  const openChannel = useCallback(async () => {
    try {
      setStatus('Opening...');
      setLastError(null);
      const result = await manager.openL2CAPChannel(deviceId, psm);
      setChannelId(result.channelId);
      channelIdRef.current = result.channelId;
      setStatus(`Connected (channel ${result.channelId})`);
      rxSub.current = manager.monitorL2CAPChannel(result.channelId, (_error: any, data: any) => {
        if (data?.data) {
          setRxData(data.data);
        }
      });
    } catch (e: any) {
      setLastError(e.message || String(e));
      setStatus('Failed');
      Alert.alert('L2CAP Error', e.message || String(e));
    }
  }, [manager, deviceId, psm]);

  const writeChannel = useCallback(async () => {
    if (channelId == null) return;
    try {
      setLastError(null);
      await manager.writeL2CAPChannel(channelId, writeData);
      setStatus(`Wrote ${writeData.length} chars`);
    } catch (e: any) {
      setLastError(e.message || String(e));
      Alert.alert('Write Error', e.message || String(e));
    }
  }, [manager, channelId, writeData]);

  const closeChannel = useCallback(async () => {
    if (channelId == null) return;
    const closingId = channelId;
    channelIdRef.current = null; // Prevent double-close from useEffect
    setChannelId(null);
    try {
      await manager.closeL2CAPChannel(closingId);
      rxSub.current?.remove();
      rxSub.current = null;
      setRxData(null);
      setStatus('Closed');
    } catch (e: any) {
      // Channel close failed -- still clean up subscription
      rxSub.current?.remove();
      rxSub.current = null;
      setLastError(e.message || String(e));
      setStatus('Close failed');
    }
  }, [manager, channelId]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>L2CAP Channel</Text>
      <Text testID="l2cap-psm" style={styles.info}>PSM: {psm}</Text>
      <Text testID="l2cap-device" style={styles.info}>Device: {deviceId}</Text>

      <Text testID="l2cap-status" style={styles.statusText}>
        Status: {status}
      </Text>

      {lastError && (
        <Text testID="l2cap-error" style={styles.errorText}>
          Error: {lastError}
        </Text>
      )}

      {channelId == null ? (
        <TouchableOpacity
          testID="l2cap-open-btn"
          style={styles.button}
          onPress={openChannel}>
          <Text style={styles.buttonText}>Open Channel</Text>
        </TouchableOpacity>
      ) : (
        <>
          <Text testID="l2cap-channel-id" style={styles.info}>
            Channel ID: {channelId}
          </Text>

          <View style={styles.writeSection}>
            <TextInput
              testID="l2cap-write-input"
              style={styles.textInput}
              value={writeData}
              onChangeText={setWriteData}
              placeholder="Base64 data to write"
            />
            <TouchableOpacity
              testID="l2cap-write-btn"
              style={styles.button}
              onPress={writeChannel}>
              <Text style={styles.buttonText}>Write</Text>
            </TouchableOpacity>
          </View>

          {rxData != null && (
            <Text testID="l2cap-rx-data" style={styles.info}>
              Received: {rxData}
            </Text>
          )}

          <TouchableOpacity
            testID="l2cap-close-btn"
            style={[styles.button, styles.closeButton]}
            onPress={closeChannel}>
            <Text style={styles.buttonText}>Close Channel</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  info: { fontSize: 13, color: '#888', marginTop: 4 },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorText: { fontSize: 13, color: '#FF3B30', marginBottom: 8 },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  closeButton: { backgroundColor: '#FF3B30' },
  buttonText: { color: '#fff', fontWeight: '600' },
  writeSection: { marginTop: 12 },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 8,
  },
});
