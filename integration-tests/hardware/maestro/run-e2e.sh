#!/bin/bash
#
# E2E BLE Test Orchestrator
#
# Starts the BlePlxTest peripheral on one device and runs maestro-runner flows
# against the example app on the other device.
#
# Usage:
#   ./run-e2e.sh android    # Android=scanner, iPhone=BlePlxTest peripheral
#   ./run-e2e.sh ios        # iPhone=scanner, Android=BlePlxTest peripheral
#   ./run-e2e.sh android 03 # Run only test 03 on Android
#
# Prerequisites:
#   - Both devices connected (adb devices, xcrun devicectl list devices)
#   - Apps installed on both devices
#   - BLE permissions pre-granted
#   - maestro-runner installed (~/.maestro-runner/bin/maestro-runner)
#   - For iOS: pymobiledevice3 tunneld running (sudo pymobiledevice3 remote tunneld -d)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Device IDs
IPHONE_UDID="00008130-000A34C12021401C"
APPLE_TEAM_ID="2974F4A5QH"

# App bundle IDs
EXAMPLE_ANDROID="com.bleplxexample"
EXAMPLE_IOS="com.iotashan.example.--PRODUCT-NAME-rfc1034identifier-"
PERIPHERAL_ANDROID="com.bleplx.testperipheral"
PERIPHERAL_IOS="com.bleplx.testperipheral.ios"

ADB="/Users/shan/Library/Android/sdk/platform-tools/adb"
MAESTRO_RUNNER="${HOME}/.maestro-runner/bin/maestro-runner"
export JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[E2E]${NC} $*"; }
warn() { echo -e "${YELLOW}[E2E]${NC} $*"; }
fail() { echo -e "${RED}[E2E]${NC} $*"; exit 1; }

# --- Preflight ---

if [ ! -f "$MAESTRO_RUNNER" ]; then
    fail "maestro-runner not found at $MAESTRO_RUNNER"
fi

# --- Helper functions ---

kill_android_app() {
    $ADB shell am force-stop "$1" 2>/dev/null || true
}

launch_android_app() {
    $ADB shell am start -n "$1/.MainActivity" 2>/dev/null
}

launch_ios_app() {
    xcrun devicectl device process launch --terminate-existing --device "$IPHONE_UDID" "$1" 2>/dev/null
}

pre_test_hook() {
    local test_name="$1"
    case "$test_name" in
        17-permissions-denied*)
            if [ "$SCANNER" = "android" ]; then
                log "Revoking BLE permissions for permission-denied test..."
                $ADB shell pm revoke "$EXAMPLE_ANDROID" android.permission.BLUETOOTH_SCAN 2>/dev/null || true
                $ADB shell pm revoke "$EXAMPLE_ANDROID" android.permission.BLUETOOTH_CONNECT 2>/dev/null || true
                $ADB shell pm revoke "$EXAMPLE_ANDROID" android.permission.ACCESS_FINE_LOCATION 2>/dev/null || true
            fi
            ;;
    esac
}

post_test_hook() {
    local test_name="$1"
    case "$test_name" in
        17-permissions-denied*)
            if [ "$SCANNER" = "android" ]; then
                log "Restoring BLE permissions..."
                $ADB shell pm grant "$EXAMPLE_ANDROID" android.permission.BLUETOOTH_SCAN 2>/dev/null || true
                $ADB shell pm grant "$EXAMPLE_ANDROID" android.permission.BLUETOOTH_CONNECT 2>/dev/null || true
                $ADB shell pm grant "$EXAMPLE_ANDROID" android.permission.ACCESS_FINE_LOCATION 2>/dev/null || true
            fi
            ;;
    esac
}

# --- Main ---

SCANNER="${1:-}"
SPECIFIC_TEST="${2:-}"

if [ -z "$SCANNER" ]; then
    echo "Usage: $0 <android|ios> [test-number]"
    echo ""
    echo "Examples:"
    echo "  $0 android        # Run all tests, Android as scanner"
    echo "  $0 ios             # Run all tests, iOS as scanner"
    echo "  $0 android 03      # Run test 03 only, Android as scanner"
    exit 1
fi

case "$SCANNER" in
    android)
        SCANNER_PLATFORM="android"
        MAESTRO_PLATFORM_FLAGS=""
        ;;
    ios)
        SCANNER_PLATFORM="ios"
        MAESTRO_PLATFORM_FLAGS="--platform ios --team-id $APPLE_TEAM_ID"
        ;;
    *)
        fail "Unknown scanner platform: $SCANNER (use 'android' or 'ios')"
        ;;
esac

log "Configuration: ${SCANNER_PLATFORM} = scanner, other = peripheral"
log ""

# Step 1: Kill apps on both devices to start clean
log "Killing Android apps..."
kill_android_app "$EXAMPLE_ANDROID"
kill_android_app "$PERIPHERAL_ANDROID"
sleep 1

if [ "$SCANNER" = "ios" ]; then
    log "Killing iOS apps..."
    xcrun devicectl device process terminate --device "$IPHONE_UDID" "$EXAMPLE_IOS" 2>/dev/null || true
    xcrun devicectl device process terminate --device "$IPHONE_UDID" "$PERIPHERAL_IOS" 2>/dev/null || true
    sleep 1
fi

# Step 2: Launch the peripheral on the server device
log "Launching BlePlxTest peripheral..."
if [ "$SCANNER" = "android" ]; then
    launch_ios_app "$PERIPHERAL_IOS"
else
    launch_android_app "$PERIPHERAL_ANDROID"
fi

log "Waiting 5s for peripheral to start advertising..."
sleep 5

# Step 3: Prepare flows
FLOW_DIR="$SCRIPT_DIR"
TMP_DIR="/tmp/maestro-e2e-$$"
mkdir -p "$TMP_DIR"

# For iOS, swap appId in all flows
if [ "$SCANNER" = "ios" ]; then
    for f in "$FLOW_DIR"/_*.yaml "$FLOW_DIR"/[0-9][0-9]-*.yaml; do
        [ -f "$f" ] || continue
        case "$f" in *-ios.yaml) continue;; esac
        sed "s/appId: $EXAMPLE_ANDROID/appId: $EXAMPLE_IOS/" "$f" > "$TMP_DIR/$(basename "$f")"
    done
    # Use iOS-specific background test
    if [ -f "$FLOW_DIR/10-background-mode-ios.yaml" ]; then
        cp "$FLOW_DIR/10-background-mode-ios.yaml" "$TMP_DIR/10-background-mode.yaml"
    fi
    FLOW_DIR="$TMP_DIR"
fi

# Step 4: Run tests
log "Running maestro-runner flows against ${SCANNER_PLATFORM}..."
log ""

PASSED=0
FAILED=0
RESULTS=""

if [ -n "$SPECIFIC_TEST" ]; then
    FLOWS=("$FLOW_DIR/${SPECIFIC_TEST}"*.yaml)
else
    FLOWS=("$FLOW_DIR"/[0-9][0-9]-*.yaml)
fi

for flow in "${FLOWS[@]}"; do
    [ -f "$flow" ] || continue
    # Skip iOS-specific variant from main list
    case "$(basename "$flow")" in *-ios.yaml) continue;; esac

    test_name=$(basename "$flow" .yaml)

    # Platform-skip for Android-only tests
    case "$(basename "$flow")" in
        12-request-mtu*|17-permissions-denied*)
            [ "$SCANNER" = "ios" ] && { warn "SKIP (Android-only): $test_name"; continue; } ;;
    esac

    log "Running: $test_name"

    # Kill any lingering WDA port (iOS only)
    if [ "$SCANNER" = "ios" ]; then
        lsof -ti :8152 2>/dev/null | xargs kill -9 2>/dev/null || true
        sleep 1
    fi

    pre_test_hook "$test_name"

    if $MAESTRO_RUNNER $MAESTRO_PLATFORM_FLAGS test "$flow" 2>&1 | grep -v '^time=' | grep -qE "✓ PASS"; then
        echo -e "  ${GREEN}PASS${NC}: $test_name"
        RESULTS="${RESULTS}\n  ${GREEN}PASS${NC}: $test_name"
        PASSED=$((PASSED + 1))
    else
        echo -e "  ${RED}FAIL${NC}: $test_name"
        RESULTS="${RESULTS}\n  ${RED}FAIL${NC}: $test_name"
        FAILED=$((FAILED + 1))
    fi

    post_test_hook "$test_name"
    echo ""
done

# Cleanup
rm -rf "$TMP_DIR"

# Step 5: Summary
log "========================================="
log "E2E Test Results (${SCANNER_PLATFORM} scanner)"
log "========================================="
echo -e "$RESULTS"
echo ""
log "Passed: $PASSED  Failed: $FAILED"
log ""

warn "========================================="
warn "Features NOT covered by E2E tests:"
warn "========================================="
warn "  - PHY Requests (Android-only, no UI effect)"
warn "  - Connection Priority (Android-only, no UI effect)"
warn "  - Bond State / Pairing (requires system dialog)"
warn "  - State Restoration (requires app kill/relaunch)"
warn "  - Multiple Simultaneous Connections (single peripheral)"
warn "  - Transaction Cancellation (timing impractical in UI tests)"
warn "  - Authorization Status (read-only, can't toggle)"
warn ""

if [ "$FAILED" -gt 0 ]; then
    exit 1
fi
