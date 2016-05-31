package com.emptyproject;

import android.support.annotation.Nullable;
import com.emptyproject.converter.RxBleConnectionStateConverter;
import com.emptyproject.converter.RxBleDeviceServicesConverter;
import com.emptyproject.converter.RxBleScanResultConverter;
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
import java.util.HashMap;
import java.util.Map;
import rx.Subscription;

public class RxBleReactContextBaseJavaModule extends ReactContextBaseJavaModule {

    interface Metadata {

    }

    RxBleScanResultConverter rxBleScanResultConverter;

    RxBleConnectionStateConverter rxBleConnectionStateConverter;

    RxBleDeviceServicesConverter rxBleDeviceServicesConverter;

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
        rxBleScanResultConverter = new RxBleScanResultConverter();
        rxBleConnectionStateConverter = new RxBleConnectionStateConverter();
        rxBleDeviceServicesConverter = new RxBleDeviceServicesConverter();
        deviceMap = new HashMap<>();
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
        final WritableMap params = rxBleScanResultConverter.convert(rxBleScanResult);
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
        if (oldSubscription != null) {
            oldSubscription.unsubscribe();
        }
        final Subscription subscription = rxBleDevice
                .establishConnection(getReactApplicationContext(), autoConnect)
                .subscribe(
                        rxBleConnection -> onEstablishConnectionSuccess(mac, rxBleConnection, promise),
                        throwable -> onEstablishConnectionFailure(mac, throwable, promise));

        establishConnectionSubscriptionMap.put(mac, subscription);
    }

    private void onEstablishConnectionSuccess(String mac, RxBleConnection rxBleConnection, Promise promise) {
        connectionMap.put(mac, rxBleConnection);
        promise.resolve(mac);
    }

    private void onEstablishConnectionFailure(String mac, Throwable rxBleConnection, Promise promise) {
        deviceMap.remove(mac);
        promise.reject(rxBleConnection);
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
        promise.resolve(rxBleDeviceServicesConverter.convert(rxBleDeviceServices));
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
