import Foundation
import CoreBluetooth
import MultiplatformBleAdapter
import BleRestoration

/// Generic restoration adapter for react-native-ble-plx.
/// Lives in an optional subspec so host apps can opt-in.
///
/// Registration happens in two ways:
/// 1. Explicit: Call `BlePlxRestorationAdapter.register()` from your app or module init
/// 2. Legacy: The `+load` method attempts auto-registration (may fail due to static linking)
///
/// For reliable registration, use the explicit `register()` method which is called
/// automatically from BlePlx.m when the Restoration subspec is included.
@objc(BlePlxRestorationAdapter)
public final class BlePlxRestorationAdapter: NSObject, BleRestorableAdapter {

  /// Identifier shared between native and JS for CBCentral restoration.
  public static let restorationIdentifier: String = {
    if let id = Bundle.main.object(forInfoDictionaryKey: "BlePlxRestoreIdentifier") as? String,
       !id.trimmingCharacters(in: .whitespaces).isEmpty {
      return id
    }
    return "com.reactnativebleplx.restore"
  }()

  /// Track whether we've already registered to avoid duplicate registrations
  private static var isRegistered = false

  public static func handleRestored(
    central: CBCentralManager,
    willRestoreState dict: [String : Any]
  ) {
    guard let peripherals = dict[CBCentralManagerRestoredStatePeripheralsKey] as? [CBPeripheral],
          !peripherals.isEmpty else {
      print("[BlePlxRestorationAdapter] No peripherals to restore")
      return
    }

    // Recreate a BleClientManager bound to the same restoration ID.
    let manager = BleAdapterFactory.getNewAdapter(
      queue: DispatchQueue.main,
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

  // MARK: - Explicit Registration (Recommended)

  /// Explicit registration with BleRestorationRegistry.
  /// This is the recommended way to register the adapter, called from BlePlx.m.
  /// Uses reflection to remain optional - if BleRestoration pod is not present, this is a no-op.
  ///
  /// Call this from your module initialization to ensure the adapter is registered
  /// regardless of static linking behavior.
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

  // MARK: - Legacy Auto-Registration (May not work with static linking)

  /// Legacy auto-registration via +load.
  /// Note: This may not work reliably with static CocoaPods libraries because
  /// the linker can strip this class if no symbols are referenced.
  /// For reliable registration, use the explicit `register()` method instead.
  @objc public override class func load() {
    // Attempt auto-registration, but this may fail due to static linking
    register()
  }
}
