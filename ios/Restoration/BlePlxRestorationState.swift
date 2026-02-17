import Foundation
import MultiplatformBleAdapter

@objc(BlePlxRestorationState)
public final class BlePlxRestorationState: NSObject {
  private static var restoredManager: BleClientManager?
  private static let lock = NSLock()

  @objc public static func storeRestoredManager(_ manager: BleClientManager) {
    lock.lock(); defer { lock.unlock() }
    restoredManager = manager
  }

  /// Returns the stored manager (if any) and clears the cache to avoid reuse.
  @objc public static func takeRestoredManager() -> BleClientManager? {
    lock.lock(); defer { lock.unlock() }
    let mgr = restoredManager
    restoredManager = nil
    return mgr
  }
}
