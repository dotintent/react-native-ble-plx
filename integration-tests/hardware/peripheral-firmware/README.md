# Peripheral Firmware for Hardware Integration Tests

This directory holds firmware or firmware instructions for the BLE peripheral
device used during hardware-in-the-loop testing.

## What is needed

The hardware tests (Maestro flows) require a BLE peripheral that exposes at
minimum the following GATT profile:

### Required services and characteristics

| Service UUID | Characteristic UUID | Properties | Description |
|---|---|---|---|
| `0000180d-0000-1000-8000-00805f9b34fb` | `00002a37-0000-1000-8000-00805f9b34fb` | Read, Notify | Heart Rate Measurement (test notify flow) |
| `0000180d-0000-1000-8000-00805f9b34fb` | `00002a38-0000-1000-8000-00805f9b34fb` | Read | Body Sensor Location |
| `0000fff0-0000-1000-8000-00805f9b34fb` | `0000fff1-0000-1000-8000-00805f9b34fb` | Write With Response | Writable test characteristic |
| `0000fff0-0000-1000-8000-00805f9b34fb` | `0000fff2-0000-1000-8000-00805f9b34fb` | Indicate | Indicate stress-test characteristic |

### Advertising

- Device name: `BlePlxTest` (exactly — Maestro flows match on this name)
- Connectable: yes
- Manufacturer data: `0x4254 0x01 0x00` (BlePlx Test marker, version 1.0)

## Supported firmware platforms

The tests are designed to work with any of the following:

- **nRF52840 DK / nRF52840 Dongle** running a Zephyr GATT sample
  (recommended — widely available, USB-programmable)
- **ESP32** running an Arduino BLE sketch
- **Any iOS/Android device** running the nRF Connect app configured as a GATT
  server with the profile above (no dedicated hardware required for initial
  bringup)

## Implementing notify / indicate

The `0000fff2` indicate characteristic must send a new value every 250 ms when
a client enables indications. This exercises the indicate stress-test flow.

The `00002a37` notify characteristic should cycle through dummy heart-rate
values (60–120 bpm) at 1 Hz.

## Running the firmware

Instructions depend on the chosen platform. See the nRF Connect SDK or ESP32
Arduino BLE documentation for steps to flash and verify the peripheral is
advertising.

Once the peripheral is advertising, run the Maestro flows from the `maestro/`
directory:

```sh
maestro test integration-tests/hardware/maestro/scan-pair-sync.yaml
```
