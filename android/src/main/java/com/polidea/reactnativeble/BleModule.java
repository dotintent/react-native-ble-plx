package com.polidea.reactnativeble;

import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattService;
import android.support.annotation.Nullable;
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
import com.polidea.rxandroidble.RxBleClient;
import com.polidea.rxandroidble.RxBleConnection;
import com.polidea.rxandroidble.RxBleDevice;
import com.polidea.rxandroidble.RxBleDeviceServices;
import com.polidea.rxandroidble.RxBleScanResult;
import com.polidea.rxandroidble.exceptions.BleCharacteristicNotFoundException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import rx.Observable;
import rx.Observer;
import rx.Subscription;
import rx.functions.Action0;
import rx.functions.Action1;
import rx.functions.Func1;

public class BleModule extends ReactContextBaseJavaModule {

    private static final String NAME = "BleClientManager";
    private static final String TAG = BleModule.class.getSimpleName();
    private final ErrorConverter errorConverter = new ErrorConverter();
    private final JSObjectConverterManager converter = new JSObjectConverterManager();

    private RxBleClient rxBleClient;
    private HashMap<String, RxBleConnection> connectionMap;
    private final HashMap<String, String> notificationMap = new HashMap<>();

    private Subscription scanSubscription;
    private final DisposableMap transactions = new DisposableMap();
    private final DisposableMap connectingDevices = new DisposableMap();

    public BleModule(ReactApplicationContext reactContext) {
        super(reactContext);
        connectionMap = new HashMap<>();
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
        if (scanSubscription != null && !scanSubscription.isUnsubscribed()) {
            scanSubscription.unsubscribe();
            scanSubscription = null;
        }

        rxBleClient = null;
    }

    // Mark: Common --------------------------------------------------------------------------------

    @ReactMethod
    public void cancelTransaction(String transactionId) {
        transactions.removeSubscription(transactionId);
    }

    // Mark: Monitoring state ----------------------------------------------------------------------

    @ReactMethod
    public void state(Promise promise) {

    }

    // TODO: On state change

    // Mark: Scanning ------------------------------------------------------------------------------

    @ReactMethod
    public void startDeviceScan(@Nullable ReadableArray filteredUUIDs, @Nullable ReadableMap options) {
        if (rxBleClient == null) {
            sendEvent(Event.ScanEvent, BleError.noClient().toJSCallback());
            return;
        }

        List<UUID> uuids = null;
        if (filteredUUIDs != null) {
            try {
                uuids = new ArrayList<>();
                for (int i = 0; i < filteredUUIDs.size(); ++i) {
                    uuids.add(UUID.fromString(filteredUUIDs.getString(i)));
                }
            } catch (Exception e) {
                List<String> stringUUIDs = new ArrayList<>();
                for (int i = 0; i < filteredUUIDs.size(); ++i) {
                    stringUUIDs.add(filteredUUIDs.getString(i));
                }
                sendEvent(Event.ScanEvent, BleError.invalidUUIDs(stringUUIDs));
            }
        }

        scanSubscription = rxBleClient
                .scanBleDevices(uuids != null ? uuids.toArray(new UUID[uuids.size()]) : null)
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
            scanSubscription.unsubscribe();
            scanSubscription = null;
        }
    }

    // Mark: Connection management -----------------------------------------------------------------

    @ReactMethod
    public void connectToDevice(final String deviceId, @Nullable ReadableMap options, final Promise promise) {
        final RxBleDevice device = rxBleClient.getBleDevice(deviceId);
        if (device == null) {
            BleError.deviceNotFound(deviceId).reject(promise);
            return;
        }

        boolean autoConnect = false;
        if (options != null) {
            autoConnect = options.getBoolean("autoConnect");
        }


        final AtomicBoolean finished = new AtomicBoolean();
        final Subscription subscription = device
                .establishConnection(getReactApplicationContext(), autoConnect)
                .doOnUnsubscribe(new Action0() {
                    @Override
                    public void call() {
                        onDeviceDisconnected(deviceId, device);
                        if (finished.compareAndSet(false, true)) {
                            BleError.cancelled().reject(promise);
                        }
                    }
                })
                .subscribe(new Observer<RxBleConnection>() {
                    @Override
                    public void onCompleted() {
                    }

                    @Override
                    public void onError(Throwable e) {
                        if (finished.compareAndSet(false, true)) {
                            errorConverter.toError(e).reject(promise);
                        }
                        onDeviceDisconnected(deviceId, device);
                    }

                    @Override
                    public void onNext(RxBleConnection connection) {
                        if (finished.compareAndSet(false, true)) {
                            connectionMap.put(deviceId, connection);
                            promise.resolve(converter.device.toJSObject(device));
                        }
                    }
                });

        connectingDevices.replaceSubscription(deviceId, subscription);
    }

    private void onDeviceDisconnected(String deviceId, RxBleDevice device) {
        connectingDevices.removeSubscription(deviceId);
        connectionMap.remove(deviceId);
        // TODO: Pass error as well?
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

        // TODO: Transaction for subscription
        rxBleConnection.discoverServices().subscribe(new Observer<RxBleDeviceServices>() {
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

        rxBleConnection.discoverServices()
                .map(new Func1<RxBleDeviceServices, List<BluetoothGattService>>() {
                    @Override
                    public List<BluetoothGattService> call(RxBleDeviceServices rxBleDeviceServices) {
                        return rxBleDeviceServices.getBluetoothGattServices();
                    }
                })
                .subscribe(new Observer<List<BluetoothGattService>>() {
                    @Override
                    public void onCompleted() {

                    }

                    @Override
                    public void onError(Throwable e) {
                        BleError.deviceNotFound(deviceId).reject(promise);
                    }

                    @Override
                    public void onNext(List<BluetoothGattService> bluetoothGattServices) {
                        WritableArray jsServices = Arguments.createArray();
                        for (BluetoothGattService service : bluetoothGattServices) {
                            WritableMap jsService = converter.service.toJSObject(service);
                            jsService.putString("deviceUUID", deviceId);
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

        rxBleConnection.discoverServices()
                .map(new Func1<RxBleDeviceServices, List<BluetoothGattService>>() {
                    @Override
                    public List<BluetoothGattService> call(RxBleDeviceServices rxBleDeviceServices) {
                        return rxBleDeviceServices.getBluetoothGattServices();
                    }
                })
                .subscribe(new Observer<List<BluetoothGattService>>() {
                    @Override
                    public void onCompleted() {

                    }

                    @Override
                    public void onError(Throwable e) {
                        BleError.deviceNotFound(deviceId).reject(promise);
                    }

                    @Override
                    public void onNext(List<BluetoothGattService> bluetoothGattServices) {
                        BluetoothGattService foundService = null;
                        for (BluetoothGattService service : bluetoothGattServices) {
                            if (service.getUuid().toString().equals(serviceUUID)) {
                                foundService = service;
                                break;
                            }
                        }

                        if (foundService == null) {
                            BleError.serviceNotFound(serviceUUID).reject(promise);
                            return;
                        }

                        WritableArray jsCharacteristics = Arguments.createArray();
                        for (BluetoothGattCharacteristic characteristic : foundService.getCharacteristics()) {
                            WritableMap value = converter.characteristic.toJSObject(characteristic);
                            value.putString("deviceUUID", deviceId);
                            value.putString("serviceUUID", serviceUUID);
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

        final UUID uuid = getUUID(characteristicUUID);
        if (uuid == null) {
            BleError.invalidUUID(characteristicUUID).reject(promise);
            return;
        }

        final AtomicBoolean finished = new AtomicBoolean();
        final AtomicReference<BluetoothGattCharacteristic> characteristic = new AtomicReference<>();
        final Subscription subscription = rxBleConnection.getCharacteristic(uuid)
                .flatMap(new Func1<BluetoothGattCharacteristic, Observable<byte[]>>() {
                    @Override
                    public Observable<byte[]> call(BluetoothGattCharacteristic bluetoothGattCharacteristic) {
                        bluetoothGattCharacteristic.setWriteType(response ? BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT : BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE);
                        characteristic.set(bluetoothGattCharacteristic);
                        return rxBleConnection.writeCharacteristic(bluetoothGattCharacteristic, Base64.decode(valueBase64, Base64.DEFAULT));
                    }
                })
                .doOnUnsubscribe(new Action0() {
                    @Override
                    public void call() {
                        if (!finished.get()) {
                            transactions.removeSubscription(transactionId);
                            BleError.cancelled().reject(promise);
                        }
                    }
                })
                .subscribe(new Observer<byte[]>() {
                    @Override
                    public void onCompleted() {
                        finished.set(true);
                        transactions.removeSubscription(transactionId);
                        WritableMap jsObject = converter.characteristic.toJSObject(characteristic.get());
                        jsObject.putString("deviceUUID", deviceId);
                        jsObject.putString("serviceUUID", serviceUUID);
                        promise.resolve(jsObject);
                    }

                    @Override
                    public void onError(Throwable e) {
                        finished.set(true);
                        transactions.removeSubscription(transactionId);
                        if (e instanceof BleCharacteristicNotFoundException) {
                            BleError.characteristicNotFound(characteristicUUID).reject(promise);
                            return;
                        }
                        errorConverter.toError(e).reject(promise);
                    }

                    @Override
                    public void onNext(byte[] bytes) {

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

        final UUID uuid = getUUID(characteristicUUID);
        if (uuid == null) {
            BleError.invalidUUID(characteristicUUID).reject(promise);
            return;
        }

        final AtomicBoolean finished = new AtomicBoolean();
        final AtomicReference<BluetoothGattCharacteristic> characteristic = new AtomicReference<>();
        final Subscription subscription = rxBleConnection.getCharacteristic(uuid)
                .flatMap(new Func1<BluetoothGattCharacteristic, Observable<byte[]>>() {
                    @Override
                    public Observable<byte[]> call(BluetoothGattCharacteristic bluetoothGattCharacteristic) {
                        characteristic.set(bluetoothGattCharacteristic);
                        return rxBleConnection.readCharacteristic(bluetoothGattCharacteristic);
                    }
                })
                .doOnUnsubscribe(new Action0() {
                    @Override
                    public void call() {
                        if (!finished.get()) {
                            transactions.removeSubscription(transactionId);
                            BleError.cancelled().reject(promise);
                        }
                    }
                })
                .subscribe(new Observer<byte[]>() {
                    @Override
                    public void onCompleted() {
                        finished.set(true);
                        transactions.removeSubscription(transactionId);
                        WritableMap jsObject = converter.characteristic.toJSObject(characteristic.get());
                        jsObject.putString("deviceUUID", deviceId);
                        jsObject.putString("serviceUUID", serviceUUID);
                        promise.resolve(jsObject);
                    }

                    @Override
                    public void onError(Throwable e) {
                        finished.set(true);
                        transactions.removeSubscription(transactionId);
                        if (e instanceof BleCharacteristicNotFoundException) {
                            BleError.characteristicNotFound(characteristicUUID).reject(promise);
                            return;
                        }
                        errorConverter.toError(e).reject(promise);
                    }

                    @Override
                    public void onNext(byte[] bytes) {

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

        final UUID uuid = getUUID(characteristicUUID);
        if (uuid == null) {
            BleError.invalidUUID(characteristicUUID).reject(promise);
            return;
        }

        final AtomicBoolean finished = new AtomicBoolean();
        final AtomicReference<BluetoothGattCharacteristic> characteristic = new AtomicReference<>();
        final Subscription subscription = rxBleConnection.getCharacteristic(uuid)
                .flatMap(new Func1<BluetoothGattCharacteristic, Observable<Observable<byte[]>>>() {
                    @Override
                    public Observable<Observable<byte[]>> call(BluetoothGattCharacteristic bluetoothGattCharacteristic) {
                        characteristic.set(bluetoothGattCharacteristic);
                        return rxBleConnection.setupNotification(bluetoothGattCharacteristic);
                    }
                })
                .flatMap(new Func1<Observable<byte[]>, Observable<byte[]>>() {
                    @Override
                    public Observable<byte[]> call(Observable<byte[]> observable) {
                        return observable;
                    }
                })
                .doOnUnsubscribe(new Action0() {
                    @Override
                    public void call() {
                        if (!finished.get()) {
                            removeNotification(characteristicUUID, transactionId);
                            BleError.cancelled().reject(promise);
                        }
                    }
                })
                .subscribe(new Observer<byte[]>() {
                    @Override
                    public void onCompleted() {
                        finished.set(true);
                        removeNotification(characteristicUUID, transactionId);
                        promise.resolve(null);
                    }

                    @Override
                    public void onError(Throwable e) {
                        finished.set(true);
                        removeNotification(characteristicUUID, transactionId);
                        errorConverter.toError(e).reject(promise);
                    }

                    @Override
                    public void onNext(byte[] bytes) {
                        sendNotification(deviceId, serviceUUID, characteristicUUID, transactionId, characteristic.get());
                    }
                });

        transactions.replaceSubscription(transactionId, subscription);
    }

    private void sendNotification(final String deviceId,
                                  final String serviceUUID,
                                  final String characteristicUUID,
                                  final String transactionId,
                                  final BluetoothGattCharacteristic characteristic) {
        synchronized (notificationMap) {
            String id = notificationMap.get(characteristicUUID);
            if (id == null || id.equals(transactionId)) {
                notificationMap.put(characteristicUUID, transactionId);

                WritableMap jsObject = converter.characteristic.toJSObject(characteristic);
                jsObject.putString("deviceUUID", deviceId);
                jsObject.putString("serviceUUID", serviceUUID);

                WritableArray jsResult = Arguments.createArray();
                jsResult.pushNull();
                jsResult.pushMap(jsObject);

                sendEvent(Event.ReadEvent, jsResult);
            }
        }
    }

    private void removeNotification(final String characteristicUUID,
                                    final String transactionId) {
        synchronized (notificationMap) {
            String id = notificationMap.get(characteristicUUID);
            if (id.equals(transactionId)) {
                notificationMap.remove(characteristicUUID);
            }
        }
    }

    // Mark: Private -------------------------------------------------------------------------------

    public UUID getUUID(String uuid) {
        try {
            return UUID.fromString(uuid);
        } catch (Throwable e) {
            return null;
        }
    }

    //Common support method
    private void sendEvent(Event event, @Nullable Object params) {
        getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(event.name, params);
    }
}
