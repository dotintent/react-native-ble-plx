// config.h — BLE test peripheral configuration for react-native-ble-plx integration tests
// Target: Seeed XIAO nRF52840
// Platform: Adafruit nRF52 Arduino core (Bluefruit)
#ifndef CONFIG_H
#define CONFIG_H

// ─── Device Identity ───
#define DEVICE_NAME             "BlePlxTest"
#define FW_VERSION              "1.0.0"

// ─── Test Service UUID ───
#define TEST_SERVICE_UUID       "12345678-1234-1234-1234-123456789abc"

// ─── Characteristic UUIDs ───
// Read Counter: returns uint32_t that increments on each read
#define CHAR_READ_COUNTER_UUID  "12345678-1234-1234-1234-123456789a01"
// Write Echo: Read+Write; stores written bytes and returns them on read
// Requires bonding (LESC_MITM)
#define CHAR_WRITE_ECHO_UUID    "12345678-1234-1234-1234-123456789a02"
// Notify Stream: sends incrementing uint32_t every NOTIFY_INTERVAL_MS when subscribed
#define CHAR_NOTIFY_UUID        "12345678-1234-1234-1234-123456789a03"
// Indicate Stream: sends incrementing uint32_t every INDICATE_INTERVAL_MS when subscribed
// Waits for ATT-layer ACK before sending next value
#define CHAR_INDICATE_UUID      "12345678-1234-1234-1234-123456789a04"
// MTU Test: returns current negotiated MTU as uint16_t (little-endian)
#define CHAR_MTU_TEST_UUID      "12345678-1234-1234-1234-123456789a05"

// ─── Timing Defaults ───
#define NOTIFY_INTERVAL_MS      500     // ms between notify packets when subscribed
#define INDICATE_INTERVAL_MS    1000    // ms between indicate packets when subscribed

// ─── Advertising ───
#define ADV_FAST_INTERVAL       160     // 100ms in 0.625ms units (160 * 0.625 = 100ms)
#define ADV_SLOW_INTERVAL       244     // ~152ms in 0.625ms units
#define ADV_FAST_TIMEOUT_SEC    30      // seconds in fast mode before switching to slow

// ─── MTU ───
#define MTU_MAX                 517     // Maximum MTU to request/accept

// ─── Serial ───
#define SERIAL_BAUD             115200
#define SERIAL_BUF_SIZE         128     // bytes for incoming serial command buffer

// ─── Write Echo Max Length ───
// ATT MTU - 3 bytes overhead, rounded to a round number
#define ECHO_MAX_LEN            512

// ─── Connection LED ───
// XIAO nRF52840 has a built-in RGB LED; use the blue pin as "connected" indicator.
// On Adafruit core for XIAO nRF52840, LED_BUILTIN or LED_BLUE may be available.
// If neither resolves, define a safe fallback (PIN_LED1 is the blue LED on the XIAO).
#ifndef LED_CONN
  #if defined(LED_BLUE)
    #define LED_CONN  LED_BLUE
  #elif defined(LED_BUILTIN)
    #define LED_CONN  LED_BUILTIN
  #else
    #define LED_CONN  3   // P0.03 — blue LED on Seeed XIAO nRF52840
  #endif
#endif

// ─── LED polarity ───
// Most nRF52 boards drive LEDs active-LOW (LOW = on)
#define LED_ON  LOW
#define LED_OFF HIGH

#endif // CONFIG_H
