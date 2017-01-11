//
//  BleModule.swift
//  EmptyProject
//
//  Created by Konrad Rodzik on 7/4/16.
//

import Foundation
import CoreBluetooth
import RxBluetoothKit
import RxSwift

@objc
public protocol BleClientManagerDelegate {
    func dispatchEvent(_ name: String, value: AnyObject)
}

@objc
public class BleClientManager : NSObject {

    public var delegate: BleClientManagerDelegate?

    fileprivate let manager : BluetoothManager
    fileprivate var connectedDevices = Dictionary<UUID, Peripheral>()
    fileprivate var monitoredCharacteristics = Dictionary<CharacteristicKey, Observable<Characteristic>>()

    // Disposables
    fileprivate let disposeBag = DisposeBag()
    fileprivate let scanSubscription = SerialDisposable()
    fileprivate let connectingDevices = DisposableMap<UUID>()
    fileprivate let transactions = DisposableMap<String>()

    // MARK: Public interface

    // Lifecycle -------------------------------------------------------------------------------------------------------

    public init(queue: DispatchQueue) {
        manager = BluetoothManager(queue: queue)
        super.init()

        disposeBag.insert(manager.rx_state.subscribe(onNext: { [weak self] newState in
            self?.onStateChange(newState)
        }))
    }

    open func invalidate() {
        scanSubscription.disposable = Disposables.create()
        transactions.dispose()
        connectingDevices.dispose()
        connectedDevices.forEach { (_, device) in
            _ = device.cancelConnection().subscribe()
        }
        connectedDevices.removeAll()
        monitoredCharacteristics.removeAll()
    }

    deinit {
        scanSubscription.disposable = Disposables.create()
    }

    // Mark: Common ----------------------------------------------------------------------------------------------------

    open func cancelTransaction(_ transactionId: String) {
        transactions.removeDisposable(transactionId)
    }

    // Mark: Monitoring state ------------------------------------------------------------------------------------------

    open func state(_ resolve: Resolve, reject: Reject) {
        resolve(manager.state.asJSObject as AnyObject?)
    }

    fileprivate func onStateChange(_ state: BluetoothState) {
        dispatchEvent(BleEvent.stateChangeEvent, value: state.asJSObject as AnyObject)
    }

    // Mark: Scanning --------------------------------------------------------------------------------------------------

    open func startDeviceScan(_ filteredUUIDs: [String]?, options:[String:AnyObject]?) {

        var rxOptions = [String:AnyObject]()
        if let options = options {
            if ((options["allowDuplicates"]?.isEqual(to: NSNumber(value: true as Bool))) ?? false) {
                rxOptions[CBCentralManagerScanOptionAllowDuplicatesKey] = true as AnyObject?
            }
        }

        var uuids: [CBUUID]? = nil
        if let filteredUUIDs = filteredUUIDs {
            guard let cbuuids = filteredUUIDs.toCBUUIDS() else {
                dispatchEvent(BleEvent.scanEvent, value: BleError.invalidUUIDs(filteredUUIDs).toJSResult)
                return
            }
            uuids = cbuuids
        }

        scanSubscription.disposable = manager.scanForPeripherals(withServices: uuids, options: rxOptions)
            .subscribe(onNext: { [weak self] scannedPeripheral in
                self?.dispatchEvent(BleEvent.scanEvent, value: [NSNull(), scannedPeripheral.asJSObject] as AnyObject)
            }, onError: { [weak self] errorType in
                self?.dispatchEvent(BleEvent.scanEvent, value: errorType.bleError.toJSResult)
            })
    }

    open func stopDeviceScan() {
        scanSubscription.disposable = Disposables.create()
    }

    // Mark: Connection management -------------------------------------------------------------------------------------

    open func connectToDevice(_ deviceIdentifier: String,
                                         options:[String: AnyObject]?,
                                          resolve: @escaping Resolve,
                                          reject: @escaping Reject) {

        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidUUID(deviceIdentifier).callReject(reject)
            return
        }

        safeConnectToDevice(deviceId, options: options, promise: SafePromise(resolve: resolve, reject: reject))
    }

    fileprivate func safeConnectToDevice(_ deviceId: UUID,
                                      options: [String:AnyObject]?,
                                      promise: SafePromise) {

        let connectionDisposable = manager.retrievePeripherals(withIdentifiers: [deviceId])
            .flatMap { devices -> Observable<Peripheral> in
                guard let device = devices.first else {
                    return Observable.error(BleError.peripheralNotFound(deviceId.uuidString))
                }
                return Observable.just(device)
            }
            .flatMap { $0.connect() }
            .subscribe(
                onNext: { [weak self] peripheral in
                    self?.connectedDevices[deviceId] = peripheral
                },
                onError: { error in
                    error.bleError.callReject(promise)
                },
                onCompleted: { [weak self] in
                    if let device = self?.connectedDevices[deviceId] {
                        _ = self?.manager.monitorDisconnection(for: device)
                            .take(1)
                            .subscribe(onNext: { peripheral in
                                self?.onDeviceDisconnected(peripheral)
                            })
                        promise.resolve(device.asJSObject)
                    } else {
                        BleError.peripheralNotFound(deviceId.uuidString).callReject(promise)
                    }
                },
                onDisposed: { [weak self] in
                    self?.connectingDevices.removeDisposable(deviceId)
                    BleError.cancelled().callReject(promise)
                }
        );

        connectingDevices.replaceDisposable(deviceId, disposable: connectionDisposable)
    }

    fileprivate func onDeviceDisconnected(_ device: Peripheral) {
        self.connectedDevices[device.identifier] = nil
        dispatchEvent(BleEvent.disconnectionEvent, value: [NSNull(), device.asJSObject] as AnyObject)
    }

    open func cancelDeviceConnection(_ deviceIdentifier: String, resolve: @escaping Resolve, reject: @escaping Reject) {
        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidUUID(deviceIdentifier).callReject(reject)
            return
        }

        if let device = connectedDevices[deviceId] {
            _ = device.cancelConnection()
                .subscribe(
                    onNext: nil,
                    onError: { error in
                        error.bleError.callReject(reject)
                    },
                    onCompleted: {
                        resolve(device.asJSObject)
                    },
                    onDisposed: { [weak self] in
                        self?.connectedDevices[deviceId] = nil
                    }
            );
        } else {
            connectingDevices.removeDisposable(deviceId)
            BleError.cancelled().callReject(reject)
        }
    }

    open func isDeviceConnected(_ deviceIdentifier: String, resolve: Resolve, reject: Reject) {
        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidUUID(deviceIdentifier).callReject(reject)
            return
        }

        if let device = connectedDevices[deviceId] {
            resolve(device.isConnected as AnyObject?)
        } else {
            resolve(false as AnyObject?)
        }
    }

    // Mark: Discovery -------------------------------------------------------------------------------------------------

    open func discoverAllServicesAndCharacteristicsForDevice(_ deviceIdentifier: String,
                                                                        resolve: @escaping Resolve,
                                                                         reject: @escaping Reject) {

        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidUUID(deviceIdentifier).callReject(reject)
            return
        }

        guard let device = connectedDevices[deviceId] else {
            BleError.peripheralNotConnected(deviceIdentifier).callReject(reject)
            return
        }

        _ = device.discoverServices(nil)
            .flatMap { Observable.from($0) }
            .flatMap { $0.discoverCharacteristics(nil) }
            .subscribe(
                onNext: nil,
                onError: { error in error.bleError.callReject(reject) },
                onCompleted: { resolve(device.asJSObject) }
            )
    }

    // Mark: Service and characteristic getters ------------------------------------------------------------------------

    open func servicesForDevice(_ deviceIdentifier: String, resolve: Resolve, reject: Reject) {

        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidUUID(deviceIdentifier).callReject(reject)
            return
        }

        guard let device = connectedDevices[deviceId] else {
            BleError.peripheralNotConnected(deviceIdentifier).callReject(reject)
            return
        }

        let services = device.services?.map { $0.asJSObject } ?? []
        resolve(services as AnyObject?)
    }

    open func characteristicsForDevice(_ deviceIdentifier: String,
                                              serviceUUID: String,
                                                  resolve: Resolve,
                                                   reject: Reject) {

        guard let deviceId = UUID(uuidString: deviceIdentifier),
                  let serviceId = serviceUUID.toCBUUID() else {
            BleError.invalidUUIDs([deviceIdentifier, serviceUUID]).callReject(reject)
            return
        }

        guard let device = connectedDevices[deviceId] else {
            BleError.peripheralNotConnected(deviceIdentifier).callReject(reject)
            return
        }

        let services = device.services?.filter { serviceId == $0.uuid } ?? []
        let characteristics = services
            .flatMap { $0.characteristics ?? [] }
            .map { $0.asJSObject }

        resolve(characteristics as AnyObject)
    }

    // Mark: Reading ---------------------------------------------------------------------------------------------------

    open func readCharacteristicForDevice(_ deviceIdentifier: String,
                                                 serviceUUID: String,
                                          characteristicUUID: String,
                                               transactionId: String,
                                                     resolve: @escaping Resolve,
                                                      reject: @escaping Reject) {
        guard let deviceId = UUID(uuidString: deviceIdentifier),
            let serviceId = serviceUUID.toCBUUID(),
            let characteristicId = characteristicUUID.toCBUUID() else {
                BleError.invalidUUIDs([deviceIdentifier, serviceUUID, characteristicUUID]).callReject(reject)
                return
        }

        safeReadCharacteristicForDevice(deviceId,
                                        serviceId: serviceId,
                                        characteristicId: characteristicId,
                                        transactionId: transactionId,
                                        promise: SafePromise(resolve: resolve, reject: reject))
    }

    fileprivate func safeReadCharacteristicForDevice(_ deviceId: UUID,
                                                 serviceId: CBUUID,
                                                 characteristicId: CBUUID,
                                                 transactionId: String,
                                                 promise: SafePromise) {

        let disposable = characteristicObservable(deviceId,
                                                  serviceId: serviceId,
                                                  characteristicId: characteristicId)
            .flatMap { $0.readValue() }
            .subscribe(
                onNext: { characteristic in
                    promise.resolve(characteristic.asJSObject)
                },
                onError: { error in
                    error.bleError.callReject(promise)
                },
                onCompleted: nil,
                onDisposed: { [weak self] in
                    self?.transactions.removeDisposable(transactionId)
                    BleError.cancelled().callReject(promise)
                }
            )

        transactions.replaceDisposable(transactionId, disposable: disposable)
    }

    // MARK: Writing ---------------------------------------------------------------------------------------------------

    open func writeCharacteristicForDevice(  _ deviceIdentifier: String,
                                                    serviceUUID: String,
                                             characteristicUUID: String,
                                                    valueBase64: String,
                                                       response: Bool,
                                                  transactionId: String,
                                                        resolve: @escaping Resolve,
                                                         reject: @escaping Reject) {
        guard let deviceId = UUID(uuidString: deviceIdentifier),
              let serviceId = serviceUUID.toCBUUID(),
              let characteristicId = characteristicUUID.toCBUUID() else {
                BleError.invalidUUIDs([deviceIdentifier, serviceUUID, characteristicUUID]).callReject(reject)
                return
        }

        guard let value = Data(base64Encoded: valueBase64, options: .ignoreUnknownCharacters) else {
            return BleError.invalidWriteDataForCharacteristic(characteristicUUID, data: valueBase64).callReject(reject)
        }

        safeWriteCharacteristicForDevice(deviceId,
                                         serviceId: serviceId,
                                         characteristicId: characteristicId,
                                         value: value,
                                         response: response,
                                         transactionId: transactionId,
                                         promise: SafePromise(resolve: resolve, reject: reject))
    }

    fileprivate func safeWriteCharacteristicForDevice(_ deviceId: UUID,
                                                  serviceId: CBUUID,
                                                  characteristicId: CBUUID,
                                                  value: Data,
                                                  response: Bool,
                                                  transactionId: String,
                                                  promise: SafePromise) {

        let disposable = characteristicObservable(deviceId,
                                                  serviceId: serviceId,
                                                  characteristicId: characteristicId)
            .flatMap {
                $0.writeValue(value, type: response ? .withResponse : .withoutResponse)
            }
            .subscribe(
                onNext: { characteristic in
                    promise.resolve(characteristic.asJSObject)
                },
                onError: { error in
                    error.bleError.callReject(promise)
                },
                onCompleted: nil,
                onDisposed: { [weak self] in
                    self?.transactions.removeDisposable(transactionId)
                    BleError.cancelled().callReject(promise)
                }
            )

        transactions.replaceDisposable(transactionId, disposable: disposable)
    }

    // MARK: Monitoring ------------------------------------------------------------------------------------------------

    open func monitorCharacteristicForDevice(  _ deviceIdentifier: String,
                                                      serviceUUID: String,
                                               characteristicUUID: String,
                                                    transactionId: String,
                                                          resolve: @escaping Resolve,
                                                           reject: @escaping Reject) {

        guard let deviceId = UUID(uuidString: deviceIdentifier),
              let serviceId = serviceUUID.toCBUUID(),
              let characteristicId = characteristicUUID.toCBUUID() else {
            BleError.invalidUUIDs([deviceIdentifier, serviceUUID, characteristicUUID]).callReject(reject)
            return
        }

        safeMonitorCharacteristicForDevice(deviceId,
                                           serviceId: serviceId,
                                           characteristicId: characteristicId,
                                           transactionId: transactionId,
                                           promise: SafePromise(resolve: resolve, reject: reject))
    }

    fileprivate func safeMonitorCharacteristicForDevice(_ deviceId: UUID,
                                                    serviceId: CBUUID,
                                                    characteristicId: CBUUID,
                                                    transactionId: String,
                                                    promise: SafePromise) {

        let key = CharacteristicKey(deviceId: deviceId,
                                    serviceId: serviceId,
                                    characteristicId: characteristicId)

        let observable: Observable<Characteristic>

        if let monitoringObservable = monitoredCharacteristics[key] {
            observable = monitoringObservable
        } else {
            observable = characteristicObservable(deviceId,
                                                  serviceId: serviceId,
                                                  characteristicId: characteristicId)
                .flatMap { [weak self] characteristic -> Observable<Characteristic> in
                    return characteristic.setNotificationAndMonitorUpdates()
                        .do(onNext: nil, onError: nil, onCompleted: nil, onSubscribe: nil, onDispose: {
                            _ = characteristic.setNotifyValue(false).subscribe()
                            self?.monitoredCharacteristics[key] = nil
                        })
                }
                .share()

            monitoredCharacteristics[key] = observable
        }

        let disposable = observable.subscribe(
            onNext: { [weak self] characteristic in
                self?.dispatchEvent(BleEvent.readEvent, value: [NSNull(), characteristic.asJSObject, transactionId] as AnyObject)
            }, onError: { [weak self] error in
                self?.dispatchEvent(BleEvent.readEvent, value: [error.bleError.toJS, NSNull(), transactionId] as AnyObject)
            }, onCompleted: {

            }, onDisposed: { [weak self] in
                self?.transactions.removeDisposable(transactionId)
                promise.resolve(nil)
            })

        transactions.replaceDisposable(transactionId, disposable: disposable)
    }

    // MARK: Private interface -----------------------------------------------------------------------------------------

    fileprivate func dispatchEvent(_ event: String, value: Any) {
        delegate?.dispatchEvent(event, value: value as AnyObject)
    }

    fileprivate func characteristicObservable(_ deviceId: UUID,
                                               serviceId: CBUUID,
                                        characteristicId: CBUUID) -> Observable<Characteristic> {

        return Observable.deferred { [weak self] in
            guard let device = self?.connectedDevices[deviceId as UUID] else {
                return Observable.error(BleError.peripheralNotConnected(deviceId.uuidString))
            }

            let characteristics = device.services?
                .filter { serviceId == $0.uuid }
                .flatMap { $0.characteristics ?? [] }
                .filter { characteristicId == $0.uuid } ?? []
            
            guard let characteristic = characteristics.first else {
                return Observable.error(BleError.characteristicNotFound(characteristicId.uuidString))
            }
            
            return Observable.just(characteristic)
        }
    }
}
