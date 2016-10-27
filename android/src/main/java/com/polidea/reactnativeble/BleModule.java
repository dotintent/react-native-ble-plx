package com.polidea.reactnativeble;

import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattService;
import android.support.annotation.Nullable;
import android.support.v4.util.Pair;
import android.util.Base64;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.polidea.reactnativeble.converter.JSObjectConverterManager;
import com.polidea.reactnativeble.errors.BleError;
import com.polidea.reactnativeble.errors.ErrorConverter;
import com.polidea.reactnativeble.utils.DisposableMap;
import com.polidea.reactnativeble.utils.ReadableArrayConverter;
import com.polidea.reactnativeble.utils.SafePromise;
import com.polidea.reactnativeble.utils.UUIDConverter;
import com.polidea.rxandroidble.RxBleClient;
import com.polidea.rxandroidble.RxBleConnection;
import com.polidea.rxandroidble.RxBleDevice;
import com.polidea.rxandroidble.RxBleDeviceServices;
import com.polidea.rxandroidble.RxBleScanResult;
import com.polidea.rxandroidble.exceptions.BleCharacteristicNotFoundException;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import rx.Observable;
import rx.Observer;
import rx.Subscription;
import rx.functions.Action0;
import rx.functions.Action1;
import rx.functions.Func1;
import rx.functions.Func2;

public class BleModule extends ReactContextBaseJavaModule {

    private static final String NAME = "BleClientManager";
    private final ErrorConverter errorConverter = new ErrorConverter();
    private final JSObjectConverterManager converter = new JSObjectConverterManager();

    private RxBleClient rxBleClient;
    private HashMap<String, RxBleConnection> connectionMap = new HashMap<>();

    private Subscription scanSubscription;
    private final DisposableMap transactions = new DisposableMap();
    private final DisposableMap connectingDevices = new DisposableMap();

    public BleModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return NAME;
    }

    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        for (Event event : Event.values()) {
            constants.put(event.name, event.name);
        }
        return constants;
    }

    // Lifecycle -----------------------------------------------------------------------------------

    @ReactMethod
    public void createClient() {
        rxBleClient = RxBleClient.create(getReactApplicationContext());
    }

    @ReactMethod
    public void destroyClient() {
        // Clear all subscriptions
        if (scanSubscription != null && !scanSubscription.isUnsubscribed()) {
            scanSubscription.unsubscribe();
            scanSubscription = null;
        }
        transactions.removeAllSubscriptions();
        connectingDevices.removeAllSubscriptions();

        // Clear all data structures
        connectionMap.clear();

        // Clear client
        rxBleClient = null;
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        destroyClient();
    }

    // Mark: Common --------------------------------------------------------------------------------

    @ReactMethod
    public void cancelTransaction(String transactionId) {
        transactions.removeSubscription(transactionId);
    }

    // Mark: Monitoring state ----------------------------------------------------------------------

    @ReactMethod
    public void state(Promise promise) {
        // TODO: Implement when RxAndroidBle is ready

    }

    // TODO: implement onStateChanged by sending StateChange events

    // Mark: Scanning ------------------------------------------------------------------------------

    @ReactMethod
    public void startDeviceScan(@Nullable ReadableArray filteredUUIDs, @Nullable ReadableMap options) {
        UUID[] uuids = null;

        if (filteredUUIDs != null) {
            uuids = UUIDConverter.convert(filteredUUIDs);
            if (uuids == null) {
                sendEvent(Event.ScanEvent,
                        BleError.invalidUUIDs(ReadableArrayConverter.toStringArray(filteredUUIDs)).toJSCallback());
                return;
            }
        }

        safeStartDeviceScan(uuids);
    }

    private void safeStartDeviceScan(final UUID[] uuids) {
        scanSubscription = rxBleClient
                .scanBleDevices(uuids)
                .subscribe(new Action1<RxBleScanResult>() {
                    @Override
                    public void call(RxBleScanResult rxBleScanResult) {
                        sendEvent(Event.ScanEvent, converter.scanResult.toJSCallback(rxBleScanResult));
                    }
                }, new Action1<Throwable>() {
                    @Override
                    public void call(Throwable throwable) {
                        sendEvent(Event.ScanEvent, errorConverter.toError(throwable).toJSCallback());
                    }
                });
    }

    @ReactMethod
    public void stopDeviceScan() {
        if (scanSubscription != null) {
            if (!scanSubscription.isUnsubscribed()) {
                scanSubscription.unsubscribe();
            }
            scanSubscription = null;
        }
    }

    // Mark: Connection management -----------------------------------------------------------------

    @ReactMethod
    public void connectToDevice(final String deviceId, @Nullable ReadableMap options, final Promise promise) {
        final SafePromise safePromise = new SafePromise(promise);

        final RxBleDevice device = rxBleClient.getBleDevice(deviceId);
        if (device == null) {
            BleError.deviceNotFound(deviceId).reject(safePromise);
            return;
        }

        boolean autoConnect = false;
        if (options != null) {
            autoConnect = options.getBoolean("autoConnect");
        }

        safeConnectToDevice(device, autoConnect, new SafePromise(promise));
    }

    private void safeConnectToDevice(final RxBleDevice device, boolean autoConnect, final SafePromise promise) {
        final Subscription subscription = device
                .establishConnection(getReactApplicationContext(), autoConnect)
                .doOnUnsubscribe(new Action0() {
                    @Override
                    public void call() {
                        BleError.cancelled().reject(promise);
                        onDeviceDisconnected(device);
                    }
                })
                .subscribe(new Observer<RxBleConnection>() {
                    @Override
                    public void onCompleted() {
                    }

                    @Override
                    public void onError(Throwable e) {
                        errorConverter.toError(e).reject(promise);
                        onDeviceDisconnected(device);
                    }

                    @Override
                    public void onNext(RxBleConnection connection) {
                        connectionMap.put(device.getMacAddress(), connection);
                        promise.resolve(converter.device.toJSObject(device));
                    }
                });

        connectingDevices.replaceSubscription(device.getMacAddress(), subscription);
    }

    // TODO: Consider passing error if available
    private void onDeviceDisconnected(RxBleDevice device) {
        connectingDevices.removeSubscription(device.getMacAddress());
        connectionMap.remove(device.getMacAddress());
        sendEvent(Event.DisconnectionEvent, converter.device.toJSCallback(device));
    }

    @ReactMethod
    public void cancelDeviceConnection(String deviceId, Promise promise) {
        final RxBleDevice device = rxBleClient.getBleDevice(deviceId);

        if (connectingDevices.removeSubscription(deviceId) && device != null) {
            promise.resolve(converter.device.toJSObject(device));
        } else {
            if (device == null) {
                BleError.deviceNotFound(deviceId).reject(promise);
            } else {
                BleError.deviceNotConnected(deviceId).reject(promise);
            }
        }
    }

    @ReactMethod
    public void isDeviceConnected(String deviceId, Promise promise) {
        final RxBleDevice device = rxBleClient.getBleDevice(deviceId);
        if (device == null) {
            BleError.deviceNotFound(deviceId).reject(promise);
            return;
        }

        boolean connected = device.getConnectionState()
                .equals(RxBleConnection.RxBleConnectionState.CONNECTED);
        promise.resolve(connected);
    }

    // Mark: Discovery -----------------------------------------------------------------------------

    @ReactMethod
    public void discoverAllServicesAndCharacteristicsForDevice(String deviceId, final Promise promise) {
        final RxBleDevice device = rxBleClient.getBleDevice(deviceId);
        if (device == null) {
            BleError.deviceNotFound(deviceId).reject(promise);
            return;
        }

        final RxBleConnection rxBleConnection = connectionMap.get(deviceId);
        if (rxBleConnection == null) {
            BleError.deviceNotConnected(deviceId).reject(promise);
            return;
        }

        safeDiscoverAllServicesAndCharacteristicsForDevice(rxBleConnection, device, new SafePromise(promise));
    }

    // TODO: Transaction for subscription (allows to cancel)
    private void safeDiscoverAllServicesAndCharacteristicsForDevice(final RxBleConnection connection,
                                                                    final RxBleDevice device,
                                                                    final SafePromise promise) {
        connection.discoverServices().subscribe(new Observer<RxBleDeviceServices>() {
            @Override
            public void onCompleted() {
                promise.resolve(converter.device.toJSObject(device));
            }

            @Override
            public void onError(Throwable e) {
                errorConverter.toError(e).reject(promise);
            }

            @Override
            public void onNext(RxBleDeviceServices rxBleDeviceServices) {

            }
        });
    }

    // Mark: Service and characteristic getters ----------------------------------------------------

    @ReactMethod
    public void servicesForDevice(final String deviceId, final Promise promise) {
        final RxBleDevice device = rxBleClient.getBleDevice(deviceId);
        if (device == null) {
            BleError.deviceNotFound(deviceId).reject(promise);
            return;
        }

        final RxBleConnection rxBleConnection = connectionMap.get(deviceId);
        if (rxBleConnection == null) {
            BleError.deviceNotConnected(deviceId).reject(promise);
            return;
        }

        safeServicesForDevice(rxBleConnection, device, new SafePromise(promise));
    }

    // TODO: Consider subscription
    private void safeServicesForDevice(RxBleConnection connection, final RxBleDevice device, final SafePromise promise) {
        connection.discoverServices()
                .subscribe(new Observer<RxBleDeviceServices>() {
                    @Override
                    public void onCompleted() {

                    }

                    @Override
                    public void onError(Throwable e) {
                        BleError.deviceNotFound(device.getMacAddress()).reject(promise);
                    }

                    @Override
                    public void onNext(RxBleDeviceServices bluetoothGattServices) {
                        WritableArray jsServices = Arguments.createArray();
                        for (BluetoothGattService service : bluetoothGattServices.getBluetoothGattServices()) {
                            WritableMap jsService = converter.service.toJSObject(service);
                            jsService.putString("deviceUUID", device.getMacAddress());
                            jsServices.pushMap(jsService);
                        }
                        promise.resolve(jsServices);
                    }
                });
    }

    @ReactMethod
    public void characteristicsForDevice(final String deviceId, final String serviceUUID, final Promise promise) {
        final RxBleDevice device = rxBleClient.getBleDevice(deviceId);
        if (device == null) {
            BleError.deviceNotFound(deviceId).reject(promise);
            return;
        }

        final RxBleConnection rxBleConnection = connectionMap.get(deviceId);
        if (rxBleConnection == null) {
            BleError.deviceNotConnected(deviceId).reject(promise);
            return;
        }

        final UUID convertedServiceUUID = UUIDConverter.convert(serviceUUID);
        if (convertedServiceUUID == null) {
            BleError.invalidUUIDs(serviceUUID).reject(promise);
            return;
        }

        safeCharacteristicsForDevice(rxBleConnection, device, convertedServiceUUID, new SafePromise(promise));
    }

    private void safeCharacteristicsForDevice(final RxBleConnection connection,
                                              final RxBleDevice device,
                                              final UUID serviceUUID,
                                              final SafePromise promise) {
        connection.discoverServices()
                .subscribe(new Observer<RxBleDeviceServices>() {
                    @Override
                    public void onCompleted() {

                    }

                    @Override
                    public void onError(Throwable e) {
                        BleError.deviceNotFound(device.getMacAddress()).reject(promise);
                    }

                    @Override
                    public void onNext(RxBleDeviceServices bluetoothGattServices) {
                        BluetoothGattService foundService = null;
                        for (BluetoothGattService service : bluetoothGattServices.getBluetoothGattServices()) {
                            if (service.getUuid().equals(serviceUUID)) {
                                foundService = service;
                                break;
                            }
                        }

                        if (foundService == null) {
                            BleError.serviceNotFound(UUIDConverter.fromUUID(serviceUUID)).reject(promise);
                            return;
                        }

                        WritableArray jsCharacteristics = Arguments.createArray();
                        for (BluetoothGattCharacteristic characteristic : foundService.getCharacteristics()) {
                            WritableMap value = converter.characteristic.toJSObject(characteristic);
                            value.putString("deviceUUID", device.getMacAddress());
                            value.putString("serviceUUID", UUIDConverter.fromUUID(serviceUUID));
                            jsCharacteristics.pushMap(value);
                        }

                        promise.resolve(jsCharacteristics);
                    }
                });
    }

    // Mark: Characteristics operations ------------------------------------------------------------

    @ReactMethod
    public void writeCharacteristicForDevice(final String deviceId,
                                             final String serviceUUID,
                                             final String characteristicUUID,
                                             final String valueBase64,
                                             final Boolean response,
                                             final String transactionId,
                                             final Promise promise) {

        final SafePromise safePromise = new SafePromise(promise);

        final RxBleDevice device = rxBleClient.getBleDevice(deviceId);
        if (device == null) {
            BleError.deviceNotFound(deviceId).reject(safePromise);
            return;
        }

        final RxBleConnection rxBleConnection = connectionMap.get(deviceId);
        if (rxBleConnection == null) {
            BleError.deviceNotConnected(deviceId).reject(safePromise);
            return;
        }

        final UUID[] UUIDs = UUIDConverter.convert(serviceUUID, characteristicUUID);
        if (UUIDs == null) {
            BleError.invalidUUIDs(serviceUUID, characteristicUUID).reject(safePromise);
            return;
        }

        final byte[] value;
        try {
            value = Base64.decode(valueBase64, Base64.DEFAULT);
        } catch (Throwable e) {
            BleError.invalidWriteDataForCharacteristic(valueBase64, characteristicUUID).reject(safePromise);
            return;
        }

        safeWriteCharacteristicForDevice(
                rxBleConnection,
                device,
                UUIDs[0],
                UUIDs[1],
                value,
                response == null ? false : response,
                transactionId,
                new SafePromise(promise));
    }

    private void safeWriteCharacteristicForDevice(final RxBleConnection connection,
                                                  final RxBleDevice device,
                                                  final UUID serviceUUID,
                                                  final UUID characteristicUUID,
                                                  final byte[] value,
                                                  final boolean response,
                                                  final String transactionId,
                                                  final SafePromise promise) {
        final Subscription subscription = connection.discoverServices()
                .flatMap(new Func1<RxBleDeviceServices, Observable<BluetoothGattCharacteristic>>() {
                    @Override
                    public Observable<BluetoothGattCharacteristic> call(RxBleDeviceServices rxBleDeviceServices) {
                        return rxBleDeviceServices.getCharacteristic(serviceUUID, characteristicUUID);
                    }
                })
                .flatMap(new Func1<BluetoothGattCharacteristic, Observable<byte[]>>() {
                    @Override
                    public Observable<byte[]> call(BluetoothGattCharacteristic bluetoothGattCharacteristic) {
                        bluetoothGattCharacteristic.setWriteType(
                                response ?
                                        BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT :
                                        BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE);
                        return connection.writeCharacteristic(bluetoothGattCharacteristic, value);
                    }
                }, new Func2<BluetoothGattCharacteristic, byte[], Pair<BluetoothGattCharacteristic, byte[]>>() {
                    @Override
                    public Pair<BluetoothGattCharacteristic, byte[]> call(BluetoothGattCharacteristic bluetoothGattCharacteristic, byte[] bytes) {
                        return new Pair<>(bluetoothGattCharacteristic, bytes);
                    }
                })
                .doOnUnsubscribe(new Action0() {
                    @Override
                    public void call() {
                        BleError.cancelled().reject(promise);
                        transactions.removeSubscription(transactionId);
                    }
                })
                .subscribe(new Observer<Pair<BluetoothGattCharacteristic, byte[]>>() {
                    @Override
                    public void onCompleted() {
                        transactions.removeSubscription(transactionId);
                    }

                    @Override
                    public void onError(Throwable e) {
                        if (e instanceof BleCharacteristicNotFoundException) {
                            BleError.characteristicNotFound(UUIDConverter.fromUUID(characteristicUUID)).reject(promise);
                            return;
                        }
                        errorConverter.toError(e).reject(promise);
                        transactions.removeSubscription(transactionId);
                    }

                    @Override
                    public void onNext(Pair<BluetoothGattCharacteristic, byte[]> result) {
                        WritableMap jsObject = converter.characteristic.toJSObject(result.first);
                        jsObject.putString("deviceUUID", device.getMacAddress());
                        jsObject.putString("serviceUUID", UUIDConverter.fromUUID(serviceUUID));
                        jsObject.putString("value", Base64.encodeToString(result.second, Base64.DEFAULT));
                        promise.resolve(jsObject);
                    }
                });

        transactions.replaceSubscription(transactionId, subscription);
    }

    @ReactMethod
    public void readCharacteristicForDevice(final String deviceId,
                                            final String serviceUUID,
                                            final String characteristicUUID,
                                            final String transactionId,
                                            final Promise promise) {
        final SafePromise safePromise = new SafePromise(promise);

        final RxBleDevice device = rxBleClient.getBleDevice(deviceId);
        if (device == null) {
            BleError.deviceNotFound(deviceId).reject(safePromise);
            return;
        }

        final RxBleConnection rxBleConnection = connectionMap.get(deviceId);
        if (rxBleConnection == null) {
            BleError.deviceNotConnected(deviceId).reject(safePromise);
            return;
        }

        final UUID[] UUIDs = UUIDConverter.convert(serviceUUID, characteristicUUID);
        if (UUIDs == null) {
            BleError.invalidUUIDs(serviceUUID, characteristicUUID).reject(safePromise);
            return;
        }

        safeReadCharacteristicForDevice(
                rxBleConnection,
                device,
                UUIDs[0],
                UUIDs[1],
                transactionId,
                new SafePromise(promise));
    }

    private void safeReadCharacteristicForDevice(final RxBleConnection connection,
                                                 final RxBleDevice device,
                                                 final UUID serviceUUID,
                                                 final UUID characteristicUUID,
                                                 final String transactionId,
                                                 final SafePromise promise) {

        final Subscription subscription = connection.discoverServices()
                .flatMap(new Func1<RxBleDeviceServices, Observable<BluetoothGattCharacteristic>>() {
                    @Override
                    public Observable<BluetoothGattCharacteristic> call(RxBleDeviceServices rxBleDeviceServices) {
                        return rxBleDeviceServices.getCharacteristic(serviceUUID, characteristicUUID);
                    }
                })
                .flatMap(new Func1<BluetoothGattCharacteristic, Observable<byte[]>>() {
                    @Override
                    public Observable<byte[]> call(BluetoothGattCharacteristic bluetoothGattCharacteristic) {
                        return connection.readCharacteristic(bluetoothGattCharacteristic);
                    }
                }, new Func2<BluetoothGattCharacteristic, byte[], Pair<BluetoothGattCharacteristic, byte[]>>() {
                    @Override
                    public Pair<BluetoothGattCharacteristic, byte[]> call(BluetoothGattCharacteristic bluetoothGattCharacteristic, byte[] bytes) {
                        return new Pair<>(bluetoothGattCharacteristic, bytes);
                    }
                })
                .doOnUnsubscribe(new Action0() {
                    @Override
                    public void call() {
                        BleError.cancelled().reject(promise);
                        transactions.removeSubscription(transactionId);
                    }
                })
                .subscribe(new Observer<Pair<BluetoothGattCharacteristic, byte[]>>() {
                    @Override
                    public void onCompleted() {
                        transactions.removeSubscription(transactionId);
                    }

                    @Override
                    public void onError(Throwable e) {
                        if (e instanceof BleCharacteristicNotFoundException) {
                            BleError.characteristicNotFound(UUIDConverter.fromUUID(characteristicUUID)).reject(promise);
                            return;
                        }
                        errorConverter.toError(e).reject(promise);
                        transactions.removeSubscription(transactionId);
                    }

                    @Override
                    public void onNext(Pair<BluetoothGattCharacteristic, byte[]> result) {
                        WritableMap jsObject = converter.characteristic.toJSObject(result.first);
                        jsObject.putString("deviceUUID", device.getMacAddress());
                        jsObject.putString("serviceUUID", UUIDConverter.fromUUID(serviceUUID));
                        jsObject.putString("value", Base64.encodeToString(result.second, Base64.DEFAULT));
                        promise.resolve(jsObject);
                    }
                });

        transactions.replaceSubscription(transactionId, subscription);
    }

    @ReactMethod
    public void monitorCharacteristicForDevice(final String deviceId,
                                               final String serviceUUID,
                                               final String characteristicUUID,
                                               final String transactionId,
                                               final Promise promise) {
        final RxBleDevice device = rxBleClient.getBleDevice(deviceId);
        if (device == null) {
            BleError.deviceNotFound(deviceId).reject(promise);
            return;
        }

        final RxBleConnection rxBleConnection = connectionMap.get(deviceId);
        if (rxBleConnection == null) {
            BleError.deviceNotConnected(deviceId).reject(promise);
            return;
        }

        final UUID[] UUIDs = UUIDConverter.convert(serviceUUID, characteristicUUID);
        if (UUIDs == null) {
            BleError.invalidUUIDs(serviceUUID, characteristicUUID).reject(promise);
            return;
        }

        safeMonitorCharacteristicForDevice(
                rxBleConnection,
                device,
                UUIDs[0],
                UUIDs[1],
                transactionId,
                new SafePromise(promise));
    }

    private void safeMonitorCharacteristicForDevice(final RxBleConnection connection,
                                                    final RxBleDevice device,
                                                    final UUID serviceUUID,
                                                    final UUID characteristicUUID,
                                                    final String transactionId,
                                                    final SafePromise promise) {

        final Subscription subscription = connection.discoverServices()
                .flatMap(new Func1<RxBleDeviceServices, Observable<BluetoothGattCharacteristic>>() {
                    @Override
                    public Observable<BluetoothGattCharacteristic> call(RxBleDeviceServices rxBleDeviceServices) {
                        return rxBleDeviceServices.getCharacteristic(serviceUUID, characteristicUUID);
                    }
                })
                .flatMap(new Func1<BluetoothGattCharacteristic, Observable<Observable<byte[]>>>() {
                    @Override
                    public Observable<Observable<byte[]>> call(BluetoothGattCharacteristic bluetoothGattCharacteristic) {
                        return connection.setupNotification(bluetoothGattCharacteristic);
                    }
                }, new Func2<BluetoothGattCharacteristic, Observable<byte[]>, Pair<BluetoothGattCharacteristic, Observable<byte[]>>>() {
                    @Override
                    public Pair<BluetoothGattCharacteristic, Observable<byte[]>> call(BluetoothGattCharacteristic bluetoothGattCharacteristic, Observable<byte[]> observable) {
                        return new Pair<>(bluetoothGattCharacteristic, observable);
                    }
                })
                .flatMap(new Func1<Pair<BluetoothGattCharacteristic, Observable<byte[]>>, Observable<byte[]>>() {
                    @Override
                    public Observable<byte[]> call(Pair<BluetoothGattCharacteristic, Observable<byte[]>> bluetoothGattCharacteristicObservablePair) {
                        return bluetoothGattCharacteristicObservablePair.second;
                    }
                }, new Func2<Pair<BluetoothGattCharacteristic, Observable<byte[]>>, byte[], Pair<BluetoothGattCharacteristic, byte[]>>() {
                    @Override
                    public Pair<BluetoothGattCharacteristic, byte[]> call(Pair<BluetoothGattCharacteristic, Observable<byte[]>> bluetoothGattCharacteristicObservablePair, byte[] bytes) {
                        return new Pair<>(bluetoothGattCharacteristicObservablePair.first, bytes);
                    }
                })
                .doOnUnsubscribe(new Action0() {
                    @Override
                    public void call() {
                        promise.resolve(null);
                        transactions.removeSubscription(transactionId);
                    }
                })
                .subscribe(new Observer<Pair<BluetoothGattCharacteristic, byte[]>>() {
                    @Override
                    public void onCompleted() {
                        promise.resolve(null);
                        transactions.removeSubscription(transactionId);
                    }

                    @Override
                    public void onError(Throwable e) {
                        errorConverter.toError(e).reject(promise);
                        transactions.removeSubscription(transactionId);
                    }

                    @Override
                    public void onNext(Pair<BluetoothGattCharacteristic, byte[]> result) {
                        sendNotification(
                                device.getMacAddress(),
                                UUIDConverter.fromUUID(serviceUUID),
                                result.second,
                                transactionId,
                                result.first);
                    }
                });

        transactions.replaceSubscription(transactionId, subscription);
    }

    // Mark: Private -------------------------------------------------------------------------------

    private void sendEvent(Event event, @Nullable Object params) {
        getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(event.name, params);
    }

    private void sendNotification(final String deviceId,
                                  final String serviceUUID,
                                  final byte[] value,
                                  final String transactionId,
                                  final BluetoothGattCharacteristic characteristic) {

        WritableMap jsObject = converter.characteristic.toJSObject(characteristic);
        jsObject.putString("deviceUUID", deviceId);
        jsObject.putString("serviceUUID", serviceUUID);
        jsObject.putString("value", Base64.encodeToString(value, Base64.DEFAULT));

        WritableArray jsResult = Arguments.createArray();
        jsResult.pushNull();
        jsResult.pushMap(jsObject);
        jsResult.pushString(transactionId);

        sendEvent(Event.ReadEvent, jsResult);
    }
}
