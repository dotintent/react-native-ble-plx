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

    private let manager : BluetoothManager
    public var delegate: BleClientManagerDelegate?
    private var connectedDevices = Dictionary<String, Peripheral>()
    private var monitoredCharacteristics = Dictionary<String, Observable<Characteristic>>()

    // Disposables
    private let disposeBag = DisposeBag()
    private var scanSubscription = SerialDisposable()
    private var connectingDevices = DisposableMap()
    private var transactions = DisposableMap()

    // MARK: Public interface

    // Lifecycle -------------------------------------------------------------------------------------------------------

    public init(queue: dispatch_queue_t) {
        manager = BluetoothManager(queue: queue)
        super.init()

        disposeBag.addDisposable(manager.rx_state.subscribeNext { [unowned self] newState in
            self.onStateChange(newState)
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

    private func onStateChange(state: CBCentralManagerState) {
        self.dispatchEvent(BleEvent.stateChangeEvent, value: state.asJSObject)
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
                self.dispatchEvent(BleEvent.scanEvent, value: BleError.invalidUUIDs(filteredUUIDs).toJSResult)
                return
            }
            uuids = cbuuids
        }

        scanSubscription.disposable = self.manager.scanForPeripherals(uuids, options: rxOptions)
            .subscribe(onNext: { scannedPeripheral in
                self.dispatchEvent(BleEvent.scanEvent, value: [NSNull(), scannedPeripheral.asJSObject])
            }, onError: { errorType in
                self.dispatchEvent(BleEvent.scanEvent, value: errorType.bleError.toJSResult)
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

        guard let nsuuid = NSUUID(UUIDString: deviceIdentifier) else {
            BleError.invalidUUID(deviceIdentifier).callReject(reject)
            return
        }

        let connectionDisposable = manager.retrievePeripheralsWithIdentifiers([nsuuid])
            .flatMap { devices -> Observable<Peripheral> in
                guard let device = devices.first else {
                    return Observable.error(BleError.peripheralNotFound(deviceIdentifier))
                }
                return Observable.just(device)
            }
            .flatMap { $0.connect() }
            .subscribe(
                onNext: { [unowned self] peripheral in
                    self.connectedDevices[deviceIdentifier] = peripheral
                },
                onError: { error in
                    error.bleError.callReject(reject)
                },
                onCompleted: { [unowned self] in
                    if let device = self.connectedDevices[deviceIdentifier] {
                        _ = self.manager.monitorPeripheralDisconnection(device)
                            .take(1)
                            .subscribeNext { peripheral in
                                self.onDeviceDisconnected(peripheral)
                            }

                        resolve(device.asJSObject)
                    } else {
                        BleError.peripheralNotFound(deviceIdentifier).callReject(reject)
                    }
                },
                onDisposed: { [unowned self] in
                    self.connectingDevices.removeDisposable(deviceIdentifier)
                }
            );

        // TODO: Call reject when cancelled.
        connectingDevices.replaceDisposable(deviceIdentifier, disposable: connectionDisposable)
    }

    private func onDeviceDisconnected(device: Peripheral) {
        self.dispatchEvent(BleEvent.disconnectionEvent, value: [NSNull(), device.asJSObject])
    }

    public func cancelDeviceConnection(deviceIdentifier: String, resolve: Resolve, reject: Reject) {
        if let device = connectedDevices[deviceIdentifier] {
            _ = device.cancelConnection()
                .subscribe(
                    onNext: nil,
                    onError: { error in
                        error.bleError.callReject(reject)
                    },
                    onCompleted: {
                        resolve(device.asJSObject)
                    },
                    onDisposed: {
                        self.connectedDevices[deviceIdentifier] = nil
                    }
            );
        } else {
            connectingDevices.removeDisposable(deviceIdentifier)
            BleError.cancelled().callReject(reject)
        }
    }

    public func isDeviceConnected(deviceIdentifier: String, resolve: Resolve, reject: Reject) {
        if let device = connectedDevices[deviceIdentifier] {
            resolve(device.isConnected)
        } else {
            resolve(false)
        }
    }

    // Mark: Discovery -------------------------------------------------------------------------------------------------

    public func discoverAllServicesAndCharacteristicsForDevice(deviceIdentifier: String,
                                                                        resolve: Resolve,
                                                                         reject: Reject) {
        guard let device = connectedDevices[deviceIdentifier] else {
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
        guard let device = connectedDevices[deviceIdentifier] else {
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
        guard let device = connectedDevices[deviceIdentifier] else {
            BleError.peripheralNotConnected(deviceIdentifier).callReject(reject)
            return
        }

        let services = device.services?.filter {
            serviceUUID.caseInsensitiveCompare($0.UUID.UUIDString) == .OrderedSame
            } ?? []

        let characteristics = services
            .flatMap { $0.characteristics ?? [] }
            .map { $0.asJSObject }

        resolve(characteristics)
    }

    // Mark: Characteristics operations --------------------------------------------------------------------------------

    public func readCharacteristicForDevice(deviceIdentifier: String,
                                                 serviceUUID: String,
                                          characteristicUUID: String,
                                               transactionId: String,
                                                     resolve: Resolve,
                                                      reject: Reject) {

        var readCharacteristic: Characteristic?
        var finished = false
        let disposable = characteristicObservable(deviceIdentifier,
                                                  serviceUUID: serviceUUID,
                                                  characteristicUUID: characteristicUUID)
            .flatMap { $0.readValue() }
            .subscribe(
                onNext: { characteristic in
                    readCharacteristic = characteristic
                },
                onError: { error in
                    error.bleError.callReject(reject)
                    finished = true
                },
                onCompleted: {
                    if let characteristic = readCharacteristic {
                        resolve(characteristic.asJSObject)
                    } else {
                        BleError.characteristicNotFound(characteristicUUID).callReject(reject)
                    }
                    finished = true
                },
                onDisposed: {
                    self.transactions.removeDisposable(transactionId)
                    if (!finished) {
                        BleError.cancelled().callReject(reject)
                    }
                }
            )

        transactions.replaceDisposable(transactionId, disposable: disposable)
    }

    public func writeCharacteristicForDevice(  deviceIdentifier: String,
                                                    serviceUUID: String,
                                             characteristicUUID: String,
                                                    valueBase64: String,
                                                       response: Bool,
                                                  transactionId: String,
                                                        resolve: Resolve,
                                                         reject: Reject) {

        var writeCharacteristic: Characteristic?
        var finished = false
        let disposable = characteristicObservable(deviceIdentifier,
                                                  serviceUUID: serviceUUID,
                                                  characteristicUUID: characteristicUUID)
            .flatMap { characteristic -> Observable<Characteristic> in
                guard let data = NSData(base64EncodedString: valueBase64, options: .IgnoreUnknownCharacters) else {
                    return Observable.error(BleError.invalidWriteDataForCharacteristic(
                        characteristicUUID, data: valueBase64))
                }
                return characteristic.writeValue(data, type: response ? .WithResponse : .WithoutResponse)
            }
            .subscribe(
                onNext: {
                    characteristic in writeCharacteristic = characteristic
                },
                onError: { error in
                    error.bleError.callReject(reject)
                    finished = true
                },
                onCompleted: {
                    if let characteristic = writeCharacteristic {
                        resolve(characteristic.asJSObject)
                    } else {
                        BleError.characteristicNotFound(characteristicUUID).callReject(reject)
                    }
                    finished = true
                },
                onDisposed: {
                    self.transactions.removeDisposable(transactionId)
                    if (!finished) {
                        BleError.cancelled().callReject(reject)
                    }
                }
            )

        transactions.replaceDisposable(transactionId, disposable: disposable)
    }

    public func monitorCharacteristicForDevice(  deviceIdentifier: String,
                                                      serviceUUID: String,
                                               characteristicUUID: String,
                                                    transactionId: String,
                                                          resolve: Resolve,
                                                           reject: Reject) {

        // TODO: May be not unique for characteristic
        let id = "\(deviceIdentifier)-\(serviceUUID)-\(characteristicUUID)"
        let observable: Observable<Characteristic>

        if let monitoringObservable = monitoredCharacteristics[id] {
            observable = monitoringObservable
        } else {
            observable = characteristicObservable(deviceIdentifier,
                serviceUUID: serviceUUID,
                characteristicUUID: characteristicUUID)
                .flatMap { characteristic -> Observable<Characteristic> in
                    return Observable.using({
                        return AnonymousDisposable {
                            characteristic.setNotifyValue(false).subscribe()
                            self.monitoredCharacteristics[id] = nil
                        }
                        }, observableFactory: { _ in
                            return characteristic.setNotificationAndMonitorUpdates()
                    })
                }
                .doOn(onNext: { characteristic in
                        self.dispatchEvent(BleEvent.readEvent, value: [NSNull(), characteristic.asJSObject])
                    }, onError: { error in
                        self.dispatchEvent(BleEvent.readEvent, value: error.bleError.toJSResult)
                    })
                .publish()
                .refCount()
            monitoredCharacteristics[id] = observable
        }

        let disposable = observable.subscribe(onNext: nil, onError: nil, onCompleted: nil, onDisposed: {
            self.transactions.removeDisposable(transactionId)
            resolve(nil)
        })

        transactions.replaceDisposable(transactionId, disposable: disposable)
    }

    // MARK: Private interface ------------------------------------------------------------------------------------------

    private func dispatchEvent(event: String, value: AnyObject) {
        delegate?.dispatchEvent(event, value: value)
    }

    private func characteristicObservable(deviceIdentifier: String,
                                          serviceUUID: String,
                                          characteristicUUID: String) -> Observable<Characteristic> {
        return Observable.deferred {
            guard let device = self.connectedDevices[deviceIdentifier] else {
                return Observable.error(BleError.peripheralNotConnected(deviceIdentifier))
            }

            let characteristics = device.services?
                .filter { serviceUUID.caseInsensitiveCompare($0.UUID.UUIDString) == .OrderedSame }
                .flatMap { $0.characteristics ?? [] }
                .filter { characteristicUUID.caseInsensitiveCompare($0.UUID.UUIDString) == .OrderedSame } ?? []
            
            guard let characteristic = characteristics.first else {
                return Observable.error(BleError.characteristicNotFound(characteristicUUID))
            }
            
            return Observable.just(characteristic)
        }
    }
}