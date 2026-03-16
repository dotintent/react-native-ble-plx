import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import type { ScanResult } from 'react-native-ble-plx';
import { useBleManager } from './_layout';

async function requestAndroidPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return Object.values(granted).every(
      (v) => v === PermissionsAndroid.RESULTS.GRANTED,
    );
  } catch {
    return false;
  }
}

export default function ScanScreen() {
  const manager = useBleManager();
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [bleState, setBleState] = useState<string>('Unknown');
  const [devices, setDevices] = useState<Map<string, ScanResult>>(new Map());
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [scanError, setScanError] = useState<string | null>(null);
  const devicesRef = useRef<Map<string, ScanResult>>(new Map());

  const TEST_SERVICE_UUID = '12345678-1234-1234-1234-123456789ABC';

  useEffect(() => {
    const sub = manager.onStateChange((state: string) => {
      setBleState(state);
    }, true);

    requestAndroidPermissions().then((ok) => {
      if (!ok) {
        setScanError('BLE permissions not granted');
        Alert.alert('Permissions', 'BLE permissions not granted');
      }
    });

    return () => sub.remove();
  }, [manager]);

  const startScan = useCallback(() => {
    manager.stopDeviceScan();
    devicesRef.current = new Map();
    setDevices(new Map());
    setScanning(true);
    setConnectionStatus('');
    setScanError(null);

    const uuids = filterEnabled ? [TEST_SERVICE_UUID] : null;
    manager.startDeviceScan(uuids, null, (error: any, result: ScanResult | null) => {
      if (error) {
        console.warn('Scan error:', error);
        setScanError(error.message || String(error));
        setScanning(false);
        return;
      }
      if (result) {
        devicesRef.current.set(result.id, result);
        setDevices(new Map(devicesRef.current));
      }
    });
  }, [manager, filterEnabled]);

  const stopScan = useCallback(() => {
    manager.stopDeviceScan();
    setScanning(false);
  }, [manager]);

  const connectToDevice = useCallback(
    async (device: ScanResult) => {
      setConnectionStatus(`Connecting to ${device.name || device.id}...`);
      stopScan();
      try {
        // Check if already connected -- if so, just navigate
        const connected = await manager.isDeviceConnected(device.id);
        if (connected) {
          setConnectionStatus('Already connected, navigating...');
          router.push({
            pathname: '/device',
            params: { deviceId: device.id, deviceName: device.name ?? '' },
          });
          return;
        }
        const result = await manager.connectToDevice(device.id);
        setConnectionStatus('Connected!');
        router.push({
          pathname: '/device',
          params: { deviceId: result.id, deviceName: result.name ?? '' },
        });
      } catch (e: any) {
        setConnectionStatus(`Error: ${e.message || String(e)}`);
        Alert.alert('Connection Error', e.message || String(e));
      }
    },
    [manager, router, stopScan],
  );

  const deviceList = Array.from(devices.values())
    .filter((d) => {
      if (!searchText) return true;
      const q = searchText.toLowerCase();
      return d.name?.toLowerCase().includes(q) || d.id.toLowerCase().includes(q);
    })
    .sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999));

  return (
    <View style={styles.container}>
      <Text testID="app-title" style={styles.titleText}>
        BLE Scanner ({Platform.OS})
      </Text>
      <Text testID="ble-state" style={styles.stateText}>BLE State: {bleState}</Text>

      {connectionStatus ? (
        <Text testID="connection-status" style={styles.statusText}>{connectionStatus}</Text>
      ) : null}

      {scanError && (
        <Text testID="scan-error" style={styles.errorText}>
          {scanError}
        </Text>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          testID="scan-start-btn"
          style={[styles.button, scanning && styles.buttonDisabled]}
          onPress={startScan}
          disabled={scanning}>
          <Text style={styles.buttonText}>Start Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="scan-stop-btn"
          style={[styles.button, !scanning && styles.buttonDisabled]}
          onPress={stopScan}
          disabled={!scanning}>
          <Text style={styles.buttonText}>Stop Scan</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        testID="scan-search"
        style={styles.searchInput}
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Search by name or ID..."
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />

      <TouchableOpacity
        testID="scan-filter-btn"
        style={[styles.filterButton, filterEnabled && styles.filterActive]}
        onPress={() => setFilterEnabled(!filterEnabled)}>
        <Text style={[styles.filterText, filterEnabled && styles.filterTextActive]}>
          {filterEnabled ? 'Filter: Test Service UUID' : 'Filter: None'}
        </Text>
      </TouchableOpacity>

      <Text testID="device-count" style={styles.countText}>
        {deviceList.length} device(s) found
      </Text>

      <View testID="device-list">
        {deviceList.map((item) => (
          <Pressable
            key={item.id}
            testID={item.name ? `device-${item.name}` : `device-item-${item.id}`}
            style={({ pressed }) => [
              styles.deviceRow,
              pressed && styles.deviceRowPressed,
            ]}
            onPress={() => connectToDevice(item)}>
            <Text style={styles.deviceName}>
              {item.name || 'Unknown Device'}
            </Text>
            <Text style={styles.deviceId}>{item.id}</Text>
            <Text style={styles.deviceRssi}>RSSI: {item.rssi}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  titleText: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  stateText: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  statusText: { fontSize: 14, fontWeight: '500', color: '#007AFF', marginBottom: 8, padding: 8, backgroundColor: '#E8F0FE', borderRadius: 6 },
  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontWeight: '600' },
  filterButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#ccc', alignSelf: 'flex-start', marginBottom: 8 },
  filterActive: { borderColor: '#007AFF', backgroundColor: '#E8F0FE' },
  filterText: { fontSize: 12, color: '#888' },
  filterTextActive: { color: '#007AFF', fontWeight: '600' },
  searchInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 8 },
  countText: { fontSize: 14, color: '#666', marginBottom: 8 },
  deviceRow: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deviceRowPressed: {
    backgroundColor: '#f0f0f0',
  },
  deviceName: { fontSize: 16, fontWeight: '500' },
  deviceId: { fontSize: 12, color: '#888', marginTop: 2 },
  deviceRssi: { fontSize: 12, color: '#888', marginTop: 2 },
  errorText: { fontSize: 14, color: '#FF3B30', marginBottom: 8, padding: 8, backgroundColor: '#FDE8E8', borderRadius: 6 },
});
