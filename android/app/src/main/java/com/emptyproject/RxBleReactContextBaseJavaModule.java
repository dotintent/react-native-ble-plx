package com.emptyproject;

import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattService;
import android.support.annotation.Nullable;
import android.util.Base64;
import android.util.Log;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.polidea.rxandroidble.RxBleClient;
import com.polidea.rxandroidble.RxBleConnection;
import com.polidea.rxandroidble.RxBleDevice;
import com.polidea.rxandroidble.RxBleDeviceServices;
import com.polidea.rxandroidble.RxBleScanResult;
import com.polidea.rxandroidble.exceptions.BleDisconnectedException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.konradkrakowiak.blereactnative.converter.ConverterManager;
import rx.Observable;
import rx.Subscription;

public class RxBleReactContextBaseJavaModule extends ReactContextBaseJavaModule {

    private static final String TAG = RxBleReactContextBaseJavaModule.class.getSimpleName();

    interface Metadata {

    }


    ConverterManager converterManager;


    RxBleClient rxBleClient;

    Subscription scanBleDevicesSubscription;

    //TODO maps are not the best solution!!!

    Map<String, RxBleDevice> deviceMap;

    Map<String, RxBleConnection> connectionMap;

    Map<String, RxBleDeviceServices> deviceServicesMap;

    Map<String, Subscription> establishConnectionSubscriptionMap;

    Map<String, Subscription> establishDeviceServicesSubscriptionMap;


    public RxBleReactContextBaseJavaModule(ReactApplicationContext reactContext) {
        super(reactContext);
        converterManager = new ConverterManager();
        deviceMap = new HashMap<>();
        deviceServicesMap = new HashMap<>();
        establishConnectionSubscriptionMap = new HashMap<>();
        establishDeviceServicesSubscriptionMap = new HashMap<>();
        connectionMap = new HashMap<>();
    }

    @Override
    public String getName() {
        return "RxBleClient";
    }

    @ReactMethod
    public void createContext(Callback success) {
        rxBleClient = RxBleClient.create(getReactApplicationContext());
        success.invoke(true);
    }

    @ReactMethod
    public void scanBleDevices() {
        scanBleDevicesSubscription = rxBleClient.scanBleDevices().subscribe(
                this::sendEventOnScanBleDevice,
                throwable -> {

                }
        );
    }

    private void sendEventOnScanBleDevice(RxBleScanResult rxBleScanResult) {
        final WritableMap params = converterManager.convert(rxBleScanResult);
        final RxBleDevice bleDevice = rxBleScanResult.getBleDevice();
        deviceMap.put(bleDevice.getMacAddress(), bleDevice);
        sendEvent(getReactApplicationContext(), "BLE_SCAN_RESULT", params);
    }

    @ReactMethod
    public void establishConnection(String mac, boolean autoConnect, Promise promise) {
        final RxBleDevice rxBleDevice = deviceMap.get(mac);
        if (rxBleDevice == null) {
            promise.reject(new RuntimeException()); // Todo Create NoFoundDeviceException or sth like that.
            return;
        }

        final Subscription oldSubscription = establishConnectionSubscriptionMap.get(mac);
        if (oldSubscription != null && !oldSubscription.isUnsubscribed()) {
            return;
        }
        final RxBleConnection connection = connectionMap.get(mac);
        if (!rxBleDevice.getConnectionState().equals(RxBleConnection.RxBleConnectionState.CONNECTED) && connection != null) {
            promise.resolve(mac);
            return;
        }

        final Subscription subscription = rxBleDevice
                .establishConnection(getReactApplicationContext(), autoConnect)
                .subscribe(
                        rxBleConnection -> onEstablishConnectionSuccess(mac, rxBleConnection, promise),
                        throwable -> onEstablishConnectionFailure(mac, throwable, promise),
                        () -> Log.d(TAG, "establishConnection onComplete for " + mac));
        establishConnectionSubscriptionMap.put(mac, subscription);

        Observable.just(Observable.just("test")).flatMap(obs -> obs).subscribe(str -> str.substring(1));
    }

    private void onEstablishConnectionSuccess(String mac, RxBleConnection rxBleConnection, Promise promise) {
        connectionMap.put(mac, rxBleConnection);
        promise.resolve(mac);
    }

    private void onEstablishConnectionFailure(String mac, Throwable throwable, Promise promise) {
        final Subscription establishConnectionSubscription = establishConnectionSubscriptionMap.get(mac);
        if (establishConnectionSubscription != null) {
            establishConnectionSubscription.unsubscribe();
            establishConnectionSubscriptionMap.remove(mac);
        }
        connectionMap.remove(mac);
        promise.reject(throwable);
    }

    @ReactMethod
    public void discoverServices(String mac, Promise promise) {
        final RxBleConnection rxBleConnection = connectionMap.get(mac);
        if (rxBleConnection == null) {
            promise.reject(new RuntimeException()); // Todo Create NoFoundConnectionException or sth like that.
            return;
        }
        final Subscription subscribe = rxBleConnection.discoverServices()
                .subscribe(
                        rxBleDeviceServices -> onDiscoverDeviceServicesSuccess(mac, rxBleDeviceServices, promise));
        establishDeviceServicesSubscriptionMap.put(mac, subscribe);
    }

    private void onDiscoverDeviceServicesSuccess(String mac, RxBleDeviceServices rxBleDeviceServices, Promise promise) {
        deviceServicesMap.put(mac, rxBleDeviceServices);
        promise.resolve(converterManager.convert(rxBleDeviceServices));
    }

    @ReactMethod
    public void getService(String mac, String uuid, Promise promise) {
        final RxBleDeviceServices rxBleDeviceServices = deviceServicesMap.get(mac);
        if (rxBleDeviceServices == null) {
            promise.reject(new RuntimeException("NoSuchServiceException for " + mac)); // TODO Create NoSuchServiceException
            return;
        }

        final Subscription subscribe = rxBleDeviceServices
                .getService(UUID.fromString(uuid))
                .subscribe(bluetoothGattService -> onGetServiceSuccess(bluetoothGattService, promise),
                        throwable -> onGetCharacteristicFailure(throwable, promise));
    }

    private void onGetServiceSuccess(BluetoothGattService bluetoothGattService, Promise promise) {
        Log.d(TAG, "Characteristic is read");
        promise.resolve(bluetoothGattService.getUuid().toString());
    }

    private void onGetServiceFailure(Throwable throwable, Promise promise) {
        Log.d(TAG, "Characteristic reading is failure");
        promise.reject(throwable);
    }

    @ReactMethod
    public void getFirstCharacteristic(String mac, String characteristicUUID, Promise promise) {
        final RxBleDeviceServices rxBleDeviceServices = deviceServicesMap.get(mac);
        if (rxBleDeviceServices == null) {
            promise.reject(new RuntimeException("NoSuchServiceException for " + mac)); // TODO Create NoSuchServiceException
            return;
        }

        final Subscription subscribe = rxBleDeviceServices
                .getCharacteristic(UUID.fromString(characteristicUUID))
                .subscribe(bluetoothGattCharacteristic -> onGetCharacteristicSuccess(bluetoothGattCharacteristic, promise),
                        throwable -> onGetCharacteristicFailure(throwable, promise));
    }

    @ReactMethod
    public void getCharacteristic(String mac, String serviceUUID, String characteristicUUID, Promise promise) {
        final RxBleDeviceServices rxBleDeviceServices = deviceServicesMap.get(mac);
        if (rxBleDeviceServices == null) {
            promise.reject(new RuntimeException("NoSuchServiceException for " + mac)); // TODO Create NoSuchServiceException
            return;
        }
        final Subscription subscribe = rxBleDeviceServices
                .getCharacteristic(UUID.fromString(serviceUUID), UUID.fromString(characteristicUUID))
                .subscribe(bluetoothGattCharacteristic -> onGetCharacteristicSuccess(bluetoothGattCharacteristic, promise),
                        throwable -> onGetCharacteristicFailure(throwable, promise));
    }

    private void onGetCharacteristicSuccess(BluetoothGattCharacteristic bluetoothGattCharacteristic, Promise promise) {
        Log.d(TAG, "Characteristic is read");
        promise.resolve(bluetoothGattCharacteristic.getUuid().toString());
    }

    private void onGetCharacteristicFailure(Throwable throwable, Promise promise) {
        Log.d(TAG, "Characteristic reading is failure");
        promise.reject(throwable);
    }

    @ReactMethod
    public void readCharacteristic(String mac, String uuid, Promise promise) {
        final RxBleConnection rxBleConnection = connectionMap.get(mac);
        if (rxBleConnection == null) {
            promise.reject(new RuntimeException("NoSuchConnection for " + mac)); // TODO Create NoSuchConnection
            return;
        }
        final Subscription subscribe = rxBleConnection.readCharacteristic(UUID.fromString(uuid))
                .doOnNext(xx -> doOnNext())
                .subscribe(bytes -> onReadCharacteristicSuccess(promise, bytes));
    }

    private void doOnNext() {
        Log.d(TAG, "doOnNext: test");
    }

    private void onReadCharacteristicSuccess(Promise promise, byte[] bytes) {
        promise.resolve(Base64.encodeToString(bytes, Base64.DEFAULT));
        Log.d(TAG, "onReadCharacteristicSuccess: " + Arrays.toString(bytes));
    }

    @ReactMethod
    public void writeCharacteristic(String mac, String uuid, String data, Promise promise) {
        final RxBleConnection rxBleConnection = connectionMap.get(mac);
        if (rxBleConnection == null) {
            promise.reject(new RuntimeException("NoSuchConnection for " + mac)); // TODO Create NoSuchConnection
            return;
        }
        final Subscription subscribe = rxBleConnection.writeCharacteristic(UUID.fromString(uuid), Base64.decode(data, Base64.DEFAULT))
                .subscribe(bytes -> onWriteCharacteristicSuccess(promise, bytes));
    }

    private void onWriteCharacteristicSuccess(Promise promise, byte[] bytes) {
        promise.resolve(Base64.encodeToString(bytes, Base64.DEFAULT));
        Log.d(TAG, "onWriteCharacteristicSuccess: " + Arrays.toString(bytes));
    }

    private static final UUID accelerometerCharacteristicDataUuid = UUID.fromString("F000AA11-0451-4000-B000-000000000000");

    private static final UUID accelerometerCharacteristicConfigUuid = UUID.fromString("F000AA12-0451-4000-B000-000000000000");

    @ReactMethod
    public void xxXX() {
        final RxBleDevice bleDevice = rxBleClient.getBleDevice("34:B1:F7:D5:04:01");
        final Subscription dataSubscription = bleDevice
                .establishConnection(getReactApplicationContext(), false)
                .flatMap(rxBleConnection ->
                        rxBleConnection.writeCharacteristic(accelerometerCharacteristicConfigUuid, new byte[]{1})
                                .flatMap(ignoredBytes -> rxBleConnection.setupNotification(accelerometerCharacteristicDataUuid))
                )
                .flatMap(observable -> observable)
                .retryWhen(observable -> observable.delay(5, TimeUnit.SECONDS).filter(throwable -> throwable instanceof BleDisconnectedException))
                .subscribe(
                        this::onNotification//,
//                        throwable -> Toast.makeText(this, throwable.toString(), Toast.LENGTH_LONG).show()
                );
    }

    @ReactMethod
    public void wTeoriiDzialajacaMetoda(String mac, Promise promise) {
        final RxBleDevice rxBleDevice = deviceMap.get(mac);
        if (rxBleDevice == null) {
            promise.reject(new RuntimeException()); // Todo Create NoFoundDeviceException or sth like that.
            return;
        }

        final RxBleConnection connection = connectionMap.get(mac);
        if (connection == null) {
            return;
        }
        if (!rxBleDevice.getConnectionState().equals(RxBleConnection.RxBleConnectionState.CONNECTED)) {
            promise.reject(new RuntimeException());
            return;
        }
        connection.writeCharacteristic(accelerometerCharacteristicConfigUuid, new byte[]{1})
                .flatMap(ignoredBytes -> connection.setupNotification(accelerometerCharacteristicDataUuid))
                .flatMap(observable -> observable)
                .retryWhen(observable -> observable.delay(5, TimeUnit.SECONDS).filter(throwable -> throwable instanceof BleDisconnectedException))
                .subscribe(
                        this::onNotification//,
//                        throwable -> Toast.makeText(this, throwable.toString(), Toast.LENGTH_LONG).show()
                );
    }

    @ReactMethod
    public void setupNotification(String mac, String uuid, Promise promise) {
        final RxBleConnection rxBleConnection = connectionMap.get(mac);
        if (rxBleConnection == null) {
            promise.reject(new RuntimeException("NoSuchConnection for " + mac)); // TODO Create NoSuchConnection
            return;
        }
        final Subscription subscribe = rxBleConnection.setupNotification(UUID.fromString(uuid)).subscribe(this::onSetupNotificationSuccess,
                throwable -> Log.e(TAG, "Error : ", throwable));
    }

    private void onSetupNotificationSuccess(Observable<byte[]> byteObservable) {
        byteObservable.subscribe(this::onNotification);
        Log.d(TAG, "onWriteCharacteristicSuccess");
    }

    private void onNotification(byte[] bytes) {
        Log.d(TAG, "onWriteCharacteristicSuccess: " + Arrays.toString(bytes));
        WritableMap result = Arguments.createMap();
        result.putString("test", Arrays.toString(bytes));
        sendEvent(getReactApplicationContext(), "NOTIFICATION_EVENT", result);
    }


    @ReactMethod
    public void stopScanDevice() {
        if (scanBleDevicesSubscription == null) {
            return;
        }
        scanBleDevicesSubscription.unsubscribe();
    }

    private void sendEvent(ReactContext reactContext, String eventName, @Nullable WritableMap params) {
        reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }
}
