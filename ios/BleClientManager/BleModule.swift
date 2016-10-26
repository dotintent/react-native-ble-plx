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
    func dispatchEvent(name: String, value: AnyObject)
}

@objc
public class BleClientManager : NSObject {

    public var delegate: BleClientManagerDelegate?

    private let manager : BluetoothManager
    private var connectedDevices = Dictionary<NSUUID, Peripheral>()
    private var monitoredCharacteristics = Dictionary<CharacteristicKey, Observable<Characteristic>>()

    // Disposables
    private let disposeBag = DisposeBag()
    private var scanSubscription = SerialDisposable()
    private var connectingDevices = DisposableMap<NSUUID>()
    private var transactions = DisposableMap<String>()

    // MARK: Public interface

    // Lifecycle -------------------------------------------------------------------------------------------------------

    public init(queue: dispatch_queue_t) {
        manager = BluetoothManager(queue: queue)
        super.init()

        disposeBag.addDisposable(manager.rx_state.subscribeNext { [weak self] newState in
            self?.onStateChange(newState)
        })
    }

    deinit {
        scanSubscription.disposable = NopDisposable.instance
    }

    // Mark: Common ----------------------------------------------------------------------------------------------------

    public func cancelTransaction(transactionId: String) {
        transactions.removeDisposable(transactionId)
    }

    // Mark: Monitoring state ------------------------------------------------------------------------------------------

    public func state(resolve: Resolve, reject: Reject) {
        resolve(manager.state.asJSObject)
    }

    private func onStateChange(state: BluetoothState) {
        dispatchEvent(BleEvent.stateChangeEvent, value: state.asJSObject)
    }

    // Mark: Scanning --------------------------------------------------------------------------------------------------

    public func startDeviceScan(filteredUUIDs: [String]?, options:[String:AnyObject]?) {

        var rxOptions = [String:AnyObject]()
        if let options = options {
            if ((options["allowDuplicates"]?.isEqualToNumber(NSNumber(bool: true))) ?? false) {
                rxOptions[CBCentralManagerScanOptionAllowDuplicatesKey] = true
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

        scanSubscription.disposable = manager.scanForPeripherals(uuids, options: rxOptions)
            .subscribe(onNext: { [weak self] scannedPeripheral in
                self?.dispatchEvent(BleEvent.scanEvent, value: [NSNull(), scannedPeripheral.asJSObject])
            }, onError: { [weak self] errorType in
                self?.dispatchEvent(BleEvent.scanEvent, value: errorType.bleError.toJSResult)
            })
    }

    public func stopDeviceScan() {
        scanSubscription.disposable = NopDisposable.instance
    }

    // Mark: Connection management -------------------------------------------------------------------------------------

    public func connectToDevice(deviceIdentifier: String,
                                         options:[String: AnyObject]?,
                                         resolve: Resolve,
                                          reject: Reject) {

        guard let deviceId = NSUUID(UUIDString: deviceIdentifier) else {
            BleError.invalidUUID(deviceIdentifier).callReject(reject)
            return
        }

        safeConnectToDevice(deviceId, options: options, promise: SafePromise(resolve: resolve, reject: reject))
    }

    private func safeConnectToDevice(deviceId: NSUUID,
                                      options: [String:AnyObject]?,
                                      promise: SafePromise) {

        let connectionDisposable = manager.retrievePeripheralsWithIdentifiers([deviceId])
            .flatMap { devices -> Observable<Peripheral> in
                guard let device = devices.first else {
                    return Observable.error(BleError.peripheralNotFound(deviceId.UUIDString))
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
                        _ = self?.manager.monitorPeripheralDisconnection(device)
                            .take(1)
                            .subscribeNext { peripheral in
                                self?.onDeviceDisconnected(peripheral)
                        }
                        promise.resolve(device.asJSObject)
                    } else {
                        BleError.peripheralNotFound(deviceId.UUIDString).callReject(promise)
                    }
                },
                onDisposed: { [weak self] in
                    self?.connectingDevices.removeDisposable(deviceId)
                    BleError.cancelled().callReject(promise)
                }
        );

        connectingDevices.replaceDisposable(deviceId, disposable: connectionDisposable)
    }

    private func onDeviceDisconnected(device: Peripheral) {
        self.connectedDevices[device.identifier] = nil
        dispatchEvent(BleEvent.disconnectionEvent, value: [NSNull(), device.asJSObject])
    }

    public func cancelDeviceConnection(deviceIdentifier: String, resolve: Resolve, reject: Reject) {
        guard let deviceId = NSUUID(UUIDString: deviceIdentifier) else {
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

    public func isDeviceConnected(deviceIdentifier: String, resolve: Resolve, reject: Reject) {
        guard let deviceId = NSUUID(UUIDString: deviceIdentifier) else {
            BleError.invalidUUID(deviceIdentifier).callReject(reject)
            return
        }

        if let device = connectedDevices[deviceId] {
            resolve(device.isConnected)
        } else {
            resolve(false)
        }
    }

    // Mark: Discovery -------------------------------------------------------------------------------------------------

    public func discoverAllServicesAndCharacteristicsForDevice(deviceIdentifier: String,
                                                                        resolve: Resolve,
                                                                         reject: Reject) {

        guard let deviceId = NSUUID(UUIDString: deviceIdentifier) else {
            BleError.invalidUUID(deviceIdentifier).callReject(reject)
            return
        }

        guard let device = connectedDevices[deviceId] else {
            BleError.peripheralNotConnected(deviceIdentifier).callReject(reject)
            return
        }

        _ = Observable.from(device.discoverServices(nil))
            .flatMap { Observable.from($0.discoverCharacteristics(nil)) }
            .subscribe(
                onNext: nil,
                onError: { error in error.bleError.callReject(reject) },
                onCompleted: { resolve(device.asJSObject) }
            )
    }

    // Mark: Service and characteristic getters ------------------------------------------------------------------------

    public func servicesForDevice(deviceIdentifier: String, resolve: Resolve, reject: Reject) {

        guard let deviceId = NSUUID(UUIDString: deviceIdentifier) else {
            BleError.invalidUUID(deviceIdentifier).callReject(reject)
            return
        }

        guard let device = connectedDevices[deviceId] else {
            BleError.peripheralNotConnected(deviceIdentifier).callReject(reject)
            return
        }

        let services = device.services?.map { $0.asJSObject } ?? []
        resolve(services)
    }

    public func characteristicsForDevice(deviceIdentifier: String,
                                              serviceUUID: String,
                                                  resolve: Resolve,
                                                   reject: Reject) {

        guard let deviceId = NSUUID(UUIDString: deviceIdentifier),
                  serviceId = serviceUUID.toCBUUID() else {
            BleError.invalidUUIDs([deviceIdentifier, serviceUUID]).callReject(reject)
            return
        }

        guard let device = connectedDevices[deviceId] else {
            BleError.peripheralNotConnected(deviceIdentifier).callReject(reject)
            return
        }

        let services = device.services?.filter { serviceId == $0.UUID } ?? []
        let characteristics = services
            .flatMap { $0.characteristics ?? [] }
            .map { $0.asJSObject }

        resolve(characteristics)
    }

    // Mark: Reading ---------------------------------------------------------------------------------------------------

    public func readCharacteristicForDevice(deviceIdentifier: String,
                                                 serviceUUID: String,
                                          characteristicUUID: String,
                                               transactionId: String,
                                                     resolve: Resolve,
                                                      reject: Reject) {
        guard let deviceId = NSUUID(UUIDString: deviceIdentifier),
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

    private func safeReadCharacteristicForDevice(deviceId: NSUUID,
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

    public func writeCharacteristicForDevice(  deviceIdentifier: String,
                                                    serviceUUID: String,
                                             characteristicUUID: String,
                                                    valueBase64: String,
                                                       response: Bool,
                                                  transactionId: String,
                                                        resolve: Resolve,
                                                         reject: Reject) {
        guard let deviceId = NSUUID(UUIDString: deviceIdentifier),
              let serviceId = serviceUUID.toCBUUID(),
              let characteristicId = characteristicUUID.toCBUUID() else {
                BleError.invalidUUIDs([deviceIdentifier, serviceUUID, characteristicUUID]).callReject(reject)
                return
        }

        guard let value = NSData(base64EncodedString: valueBase64, options: .IgnoreUnknownCharacters) else {
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

    private func safeWriteCharacteristicForDevice(deviceId: NSUUID,
                                                  serviceId: CBUUID,
                                                  characteristicId: CBUUID,
                                                  value: NSData,
                                                  response: Bool,
                                                  transactionId: String,
                                                  promise: SafePromise) {

        let disposable = characteristicObservable(deviceId,
                                                  serviceId: serviceId,
                                                  characteristicId: characteristicId)
            .flatMap {
                $0.writeValue(value, type: response ? .WithResponse : .WithoutResponse)
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

    public func monitorCharacteristicForDevice(  deviceIdentifier: String,
                                                      serviceUUID: String,
                                               characteristicUUID: String,
                                                    transactionId: String,
                                                          resolve: Resolve,
                                                           reject: Reject) {

        guard let deviceId = NSUUID(UUIDString: deviceIdentifier),
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

    private func safeMonitorCharacteristicForDevice(deviceId: NSUUID,
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
                    return Observable.using({
                        return AnonymousDisposable {
                            _ = characteristic.setNotifyValue(false).subscribe()
                            self?.monitoredCharacteristics[key] = nil
                        }
                    }, observableFactory: { _ in
                        return characteristic.setNotificationAndMonitorUpdates()
                    })
                }
                .publish()
                .refCount()

            monitoredCharacteristics[key] = observable
        }

        let disposable = observable.subscribe(
            onNext: { [weak self] characteristic in
                self?.dispatchEvent(BleEvent.readEvent, value: [NSNull(), characteristic.asJSObject, transactionId])
            }, onError: { [weak self] error in
                self?.dispatchEvent(BleEvent.readEvent, value: [error.bleError.toJS, NSNull(), transactionId])
            }, onCompleted: {

            }, onDisposed: { [weak self] in
                self?.transactions.removeDisposable(transactionId)
                promise.resolve(nil)
            })

        transactions.replaceDisposable(transactionId, disposable: disposable)
    }

    // MARK: Private interface -----------------------------------------------------------------------------------------

    private func dispatchEvent(event: String, value: AnyObject) {
        delegate?.dispatchEvent(event, value: value)
    }

    private func characteristicObservable(deviceId: NSUUID,
                                          serviceId: CBUUID,
                                          characteristicId: CBUUID) -> Observable<Characteristic> {

        return Observable.deferred { [weak self] in
            guard let device = self?.connectedDevices[deviceId] else {
                return Observable.error(BleError.peripheralNotConnected(deviceId.UUIDString))
            }

            let characteristics = device.services?
                .filter { serviceId == $0.UUID }
                .flatMap { $0.characteristics ?? [] }
                .filter { characteristicId == $0.UUID } ?? []
            
            guard let characteristic = characteristics.first else {
                return Observable.error(BleError.characteristicNotFound(characteristicId.UUIDString))
            }
            
            return Observable.just(characteristic)
        }
    }
}
