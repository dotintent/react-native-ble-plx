import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { BleManager } from 'react-native-ble-plx';

// Singleton BleManager — created once at module level
const bleManager = new BleManager();

/** Access the shared BleManager instance from any screen. */
export function useBleManager(): BleManager {
  return bleManager;
}

export default function RootLayout() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      bleManager.createClient().catch((e: any) => {
        console.warn('Failed to create BLE client:', e);
      });
    }

    return () => {
      bleManager.destroyClient().catch(() => {});
    };
  }, []);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'BLE Scanner' }} />
      <Stack.Screen name="device" options={{ title: 'Device' }} />
      <Stack.Screen name="characteristic" options={{ title: 'Characteristic' }} />
      <Stack.Screen name="l2cap" options={{ title: 'L2CAP Channel' }} />
    </Stack>
  );
}
