import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { Subscription } from 'react-native-ble-plx';
import { useBleManager } from './_layout';

function base64ByteLength(b64: string): number {
  const padding = (b64.match(/=+$/) || [''])[0].length;
  return Math.floor((b64.length * 3) / 4) - padding;
}

export default function CharacteristicScreen() {
  const manager = useBleManager();
  const params = useLocalSearchParams<{
    deviceId: string;
    serviceUuid: string;
    characteristicUuid: string;
    properties: string;
  }>();

  const { deviceId, serviceUuid, characteristicUuid } = params;
  const properties = JSON.parse(params.properties || '{}') as {
    isReadable: boolean;
    isWritableWithResponse: boolean;
    isWritableWithoutResponse: boolean;
    isNotifying: boolean;
    isIndicatable: boolean;
  };

  const [value, setValue] = useState<string>('(none)');
  const [writeValue, setWriteValue] = useState('');
  const [monitoring, setMonitoring] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);
  const [distinctCount, setDistinctCount] = useState(0);
  const [stoppedAtCount, setStoppedAtCount] = useState<number | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [payloadLength, setPayloadLength] = useState<number | null>(null);
  const monitorSub = useRef<Subscription | null>(null);
  const sampleCountRef = useRef(0);
  const seenValues = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      monitorSub.current?.remove();
    };
  }, []);

  const readCharacteristic = useCallback(async () => {
    try {
      const result = await manager.readCharacteristicForDevice(
        deviceId!,
        serviceUuid!,
        characteristicUuid!,
      );
      const readValue = result.value ?? '(null)';
      setValue(readValue);
      if (result.value) {
        setPayloadLength(base64ByteLength(result.value));
      }
    } catch (e: any) {
      Alert.alert('Read Error', e.message || String(e));
    }
  }, [manager, deviceId, serviceUuid, characteristicUuid]);

  const writeCharacteristic = useCallback(async () => {
    try {
      await manager.writeCharacteristicForDevice(
        deviceId!,
        serviceUuid!,
        characteristicUuid!,
        writeValue,
        properties.isWritableWithResponse,
      );
      setWriteError(null);
      Alert.alert('Write', 'Value written successfully');
    } catch (e: any) {
      setWriteError(e.message || String(e));
      Alert.alert('Write Error', e.message || String(e));
    }
  }, [manager, deviceId, serviceUuid, characteristicUuid, writeValue, properties]);

  const toggleMonitor = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        // Reset counters
        setSampleCount(0);
        setDistinctCount(0);
        setStoppedAtCount(null);
        sampleCountRef.current = 0;
        seenValues.current = new Set();

        monitorSub.current = manager.monitorCharacteristicForDevice(
          deviceId!,
          serviceUuid!,
          characteristicUuid!,
          (error: any, event: any) => {
            if (error) {
              console.warn('Monitor error:', error);
              setMonitoring(false);
              return;
            }
            if (event) {
              setValue(event.value);
              sampleCountRef.current += 1;
              setSampleCount((c) => c + 1);
              if (!seenValues.current.has(event.value)) {
                seenValues.current.add(event.value);
                setDistinctCount((c) => c + 1);
              }
            }
          },
        );
        setMonitoring(true);
      } else {
        monitorSub.current?.remove();
        monitorSub.current = null;
        setStoppedAtCount(sampleCountRef.current);
        setMonitoring(false);
      }
    },
    [manager, deviceId, serviceUuid, characteristicUuid],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Characteristic</Text>
      <Text testID="char-uuid" style={styles.uuid}>{characteristicUuid}</Text>
      <Text testID="char-service-uuid" style={styles.service}>Service: {serviceUuid}</Text>

      <View style={styles.propsRow}>
        <Text style={styles.propLabel}>Properties:</Text>
        <Text testID="char-properties" style={styles.propValue}>
          {[
            properties.isReadable && 'Readable',
            properties.isWritableWithResponse && 'Writable (response)',
            properties.isWritableWithoutResponse && 'Writable (no response)',
            properties.isNotifying && 'Notifiable',
            properties.isIndicatable && 'Indicatable',
          ]
            .filter(Boolean)
            .join(', ') || 'None'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text testID="value-display" style={styles.valueText}>
          Value: {value}
        </Text>
      </View>

      {payloadLength != null && (
        <Text testID="payload-length" style={styles.counterText}>
          Payload: {payloadLength} bytes
        </Text>
      )}

      {/* E2E instrumentation: sample and distinct counts for monitor assertions */}
      {(properties.isNotifying || properties.isIndicatable) && (
        <View style={styles.countersRow}>
          <Text testID="sample-count" style={styles.counterText}>
            Samples: {sampleCount}
          </Text>
          <Text testID="distinct-count" style={styles.counterText}>
            Distinct: {distinctCount}
          </Text>
        </View>
      )}

      {stoppedAtCount != null && (
        <Text testID="monitor-stopped-check" style={styles.counterText}>
          {sampleCount <= stoppedAtCount + 1 ? 'Monitor: STOPPED' : 'Monitor: LEAKED'}
        </Text>
      )}

      {properties.isReadable && (
        <TouchableOpacity
          testID="read-btn"
          style={styles.button}
          onPress={readCharacteristic}>
          <Text style={styles.buttonText}>Read</Text>
        </TouchableOpacity>
      )}

      {(properties.isWritableWithResponse ||
        properties.isWritableWithoutResponse) && (
        <View style={styles.writeSection}>
          <TextInput
            testID="write-input"
            style={styles.textInput}
            value={writeValue}
            onChangeText={setWriteValue}
            placeholder="Base64 value to write"
          />
          <View style={styles.presetRow}>
            <TouchableOpacity testID="write-1byte-btn" style={styles.presetButton}
              onPress={() => setWriteValue('QQ==')}>
              <Text style={styles.presetText}>1 byte</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="write-20byte-btn" style={styles.presetButton}
              onPress={() => setWriteValue('QUJDREVGR0hJSktMTU5PUFFSU1Q=')}>
              <Text style={styles.presetText}>20 bytes</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            testID="write-btn"
            style={styles.button}
            onPress={writeCharacteristic}>
            <Text style={styles.buttonText}>Write</Text>
          </TouchableOpacity>
          {writeError && (
            <Text testID="write-error" style={styles.errorText}>
              {writeError}
            </Text>
          )}
        </View>
      )}

      {(properties.isNotifying || properties.isIndicatable) && (
        <View style={styles.monitorRow}>
          <Text style={styles.monitorLabel}>Monitor</Text>
          <Switch
            testID="monitor-toggle"
            value={monitoring}
            onValueChange={toggleMonitor}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  uuid: { fontSize: 13, color: '#888', marginTop: 4 },
  service: { fontSize: 12, color: '#aaa', marginTop: 2 },
  propsRow: { marginTop: 12 },
  propLabel: { fontSize: 14, fontWeight: '600' },
  propValue: { fontSize: 13, color: '#555', marginTop: 2 },
  section: { marginTop: 16, marginBottom: 12 },
  valueText: { fontSize: 16, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  countersRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  counterText: { fontSize: 13, color: '#666', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  writeSection: { marginTop: 12 },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  presetRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  presetButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#007AFF', backgroundColor: '#E8F0FE' },
  presetText: { fontSize: 12, color: '#007AFF', fontWeight: '600' },
  monitorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingVertical: 8,
  },
  monitorLabel: { fontSize: 16, fontWeight: '600' },
  errorText: { fontSize: 13, color: '#FF3B30', marginTop: 8 },
});
