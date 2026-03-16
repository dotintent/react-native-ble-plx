// ble_test_peripheral.ino — BLE test peripheral for react-native-ble-plx integration tests
//
// Target:   Seeed XIAO nRF52840
// Platform: Adafruit nRF52 Arduino core (Bluefruit)
//
// GATT service exposes five characteristics covering the main BLE operations
// that react-native-ble-plx exercises: plain read, authenticated write, notify,
// indicate, and MTU negotiation.
//
// Serial interface (115200 baud) lets a test harness control the peripheral:
//   status            — print connection state, MTU, subscription flags
//   disconnect        — force-disconnect the current central
//   set <hex>         — set the echo characteristic value (hex bytes, no spaces)
//   notify-rate <ms>  — change the notify interval
//   indicate-rate <ms>— change the indicate interval
//   reset             — clear bonds and restart BLE stack

#include "config.h"
#include <bluefruit.h>

// ─── GATT Objects ───

static BLEService        svc(TEST_SERVICE_UUID);
static BLECharacteristic chrReadCounter(CHAR_READ_COUNTER_UUID);
static BLECharacteristic chrWriteEcho(CHAR_WRITE_ECHO_UUID);
static BLECharacteristic chrNotify(CHAR_NOTIFY_UUID);
static BLECharacteristic chrIndicate(CHAR_INDICATE_UUID);
static BLECharacteristic chrMtu(CHAR_MTU_TEST_UUID);

// ─── State ───

static bool     g_connected        = false;
static uint16_t g_conn_handle      = BLE_CONN_HANDLE_INVALID;
static uint16_t g_mtu              = 23;  // default BLE 4.0 ATT MTU

static uint32_t g_read_counter     = 0;   // increments on each read of chrReadCounter

static uint8_t  g_echo_buf[ECHO_MAX_LEN];
static uint16_t g_echo_len         = 0;

static uint32_t g_notify_counter   = 0;
static uint32_t g_indicate_counter = 0;
static bool     g_notify_subscribed   = false;
static bool     g_indicate_subscribed = false;
static bool     g_indicate_pending    = false;  // waiting for ATT-layer ACK

static uint32_t g_notify_interval  = NOTIFY_INTERVAL_MS;
static uint32_t g_indicate_interval = INDICATE_INTERVAL_MS;
static uint32_t g_last_notify_ms   = 0;
static uint32_t g_last_indicate_ms = 0;

// ─── Serial command buffer ───
static char    g_serial_buf[SERIAL_BUF_SIZE];
static uint8_t g_serial_pos = 0;

// ─── Forward Declarations ───

static void ble_init();
static void ble_start_advertising();
static void connect_callback(uint16_t conn_handle);
static void disconnect_callback(uint16_t conn_handle, uint8_t reason);
static void mtu_changed_callback(uint16_t conn_handle, uint16_t mtu);
static void notify_cccd_callback(uint16_t conn_handle, BLECharacteristic* chr,
                                 uint16_t value);
static void indicate_cccd_callback(uint16_t conn_handle, BLECharacteristic* chr,
                                   uint16_t value);
static void indicate_confirm_callback(uint16_t conn_handle, BLECharacteristic* chr);
static void echo_write_callback(uint16_t conn_handle, BLECharacteristic* chr,
                                uint8_t* data, uint16_t len);
static uint16_t read_counter_authorize_callback(uint16_t conn_handle,
                                                BLECharacteristic* chr,
                                                ble_gatts_evt_read_t* request);
static void process_serial_cmd(const char* cmd);
static void print_status();

// ─── Setup ───────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(SERIAL_BAUD);
  // Brief wait for host to open the serial port (USB CDC).
  // Not required for normal operation — skip if no host is attached.
  for (int i = 0; i < 20 && !Serial; i++) delay(50);

  Serial.println("=== BLE Test Peripheral ===");
  Serial.print("Device: ");
  Serial.println(DEVICE_NAME);
  Serial.print("Firmware: ");
  Serial.println(FW_VERSION);

  // Connection LED: off at start
  pinMode(LED_CONN, OUTPUT);
  digitalWrite(LED_CONN, LED_OFF);

  // Initialize echo buffer with a default string
  const char* default_echo = "echo";
  g_echo_len = strlen(default_echo);
  memcpy(g_echo_buf, default_echo, g_echo_len);

  ble_init();
  ble_start_advertising();

  Serial.println("[MAIN] Ready. Type 'status' for current state.");
}

// ─── Loop ────────────────────────────────────────────────────────────────────

void loop() {
  // ── Serial command processing ──
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (g_serial_pos > 0) {
        g_serial_buf[g_serial_pos] = '\0';
        process_serial_cmd(g_serial_buf);
        g_serial_pos = 0;
      }
    } else if (g_serial_pos < SERIAL_BUF_SIZE - 1) {
      g_serial_buf[g_serial_pos++] = c;
    }
  }

  if (!g_connected) return;

  uint32_t now = millis();

  // ── Notify stream ──
  if (g_notify_subscribed && (now - g_last_notify_ms >= g_notify_interval)) {
    g_last_notify_ms = now;
    uint32_t val = g_notify_counter++;
    if (!chrNotify.notify(g_conn_handle, (uint8_t*)&val, 4)) {
      // Central may have unsubscribed or disconnected; not fatal
    }
  }

  // ── Indicate stream ──
  // Only send when subscribed and not waiting for the previous ACK
  if (g_indicate_subscribed && !g_indicate_pending &&
      (now - g_last_indicate_ms >= g_indicate_interval)) {
    g_last_indicate_ms = now;
    uint32_t val = g_indicate_counter++;
    g_indicate_pending = true;
    if (!chrIndicate.indicate(g_conn_handle, (uint8_t*)&val, 4)) {
      g_indicate_pending = false;
    }
  }
}

// ─── BLE Initialization ──────────────────────────────────────────────────────

static void ble_init() {
  Bluefruit.begin();
  Bluefruit.setName(DEVICE_NAME);
  Bluefruit.setTxPower(4);

  // Accept up to MTU_MAX from the central
  Bluefruit.setMaxMtu(MTU_MAX);

  // Connection / disconnection callbacks
  Bluefruit.Periph.setConnectCallback(connect_callback);
  Bluefruit.Periph.setDisconnectCallback(disconnect_callback);

  // MTU negotiation result callback
  Bluefruit.setMtuCallback(mtu_changed_callback);

  // ── Security: support Just Works pairing, persist bonds ──
  // NoInputNoOutput means Just Works (no passkey display or entry).
  Bluefruit.Security.setIOCaps(false, false, false);
  Bluefruit.Security.setMITM(false);
  // Auto-accept pairing requests from the central
  Bluefruit.Security.setAutoAcceptPairing(true);

  // ── GATT Service ──
  svc.begin();

  // ── Read Counter (Read, open) ──
  // Uses a read-authorize callback so we can increment the counter on each read
  // and return the updated value atomically.
  chrReadCounter.setProperties(CHR_PROPS_READ);
  chrReadCounter.setPermission(SECMODE_OPEN, SECMODE_NO_ACCESS);
  chrReadCounter.setFixedLen(4);
  chrReadCounter.setReadAuthorizeCallback(read_counter_authorize_callback);
  chrReadCounter.begin();
  uint32_t init_counter = 0;
  chrReadCounter.write((uint8_t*)&init_counter, 4);

  // ── Write Echo (Read + Write, bonded / encrypted) ──
  // Writes require encryption (bonding). Reads are also encrypted.
  chrWriteEcho.setProperties(CHR_PROPS_READ | CHR_PROPS_WRITE);
  chrWriteEcho.setPermission(SECMODE_ENC_NO_MITM, SECMODE_ENC_NO_MITM);
  chrWriteEcho.setMaxLen(ECHO_MAX_LEN);
  chrWriteEcho.setWriteCallback(echo_write_callback);
  chrWriteEcho.begin();
  chrWriteEcho.write(g_echo_buf, g_echo_len);

  // ── Notify Stream (Notify, open) ──
  chrNotify.setProperties(CHR_PROPS_NOTIFY);
  chrNotify.setPermission(SECMODE_OPEN, SECMODE_NO_ACCESS);
  chrNotify.setFixedLen(4);
  chrNotify.setCccdWriteCallback(notify_cccd_callback);
  chrNotify.begin();

  // ── Indicate Stream (Indicate, open) ──
  chrIndicate.setProperties(CHR_PROPS_INDICATE);
  chrIndicate.setPermission(SECMODE_OPEN, SECMODE_NO_ACCESS);
  chrIndicate.setFixedLen(4);
  chrIndicate.setCccdWriteCallback(indicate_cccd_callback);
  chrIndicate.setIndicateCallback(indicate_confirm_callback);
  chrIndicate.begin();

  // ── MTU Test (Read, open) ──
  chrMtu.setProperties(CHR_PROPS_READ);
  chrMtu.setPermission(SECMODE_OPEN, SECMODE_NO_ACCESS);
  chrMtu.setFixedLen(2);
  chrMtu.begin();
  uint16_t init_mtu = 23;
  chrMtu.write((uint8_t*)&init_mtu, 2);

  Serial.println("[BLE] GATT service initialized");
}

static void ble_start_advertising() {
  Bluefruit.Advertising.clearData();
  Bluefruit.ScanResponse.clearData();

  Bluefruit.Advertising.addFlags(BLE_GAP_ADV_FLAGS_LE_ONLY_GENERAL_DISC_MODE);
  Bluefruit.Advertising.addTxPower();
  Bluefruit.Advertising.addService(svc);

  // Full device name in scan response (may not fit in the 31-byte ADV payload)
  Bluefruit.ScanResponse.addName();

  Bluefruit.Advertising.restartOnDisconnect(true);
  Bluefruit.Advertising.setInterval(ADV_FAST_INTERVAL, ADV_SLOW_INTERVAL);
  Bluefruit.Advertising.setFastTimeout(ADV_FAST_TIMEOUT_SEC);
  Bluefruit.Advertising.start(0);  // 0 = advertise indefinitely

  Serial.println("[BLE] Advertising started");
}

// ─── Connection Callbacks ─────────────────────────────────────────────────────

static void connect_callback(uint16_t conn_handle) {
  g_connected   = true;
  g_conn_handle = conn_handle;

  // Reset stream counters and subscription state for the new connection
  g_notify_counter      = 0;
  g_indicate_counter    = 0;
  g_notify_subscribed   = false;
  g_indicate_subscribed = false;
  g_indicate_pending    = false;
  g_last_notify_ms      = millis();
  g_last_indicate_ms    = millis();

  // Update MTU characteristic with the post-connection default (23) until
  // the MTU exchange completes and mtu_changed_callback fires.
  g_mtu = 23;
  chrMtu.write((uint8_t*)&g_mtu, 2);

  digitalWrite(LED_CONN, LED_ON);

  Serial.print("[BLE] Connected, handle=");
  Serial.println(conn_handle);
}

static void disconnect_callback(uint16_t conn_handle, uint8_t reason) {
  g_connected   = false;
  g_conn_handle = BLE_CONN_HANDLE_INVALID;

  g_notify_subscribed   = false;
  g_indicate_subscribed = false;
  g_indicate_pending    = false;

  digitalWrite(LED_CONN, LED_OFF);

  Serial.print("[BLE] Disconnected, reason=0x");
  Serial.println(reason, HEX);
}

static void mtu_changed_callback(uint16_t conn_handle, uint16_t mtu) {
  g_mtu = mtu;
  // Update the MTU Test characteristic so the central can read back the
  // actual negotiated MTU.
  chrMtu.write((uint8_t*)&mtu, 2);

  Serial.print("[BLE] MTU updated: ");
  Serial.println(mtu);
}

// ─── CCCD Callbacks ──────────────────────────────────────────────────────────

static void notify_cccd_callback(uint16_t conn_handle, BLECharacteristic* chr,
                                  uint16_t value) {
  g_notify_subscribed = (value == BLE_GATT_HVX_NOTIFICATION);
  g_notify_counter    = 0;
  g_last_notify_ms    = millis();

  Serial.print("[BLE] Notify subscribed: ");
  Serial.println(g_notify_subscribed ? "YES" : "NO");
}

static void indicate_cccd_callback(uint16_t conn_handle, BLECharacteristic* chr,
                                    uint16_t value) {
  g_indicate_subscribed = (value == BLE_GATT_HVX_INDICATION);
  g_indicate_counter    = 0;
  g_indicate_pending    = false;
  g_last_indicate_ms    = millis();

  Serial.print("[BLE] Indicate subscribed: ");
  Serial.println(g_indicate_subscribed ? "YES" : "NO");
}

// ─── Indicate ACK Callback ───────────────────────────────────────────────────

static void indicate_confirm_callback(uint16_t conn_handle, BLECharacteristic* chr) {
  // ATT-layer confirmation received — clear the pending flag so the next
  // value can be sent in the next loop iteration.
  g_indicate_pending = false;
}

// ─── Write Echo Callback ─────────────────────────────────────────────────────

static void echo_write_callback(uint16_t conn_handle, BLECharacteristic* chr,
                                 uint8_t* data, uint16_t len) {
  if (len == 0 || len > ECHO_MAX_LEN) {
    Serial.print("[BLE] Echo write: invalid length ");
    Serial.println(len);
    return;
  }

  memcpy(g_echo_buf, data, len);
  g_echo_len = len;

  // Persist in the characteristic so subsequent reads return the new value
  chrWriteEcho.write(g_echo_buf, g_echo_len);

  Serial.print("[BLE] Echo write: ");
  Serial.print(len);
  Serial.println(" bytes");
}

// ─── Read Counter Authorize Callback ─────────────────────────────────────────
// The Bluefruit read-authorize callback lets us mutate the characteristic value
// before the stack sends the response.  We increment the counter here so each
// read returns a distinct value.

static uint16_t read_counter_authorize_callback(uint16_t conn_handle,
                                                 BLECharacteristic* chr,
                                                 ble_gatts_evt_read_t* request) {
  // Increment and write back so the ATT response includes the new value
  g_read_counter++;
  chrReadCounter.write((uint8_t*)&g_read_counter, 4);

  Serial.print("[BLE] Read counter -> ");
  Serial.println(g_read_counter);

  // Return 0 to accept the read (stack will send the updated value)
  return 0;
}

// ─── Serial Command Processing ───────────────────────────────────────────────

static void print_status() {
  Serial.println("--- Status ---");
  Serial.print("Connected:        ");
  Serial.println(g_connected ? "YES" : "NO");
  if (g_connected) {
    Serial.print("Conn handle:      ");
    Serial.println(g_conn_handle);
    Serial.print("MTU:              ");
    Serial.println(g_mtu);
  }
  Serial.print("Notify subscribed:  ");
  Serial.println(g_notify_subscribed ? "YES" : "NO");
  Serial.print("Indicate subscribed:");
  Serial.println(g_indicate_subscribed ? "YES" : "NO");
  Serial.print("Notify interval:  ");
  Serial.print(g_notify_interval);
  Serial.println(" ms");
  Serial.print("Indicate interval:");
  Serial.print(g_indicate_interval);
  Serial.println(" ms");
  Serial.print("Read counter:     ");
  Serial.println(g_read_counter);
  Serial.print("Echo length:      ");
  Serial.println(g_echo_len);
  Serial.println("--------------");
}

// Parse a hex string (no spaces) into a byte buffer.
// Returns the number of bytes written, or 0 on error.
static uint8_t hex_to_bytes(const char* hex, uint8_t* out, uint8_t out_max) {
  uint8_t len = strlen(hex);
  if (len == 0 || len % 2 != 0) return 0;
  uint8_t count = len / 2;
  if (count > out_max) count = out_max;
  for (uint8_t i = 0; i < count; i++) {
    char hi = hex[i * 2];
    char lo = hex[i * 2 + 1];
    // Convert hex nibble to value
    auto nibble = [](char c) -> int8_t {
      if (c >= '0' && c <= '9') return c - '0';
      if (c >= 'a' && c <= 'f') return c - 'a' + 10;
      if (c >= 'A' && c <= 'F') return c - 'A' + 10;
      return -1;
    };
    int8_t h = nibble(hi);
    int8_t l = nibble(lo);
    if (h < 0 || l < 0) return 0;
    out[i] = (uint8_t)((h << 4) | l);
  }
  return count;
}

static void process_serial_cmd(const char* cmd) {
  Serial.print("[CMD] ");
  Serial.println(cmd);

  // ── status ──
  if (strcmp(cmd, "status") == 0) {
    print_status();
    return;
  }

  // ── disconnect ──
  if (strcmp(cmd, "disconnect") == 0) {
    if (!g_connected) {
      Serial.println("[CMD] Not connected");
      return;
    }
    BLEConnection* conn = Bluefruit.Connection(g_conn_handle);
    if (conn) conn->disconnect();
    Serial.println("[CMD] Disconnect requested");
    return;
  }

  // ── reset ──
  if (strcmp(cmd, "reset") == 0) {
    Serial.println("[CMD] Clearing bonds and restarting BLE...");
    if (g_connected) {
      BLEConnection* conn = Bluefruit.Connection(g_conn_handle);
      if (conn) conn->disconnect();
      delay(200);
    }
    Bluefruit.clearBonds();
    delay(100);
    Bluefruit.Advertising.stop();
    delay(100);
    ble_start_advertising();
    Serial.println("[CMD] BLE restarted");
    return;
  }

  // ── set <hex> ──
  if (strncmp(cmd, "set ", 4) == 0) {
    const char* hex = cmd + 4;
    uint8_t tmp[ECHO_MAX_LEN];
    uint8_t n = hex_to_bytes(hex, tmp, ECHO_MAX_LEN);
    if (n == 0) {
      Serial.println("[CMD] set: invalid hex (must be even number of hex digits)");
      return;
    }
    memcpy(g_echo_buf, tmp, n);
    g_echo_len = n;
    chrWriteEcho.write(g_echo_buf, g_echo_len);
    Serial.print("[CMD] Echo set to ");
    Serial.print(n);
    Serial.println(" bytes");
    return;
  }

  // ── notify-rate <ms> ──
  if (strncmp(cmd, "notify-rate ", 12) == 0) {
    long ms = atol(cmd + 12);
    if (ms < 10 || ms > 60000) {
      Serial.println("[CMD] notify-rate: value must be 10-60000 ms");
      return;
    }
    g_notify_interval = (uint32_t)ms;
    Serial.print("[CMD] Notify interval -> ");
    Serial.print(g_notify_interval);
    Serial.println(" ms");
    return;
  }

  // ── indicate-rate <ms> ──
  if (strncmp(cmd, "indicate-rate ", 14) == 0) {
    long ms = atol(cmd + 14);
    if (ms < 10 || ms > 60000) {
      Serial.println("[CMD] indicate-rate: value must be 10-60000 ms");
      return;
    }
    g_indicate_interval = (uint32_t)ms;
    Serial.print("[CMD] Indicate interval -> ");
    Serial.print(g_indicate_interval);
    Serial.println(" ms");
    return;
  }

  Serial.println("[CMD] Unknown command. Available:");
  Serial.println("  status");
  Serial.println("  disconnect");
  Serial.println("  set <hex>");
  Serial.println("  notify-rate <ms>");
  Serial.println("  indicate-rate <ms>");
  Serial.println("  reset");
}
