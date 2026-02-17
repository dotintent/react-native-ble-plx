import Foundation
import CoreBluetooth
import MultiplatformBleAdapter
import BleRestoration

/// Generic restoration adapter for react-native-ble-plx.
/// Lives in an optional subspec so host apps can opt-in.
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

  // Auto-register with the registry if it is present in the host app.
  @objc public override class func load() {
    guard
      let registryCls = NSClassFromString("BleRestorationRegistry") as? NSObject.Type,
      registryCls.responds(to: NSSelectorFromString("shared")),
      let shared = registryCls.perform(NSSelectorFromString("shared"))?.takeUnretainedValue()
    else {
      return
    }

    _ = (shared as AnyObject)
      .perform(NSSelectorFromString("registerAdapter:"), with: BlePlxRestorationAdapter.self)
  }
}
