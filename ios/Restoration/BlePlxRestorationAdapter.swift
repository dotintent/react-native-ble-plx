import Foundation
import CoreBluetooth
import MultiplatformBleAdapter
import BleRestoration

/// Generic restoration adapter for react-native-ble-plx.
/// Lives in an optional subspec so host apps can opt-in.
///
/// Registration is triggered from BlePlx.m via the explicit `register()` method,
/// which is called during the module's +load phase.
@objc(BlePlxRestorationAdapter)
public final class BlePlxRestorationAdapter: NSObject, BleRestorableAdapter {

  /// Identifier shared between native and JS for CBCentral restoration.
  /// Set `BlePlxRestoreIdentifier` in Info.plist to match the value you pass
  /// as `restoreStateIdentifier` to BleManager in JS.
  public static let restorationIdentifier: String = {
    if let id = Bundle.main.object(forInfoDictionaryKey: "BlePlxRestoreIdentifier") as? String,
       !id.trimmingCharacters(in: .whitespaces).isEmpty {
      return id
    }
    return "com.reactnativebleplx.restore"
  }()

  /// Track whether we've already registered to avoid duplicate registrations
  private static var isRegistered = false

  @objc public static func handleRestored(
    central: CBCentralManager,
    willRestoreState dict: [String : Any]
  ) {
    guard let peripherals = dict[CBCentralManagerRestoredStatePeripheralsKey] as? [CBPeripheral],
          !peripherals.isEmpty else {
      print("[BlePlxRestorationAdapter] No peripherals to restore")
      return
    }

    // Recreate a BleClientManager bound to the same restoration ID.
    // Using direct initializer (recommended over factory for type safety).
    let manager = BleClientManager(
      queue: .main,
      restoreIdentifierKey: restorationIdentifier
    )
    BlePlxRestorationState.storeRestoredManager(manager)

    // Persist device-specific routing so the registry can target us next time.
    for peripheral in peripherals {
      let deviceId = peripheral.identifier.uuidString
      BleRestorationRegistry.shared.registerDevice(deviceId, for: BlePlxRestorationAdapter.self)

      // Kick off reconnect in the background. We don't care about resolve/reject here
      // because JS may not be up yet. Any errors will surface once JS re-attaches.
      manager.connectToDevice(
        deviceId,
        options: [:],
        resolve: { _ in
          print("[BlePlxRestorationAdapter] Reconnected to \(deviceId)")
        },
        reject: { code, message, error in
          let reason = message ?? error?.localizedDescription ?? "unknown"
          print("[BlePlxRestorationAdapter] Failed to reconnect \(deviceId): \(code ?? "-") / \(reason)")
        }
      )
    }
  }

  // MARK: - Explicit Registration (Called from BlePlx.m)

  /// Explicit registration with BleRestorationRegistry.
  /// This is called from BlePlx.m during its +load phase.
  /// Uses reflection to remain optional - if BleRestoration pod is not present, this is a no-op.
  @objc public static func register() {
    // Prevent duplicate registrations
    guard !isRegistered else {
      return
    }

    guard
      let registryCls = NSClassFromString("BleRestorationRegistry") as? NSObject.Type,
      registryCls.responds(to: NSSelectorFromString("shared")),
      let shared = registryCls.perform(NSSelectorFromString("shared"))?.takeUnretainedValue()
    else {
      // BleRestorationRegistry not available - this is expected if the host app
      // doesn't include the BleRestoration pod
      return
    }

    _ = (shared as AnyObject)
      .perform(NSSelectorFromString("registerAdapter:"), with: BlePlxRestorationAdapter.self)

    isRegistered = true
    print("[BlePlxRestorationAdapter] ✓ Registered with BleRestorationRegistry")
  }
}
