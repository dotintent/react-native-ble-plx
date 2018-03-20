package com.polidea.reactnativeble;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.support.annotation.RequiresApi;
import android.util.SparseArray;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.polidea.reactnativeble.converter.RxBleScanResultConverter;
import com.polidea.reactnativeble.errors.BleError;
import com.polidea.reactnativeble.errors.BleErrorUtils;
import com.polidea.reactnativeble.errors.ErrorConverter;
import com.polidea.reactnativeble.exceptions.CannotMonitorCharacteristicException;
import com.polidea.reactnativeble.utils.Base64Converter;
import com.polidea.reactnativeble.utils.DisposableMap;
import com.polidea.reactnativeble.utils.IdGenerator;
import com.polidea.reactnativeble.utils.LogLevel;
import com.polidea.reactnativeble.utils.ReadableArrayConverter;
import com.polidea.reactnativeble.utils.RefreshGattCustomOperation;
import com.polidea.reactnativeble.utils.SafePromise;
import com.polidea.reactnativeble.utils.UUIDConverter;
import com.polidea.reactnativeble.wrapper.Characteristic;
import com.polidea.reactnativeble.wrapper.Device;
import com.polidea.reactnativeble.wrapper.Service;
import com.polidea.rxandroidble.NotificationSetupMode;
import com.polidea.rxandroidble.RxBleAdapterStateObservable;
import com.polidea.rxandroidble.RxBleClient;
import com.polidea.rxandroidble.RxBleConnection;
import com.polidea.rxandroidble.RxBleDevice;
import com.polidea.rxandroidble.RxBleDeviceServices;
import com.polidea.rxandroidble.RxBleScanResult;
import com.polidea.rxandroidble.exceptions.BleCharacteristicNotFoundException;
import com.polidea.rxandroidble.internal.RxBleLog;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import rx.Observable;
import rx.Observer;
import rx.Subscription;
import rx.functions.Action0;
import rx.functions.Action1;
import rx.functions.Func1;

import static com.polidea.reactnativeble.utils.Constants.BluetoothState;

public class BleModule extends ReactContextBaseJavaModule {

    // Name of module
    private static final String NAME = "BleClientManager";

    // Value converters
    private final ErrorConverter errorConverter = new ErrorConverter();
    private final RxBleScanResultConverter scanConverter = new RxBleScanResultConverter();

    // Manager
    @Nullable
    private RxBleClient rxBleClient;

    // Map of connected devices.
    private HashMap<String, Device> connectedDevices = new HashMap<>();

    // Map of discovered services
    private SparseArray<Service> discoveredServices = new SparseArray<>();

    // Map of discovered characteristics
    private SparseArray<Characteristic> discoveredCharacteristics = new SparseArray<>();

    // Currently pending transactions
    private final DisposableMap transactions = new DisposableMap();

    // Currently connecting devices
    private final DisposableMap connectingDevices = new DisposableMap();

    // Scan subscription
    @Nullable
    private Subscription scanSubscription;

    // State subscription
    @Nullable
    private Subscription adapterStateChangesSubscription;

    // Current native library log level.
    private int currentLogLevel = RxBleLog.NONE;

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
    public void createClient(String restoreStateIdentifier) {
        final ReactApplicationContext context = getReactApplicationContext();
        rxBleClient = RxBleClient.create(context);
        adapterStateChangesSubscription = monitorAdapterStateChanges(context);

        // We need to send signal that BLE Module starts without restored state
        if (restoreStateIdentifier != null) {
            sendEvent(Event.RestoreStateEvent, null);
        }
    }

    @ReactMethod
    public void destroyClient() {
        // Subscriptions
        if (adapterStateChangesSubscription != null) {
            adapterStateChangesSubscription.unsubscribe();
            adapterStateChangesSubscription = null;
        }
        if (scanSubscription != null && !scanSubscription.isUnsubscribed()) {
            scanSubscription.unsubscribe();
            scanSubscription = null;
        }
        transactions.removeAllSubscriptions();
        connectingDevices.removeAllSubscriptions();

        // Caches
        discoveredServices.clear();
        discoveredCharacteristics.clear();
        connectedDevices.clear();

        // Clear client
        rxBleClient = null;
        IdGenerator.clear();
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

    @ReactMethod
    public void setLogLevel(String logLevel) {
        currentLogLevel = LogLevel.toLogLevel(logLevel);
        RxBleClient.setLogLevel(currentLogLevel);
    }

    @ReactMethod
    public void logLevel(Promise promise) {
        promise.resolve(LogLevel.fromLogLevel(currentLogLevel));
    }

    // Mark: Monitoring state ----------------------------------------------------------------------

    @ReactMethod
    public void state(Promise promise) {
        promise.resolve(getCurrentState());
    }

    private Subscription monitorAdapterStateChanges(Context context) {
        if (!supportsBluetoothLowEnergy()) {
            return null;
        }

        return new RxBleAdapterStateObservable(context)
                .map(new Func1<RxBleAdapterStateObservable.BleAdapterState, String>() {
                    @Override
                    public String call(RxBleAdapterStateObservable.BleAdapterState bleAdapterState) {
                        return rxAndroidBleAdapterStateToReactNativeBluetoothState(bleAdapterState);
                    }
                })
                .subscribe(new Action1<String>() {
                    @Override
                    public void call(String state) {
                        sendEvent(Event.StateChangeEvent, state);
                    }
                });
    }

    @BluetoothState
    private String getCurrentState() {
        if (!supportsBluetoothLowEnergy()) {
            return BluetoothState.UNSUPPORTED;
        }

        final ReactApplicationContext context = getReactApplicationContext();
        final BluetoothManager bluetoothManager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
        if (bluetoothManager == null) {
            return BluetoothState.POWERED_OFF;
        }
        final BluetoothAdapter bluetoothAdapter = bluetoothManager.getAdapter();
        return nativeAdapterStateToReactNativeBluetoothState(bluetoothAdapter.getState());
    }

    private boolean supportsBluetoothLowEnergy() {
        return getReactApplicationContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE);
    }

    @BluetoothState
    private String nativeAdapterStateToReactNativeBluetoothState(int adapterState) {
        switch (adapterState) {

            case BluetoothAdapter.STATE_OFF:
                return BluetoothState.POWERED_OFF;
            case BluetoothAdapter.STATE_ON:
                return BluetoothState.POWERED_ON;
            case BluetoothAdapter.STATE_TURNING_OFF:
                // fallthrough
            case BluetoothAdapter.STATE_TURNING_ON:
                return BluetoothState.RESETTING;
            default:
                return BluetoothState.UNKNOWN;
        }
    }

    @BluetoothState
    private String rxAndroidBleAdapterStateToReactNativeBluetoothState(RxBleAdapterStateObservable.BleAdapterState rxBleAdapterState) {
        if (rxBleAdapterState == RxBleAdapterStateObservable.BleAdapterState.STATE_ON) {
            return BluetoothState.POWERED_ON;
        } else if (rxBleAdapterState == RxBleAdapterStateObservable.BleAdapterState.STATE_OFF) {
            return BluetoothState.POWERED_OFF;
        } else {
            return BluetoothState.RESETTING;
        }
    }

    // Mark: Scanning ------------------------------------------------------------------------------

    @ReactMethod
    public void startDeviceScan(@Nullable ReadableArray filteredUUIDs, @Nullable ReadableMap options) {
        UUID[] uuids = null;

        if (filteredUUIDs != null) {
            uuids = UUIDConverter.convert(filteredUUIDs);
            if (uuids == null) {
                sendEvent(Event.ScanEvent,
                        BleErrorUtils.invalidIdentifiers(ReadableArrayConverter.toStringArray(filteredUUIDs)).toJSCallback());
                return;
            }
        }

        safeStartDeviceScan(uuids);
    }

    private void safeStartDeviceScan(final UUID[] uuids) {
        if (rxBleClient == null) {
            throw new IllegalStateException("BleManager not created when tried to start device scan");
        }
        scanSubscription = rxBleClient
                .scanBleDevices(uuids)
                .subscribe(new Action1<RxBleScanResult>() {
                    @Override
                    public void call(RxBleScanResult rxBleScanResult) {
                        sendEvent(Event.ScanEvent, scanConverter.toJSCallback(rxBleScanResult));
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

    // Mark: Device management ---------------------------------------------------------------------

    @ReactMethod
    public void devices(final ReadableArray deviceIdentifiers, final Promise promise) {
        if (rxBleClient == null) {
            throw new IllegalStateException("BleManager not created when tried connecting to device");
        }

        WritableArray writableArray = Arguments.createArray();
        for (int i = 0; i < deviceIdentifiers.size(); i++) {
            final String deviceId = deviceIdentifiers.getString(i);

            if (deviceId == null) {
                BleErrorUtils.invalidIdentifiers(deviceIdentifiers).reject(promise);
                return;
            }

            final RxBleDevice device = rxBleClient.getBleDevice(deviceId);
            if (device != null) {
                Device jsDevice = new Device(device, null);
                writableArray.pushMap(jsDevice.toJSObject(null));
            }
        }

        promise.resolve(writableArray);
    }

    @ReactMethod
    public void connectedDevices(final ReadableArray serviceUUIDs, final Promise promise) {
        if (rxBleClient == null) {
            throw new IllegalStateException("BleManager not created when tried connecting to device");
        }

        UUID[] uuids = new UUID[serviceUUIDs.size()];
        for (int i = 0; i < serviceUUIDs.size(); i++) {
            UUID uuid = UUIDConverter.convert(serviceUUIDs.getString(i));

            if (uuid == null) {
                BleErrorUtils.invalidIdentifiers(serviceUUIDs).reject(promise);
                return;
            }

            uuids[i] = uuid;
        }

        WritableArray writableArray = Arguments.createArray();

        for (Device device : connectedDevices.values()) {
            for (UUID uuid : uuids) {
                if (device.getServiceByUUID(uuid) != null) {
                    writableArray.pushMap(device.toJSObject(null));
                    break;
                }
            }
        }

        promise.resolve(writableArray);
    }

    // Mark: Device operations ---------------------------------------------------------------------

    @ReactMethod
    public void requestMTUForDevice(final String deviceId, int mtu, final String transactionId, final Promise promise) {
        final Device device = getDeviceOrReject(deviceId, promise);
        if (device == null) {
            return;
        }

        final RxBleConnection connection = getConnectionOrReject(device, promise);
        if (connection == null) {
            return;
        }

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            final SafePromise safePromise = new SafePromise(promise);
            final Subscription subscription = connection
                    .requestMtu(mtu)
                    .doOnUnsubscribe(new Action0() {
                        @Override
                        public void call() {
                            BleErrorUtils.cancelled().reject(safePromise);
                            transactions.removeSubscription(transactionId);
                        }
                    }).subscribe(new Observer<Integer>() {
                        @Override
                        public void onCompleted() {
                            transactions.removeSubscription(transactionId);
                        }

                        @Override
                        public void onError(Throwable e) {
                            errorConverter.toError(e).reject(safePromise);
                            transactions.removeSubscription(transactionId);
                        }

                        @Override
                        public void onNext(Integer integer) {
                            safePromise.resolve(device.toJSObject(null));
                        }
                    });

            transactions.replaceSubscription(transactionId, subscription);
        } else {
            promise.resolve(device.toJSObject(null));
        }
    }

    @ReactMethod
    public void readRSSIForDevice(final String deviceId, final String transactionId, final Promise promise) {
        final Device device = getDeviceOrReject(deviceId, promise);
        if (device == null) {
            return;
        }
        final RxBleConnection connection = getConnectionOrReject(device, promise);
        if (connection == null) {
            return;
        }

        final SafePromise safePromise = new SafePromise(promise);
        final Subscription subscription = connection
                .readRssi()
                .doOnUnsubscribe(new Action0() {
                    @Override
                    public void call() {
                        BleErrorUtils.cancelled().reject(safePromise);
                        transactions.removeSubscription(transactionId);
                    }
                })
                .subscribe(new Observer<Integer>() {
                    @Override
                    public void onCompleted() {
                        transactions.removeSubscription(transactionId);
                    }

                    @Override
                    public void onError(Throwable e) {
                        errorConverter.toError(e).reject(safePromise);
                        transactions.removeSubscription(transactionId);
                    }

                    @Override
                    public void onNext(Integer rssi) {
                        safePromise.resolve(device.toJSObject(rssi));
                    }
                });

        transactions.replaceSubscription(transactionId, subscription);
    }

    @ReactMethod
    public void connectToDevice(final String deviceId, @Nullable ReadableMap options, final Promise promise) {
        final SafePromise safePromise = new SafePromise(promise);

        if (rxBleClient == null) {
            throw new IllegalStateException("BleManager not created when tried connecting to device");
        }

        final RxBleDevice device = rxBleClient.getBleDevice(deviceId);
        if (device == null) {
            BleErrorUtils.deviceNotFound(deviceId).reject(safePromise);
            return;
        }

        boolean autoConnect = false;
        int requestMtu = 0;
        RefreshGattMoment refreshGattMoment = null;
        Integer timeout = null;

        if (options != null) {
            if (options.hasKey("autoConnect")) {
                autoConnect = options.getBoolean("autoConnect");
            }
            if (options.hasKey("requestMTU")) {
                requestMtu = options.getInt("requestMTU");
            }
            if (options.hasKey("refreshGatt")) {
                refreshGattMoment = RefreshGattMoment.byJavaScriptName(options.getString("refreshGatt"));
            }
            if (options.hasKey("timeout")) {
                timeout = options.getInt("timeout");
            }
        }

        safeConnectToDevice(device, autoConnect, requestMtu, refreshGattMoment, timeout, new SafePromise(promise));
    }

    private void safeConnectToDevice(final RxBleDevice device,
                                     final boolean autoConnect,
                                     final int requestMtu,
                                     final RefreshGattMoment refreshGattMoment,
                                     final Integer timeout,
                                     final SafePromise promise) {

        Observable<RxBleConnection> connect = device
                .establishConnection(autoConnect)
                .doOnUnsubscribe(new Action0() {
                    @Override
                    public void call() {
                        BleErrorUtils.cancelled().reject(promise);
                        onDeviceDisconnected(device, null);
                    }
                });

        if (refreshGattMoment == RefreshGattMoment.ON_CONNECTED) {
            connect = connect.flatMap(new Func1<RxBleConnection, Observable<RxBleConnection>>() {
                @Override
                public Observable<RxBleConnection> call(final RxBleConnection rxBleConnection) {
                    return rxBleConnection
                            .queue(new RefreshGattCustomOperation())
                            .map(new Func1<Boolean, RxBleConnection>() {
                                @Override
                                public RxBleConnection call(Boolean refreshGattSuccess) {
                                    return rxBleConnection;
                                }
                            });
                }
            });
        }

        if (requestMtu > 0 && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            connect = connect.flatMap(new Func1<RxBleConnection, Observable<RxBleConnection>>() {
                @RequiresApi(api = Build.VERSION_CODES.LOLLIPOP)
                @Override
                public Observable<RxBleConnection> call(final RxBleConnection rxBleConnection) {
                return rxBleConnection
                        .requestMtu(requestMtu)
                        .map(new Func1<Integer, RxBleConnection>() {
                            @Override
                            public RxBleConnection call(Integer integer) {
                                return rxBleConnection;
                                    }
                                });
                }
            });
        }

        if (timeout != null) {
            connect = connect.timeout(timeout, TimeUnit.MILLISECONDS);
        }

        final Subscription subscription = connect
                .subscribe(new Observer<RxBleConnection>() {
                    @Override
                    public void onCompleted() {
                    }

                    @Override
                    public void onError(Throwable e) {
                        BleError bleError = errorConverter.toError(e);
                        bleError.reject(promise);
                        onDeviceDisconnected(device, bleError);
                    }

                    @Override
                    public void onNext(RxBleConnection connection) {
                        Device jsDevice = new Device(device, connection);
                        cleanServicesAndCharacteristicsForDevice(jsDevice);
                        connectedDevices.put(device.getMacAddress(), jsDevice);
                        promise.resolve(jsDevice.toJSObject(null));
                    }
                });

        connectingDevices.replaceSubscription(device.getMacAddress(), subscription);
    }

    private void onDeviceDisconnected(RxBleDevice device, BleError bleError) {
        Device jsDevice = connectedDevices.remove(device.getMacAddress());
        if (jsDevice == null) {
            return;
        }

        cleanServicesAndCharacteristicsForDevice(jsDevice);
        WritableArray event = Arguments.createArray();
        if (bleError != null) {
            event.pushString(bleError.toJS());
        } else {
            event.pushNull();
        }
        event.pushMap(jsDevice.toJSObject(null));
        sendEvent(Event.DisconnectionEvent, event);
        connectingDevices.removeSubscription(device.getMacAddress());
    }

    @ReactMethod
    public void cancelDeviceConnection(String deviceId, Promise promise) {
        if (rxBleClient == null) {
            throw new IllegalStateException("BleManager not created when tried cancel device connection");
        }

        final RxBleDevice device = rxBleClient.getBleDevice(deviceId);

        if (connectingDevices.removeSubscription(deviceId) && device != null) {
            promise.resolve(new Device(device, null).toJSObject(null));
        } else {
            if (device == null) {
                BleErrorUtils.deviceNotFound(deviceId).reject(promise);
            } else {
                BleErrorUtils.deviceNotConnected(deviceId).reject(promise);
            }
        }
    }

    @ReactMethod
    public void isDeviceConnected(String deviceId, Promise promise) {
        if (rxBleClient == null) {
            throw new IllegalStateException("BleManager not created when tried cancel device connection");
        }

        final RxBleDevice device = rxBleClient.getBleDevice(deviceId);
        if (device == null) {
            BleErrorUtils.deviceNotFound(deviceId).reject(promise);
            return;
        }

        boolean connected = device.getConnectionState()
                .equals(RxBleConnection.RxBleConnectionState.CONNECTED);
        promise.resolve(connected);
    }

    // Mark: Discovery -----------------------------------------------------------------------------

    @ReactMethod
    public void discoverAllServicesAndCharacteristicsForDevice(String deviceId, final Promise promise) {
        final Device device = getDeviceOrReject(deviceId, promise);
        if (device == null) {
            return;
        }

        safeDiscoverAllServicesAndCharacteristicsForDevice(device, new SafePromise(promise));
    }

    // TODO: Transaction for subscription (allows to cancel)
    private void safeDiscoverAllServicesAndCharacteristicsForDevice(final Device device,
                                                                    final SafePromise promise) {
        final RxBleConnection connection = getConnectionOrReject(device, promise);
        if (connection == null) {
            return;
        }

        connection
                .discoverServices()
                .subscribe(new Observer<RxBleDeviceServices>() {
                    @Override
                    public void onCompleted() {
                        promise.resolve(device.toJSObject(null));
                    }

                    @Override
                    public void onError(Throwable e) {
                        errorConverter.toError(e).reject(promise);
                    }

                    @Override
                    public void onNext(RxBleDeviceServices rxBleDeviceServices) {
                        ArrayList<Service> services = new ArrayList<>();
                        for (BluetoothGattService gattService : rxBleDeviceServices.getBluetoothGattServices()) {
                            Service service = new Service(device, gattService);
                            discoveredServices.put(service.getId(), service);
                            services.add(service);

                            for (BluetoothGattCharacteristic gattCharacteristic : gattService.getCharacteristics()) {
                                Characteristic characteristic = new Characteristic(service, gattCharacteristic);
                                discoveredCharacteristics.put(characteristic.getId(), characteristic);
                            }
                        }
                        device.setServices(services);
                    }
                });
    }

    // Mark: Service and characteristic getters ----------------------------------------------------

    @ReactMethod
    public void servicesForDevice(final String deviceId, final Promise promise) {
        final Device device = getDeviceOrReject(deviceId, promise);
        if (device == null) {
            return;
        }
        final List<Service> services = getServicesOrReject(device, promise);
        if (services == null) {
            return;
        }

        WritableArray jsServices = Arguments.createArray();
        for (Service service : services) {
            jsServices.pushMap(service.toJSObject());
        }

        promise.resolve(jsServices);
    }

    @ReactMethod
    public void characteristicsForDevice(final String deviceId,
                                         final String serviceUUID,
                                         final Promise promise) {

        final UUID convertedServiceUUID = UUIDConverter.convert(serviceUUID);
        if (convertedServiceUUID == null) {
            BleErrorUtils.invalidIdentifiers(serviceUUID).reject(promise);
            return;
        }

        final Device device = getDeviceOrReject(deviceId, promise);
        if (device == null) {
            return;
        }

        final Service service = device.getServiceByUUID(convertedServiceUUID);
        if (service == null) {
            BleErrorUtils.serviceNotFound(serviceUUID).reject(promise);
            return;
        }

        characteristicsForService(service, promise);
    }

    @ReactMethod
    public void characteristicsForService(final int serviceIdentifier, final Promise promise) {
        Service service = discoveredServices.get(serviceIdentifier);
        if (service == null) {
            BleErrorUtils.serviceNotFound(Integer.toString(serviceIdentifier)).reject(promise);
            return;
        }

        characteristicsForService(service, promise);
    }

    private void characteristicsForService(final Service service, final Promise promise) {
        WritableArray jsCharacteristics = Arguments.createArray();
        for (Characteristic characteristic : service.getCharacteristics()) {
            jsCharacteristics.pushMap(characteristic.toJSObject(null));
        }
        promise.resolve(jsCharacteristics);
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

        final Characteristic characteristic = getCharacteristicOrReject(
                deviceId, serviceUUID, characteristicUUID, promise);
        if (characteristic == null) {
            return;
        }

        writeCharacteristicWithValue(
                characteristic,
                valueBase64,
                response,
                transactionId,
                promise);
    }

    @ReactMethod
    public void writeCharacteristicForService(final int serviceIdentifier,
                                              final String characteristicUUID,
                                              final String valueBase64,
                                              final Boolean response,
                                              final String transactionId,
                                              final Promise promise) {
        final Characteristic characteristic = getCharacteristicOrReject(
                serviceIdentifier, characteristicUUID, promise);
        if (characteristic == null) {
            return;
        }

        writeCharacteristicWithValue(
                characteristic,
                valueBase64,
                response,
                transactionId,
                promise);
    }

    @ReactMethod
    public void writeCharacteristic(final int characteristicIdentifier,
                                    final String valueBase64,
                                    final Boolean response,
                                    final String transactionId,
                                    final Promise promise) {
        final Characteristic characteristic = getCharacteristicOrReject(characteristicIdentifier, promise);
        if (characteristic == null) {
            return;
        }

        writeCharacteristicWithValue(
                characteristic,
                valueBase64,
                response,
                transactionId,
                promise);
    }

    private void writeCharacteristicWithValue(final Characteristic characteristic,
                                              final String valueBase64,
                                              final Boolean response,
                                              final String transactionId,
                                              final Promise promise) {
        final byte[] value;
        try {
            value = Base64Converter.decode(valueBase64);
        } catch (Throwable e) {
            BleErrorUtils.invalidWriteDataForCharacteristic(valueBase64,
                    UUIDConverter.fromUUID(characteristic.getNativeCharacteristic().getUuid()))
                    .reject(promise);
            return;
        }

        characteristic.getNativeCharacteristic()
                .setWriteType(response ?
                        BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT :
                        BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE);

        safeWriteCharacteristicForDevice(
                characteristic,
                value,
                transactionId,
                new SafePromise(promise));
    }

    private void safeWriteCharacteristicForDevice(final Characteristic characteristic,
                                                  final byte[] value,
                                                  final String transactionId,
                                                  final SafePromise promise) {
        final RxBleConnection connection = getConnectionOrReject(characteristic.getService().getDevice(), promise);
        if (connection == null) {
            return;
        }
        final Subscription subscription = connection
                .writeCharacteristic(characteristic.getNativeCharacteristic(), value)
                .doOnUnsubscribe(new Action0() {
                    @Override
                    public void call() {
                        BleErrorUtils.cancelled().reject(promise);
                        transactions.removeSubscription(transactionId);
                    }
                })
                .subscribe(new Observer<byte[]>() {
                    @Override
                    public void onCompleted() {
                        transactions.removeSubscription(transactionId);
                    }

                    @Override
                    public void onError(Throwable e) {
                        if (e instanceof BleCharacteristicNotFoundException) {
                            BleErrorUtils.characteristicNotFound(
                                    UUIDConverter.fromUUID(
                                            characteristic.getNativeCharacteristic().getUuid()))
                                    .reject(promise);
                            return;
                        }
                        errorConverter.toError(e).reject(promise);
                        transactions.removeSubscription(transactionId);
                    }

                    @Override
                    public void onNext(byte[] bytes) {
                        characteristic.logValue("Write to", bytes);
                        promise.resolve(characteristic.toJSObject(bytes));
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

        final Characteristic characteristic = getCharacteristicOrReject(
                deviceId, serviceUUID, characteristicUUID, promise);
        if (characteristic == null) {
            return;
        }

        safeReadCharacteristicForDevice(characteristic, transactionId, new SafePromise(promise));
    }

    @ReactMethod
    public void readCharacteristicForService(final int serviceIdentifier,
                                             final String characteristicUUID,
                                             final String transactionId,
                                             final Promise promise) {

        final Characteristic characteristic = getCharacteristicOrReject(
                serviceIdentifier, characteristicUUID, promise);
        if (characteristic == null) {
            return;
        }

        safeReadCharacteristicForDevice(characteristic, transactionId, new SafePromise(promise));
    }

    @ReactMethod
    public void readCharacteristic(final int characteristicIdentifier,
                                   final String transactionId,
                                   final Promise promise) {

        final Characteristic characteristic = getCharacteristicOrReject(characteristicIdentifier, promise);
        if (characteristic == null) {
            return;
        }

        safeReadCharacteristicForDevice(characteristic, transactionId, new SafePromise(promise));
    }


    private void safeReadCharacteristicForDevice(final Characteristic characteristic,
                                                 final String transactionId,
                                                 final SafePromise promise) {
        final RxBleConnection connection = getConnectionOrReject(characteristic.getService().getDevice(), promise);
        if (connection == null) {
            return;
        }

        final Subscription subscription = connection
                .readCharacteristic(characteristic.getNativeCharacteristic())
                .doOnUnsubscribe(new Action0() {
                    @Override
                    public void call() {
                        BleErrorUtils.cancelled().reject(promise);
                        transactions.removeSubscription(transactionId);
                    }
                })
                .subscribe(new Observer<byte[]>() {
                    @Override
                    public void onCompleted() {
                        transactions.removeSubscription(transactionId);
                    }

                    @Override
                    public void onError(Throwable e) {
                        if (e instanceof BleCharacteristicNotFoundException) {
                            BleErrorUtils.characteristicNotFound(
                                    UUIDConverter.fromUUID(
                                            characteristic.getNativeCharacteristic().getUuid()))
                                    .reject(promise);
                            return;
                        }
                        errorConverter.toError(e).reject(promise);
                        transactions.removeSubscription(transactionId);
                    }

                    @Override
                    public void onNext(byte[] bytes) {
                        characteristic.logValue("Read from", bytes);
                        promise.resolve(characteristic.toJSObject(bytes));
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

        final Characteristic characteristic = getCharacteristicOrReject(
                deviceId, serviceUUID, characteristicUUID, promise);
        if (characteristic == null) {
            return;
        }

        safeMonitorCharacteristicForDevice(characteristic, transactionId, new SafePromise(promise));
    }

    @ReactMethod
    public void monitorCharacteristicForService(final int serviceIdentifier,
                                                final String characteristicUUID,
                                                final String transactionId,
                                                final Promise promise) {

        final Characteristic characteristic = getCharacteristicOrReject(
                serviceIdentifier, characteristicUUID, promise);
        if (characteristic == null) {
            return;
        }

        safeMonitorCharacteristicForDevice(characteristic, transactionId, new SafePromise(promise));
    }

    @ReactMethod
    public void monitorCharacteristic(final int characteristicIdentifier,
                                      final String transactionId,
                                      final Promise promise) {

        final Characteristic characteristic = getCharacteristicOrReject(characteristicIdentifier, promise);
        if (characteristic == null) {
            return;
        }

        safeMonitorCharacteristicForDevice(characteristic, transactionId, new SafePromise(promise));
    }

    private void safeMonitorCharacteristicForDevice(final Characteristic characteristic,
                                                    final String transactionId,
                                                    final SafePromise promise) {
        final RxBleConnection connection = getConnectionOrReject(characteristic.getService().getDevice(), promise);
        if (connection == null) {
            return;
        }

        final BluetoothGattCharacteristic gattCharacteristic = characteristic.getNativeCharacteristic();

        final int properties = gattCharacteristic.getProperties();
        final boolean notifications = (properties & BluetoothGattCharacteristic.PROPERTY_NOTIFY) != 0;
        final boolean indications = (properties & BluetoothGattCharacteristic.PROPERTY_INDICATE) != 0;

        final Subscription subscription = Observable.just(connection)
                .flatMap(new Func1<RxBleConnection, Observable<Observable<byte[]>>>() {
                    @Override
                    public Observable<Observable<byte[]>> call(RxBleConnection connection) {
                        if (notifications || indications) {
                            // NotificationSetupMode.COMPAT does not write CCC Descriptor on it's own
                            return connection.setupNotification(gattCharacteristic, NotificationSetupMode.COMPAT);
                        }

                        return Observable.error(new CannotMonitorCharacteristicException(gattCharacteristic));
                    }
                })
                .flatMap(new Func1<Observable<byte[]>, Observable<byte[]>>() {
                    @Override
                    public Observable<byte[]> call(Observable<byte[]> observable) {
                        BluetoothGattDescriptor cccDescriptor =
                                gattCharacteristic.getDescriptor(Characteristic.CLIENT_CHARACTERISTIC_CONFIG_UUID);
                        if (cccDescriptor == null) {
                            return observable;
                        } else {
                            byte[] enableValue = notifications
                                    ? BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                                    : BluetoothGattDescriptor.ENABLE_INDICATION_VALUE;
                            // Keep in mind that every subscription to this observable will initiate another descriptor write
                            return observable.mergeWith(connection.writeDescriptor(cccDescriptor, enableValue).ignoreElements());
                        }
                    }
                })
                .doOnUnsubscribe(new Action0() {
                    @Override
                    public void call() {
                        promise.resolve(null);
                        transactions.removeSubscription(transactionId);
                    }
                })
                .subscribe(new Observer<byte[]>() {
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
                    public void onNext(byte[] bytes) {
                        characteristic.logValue("Notification from", bytes);
                        WritableArray jsResult = Arguments.createArray();
                        jsResult.pushNull();
                        jsResult.pushMap(characteristic.toJSObject(bytes));
                        jsResult.pushString(transactionId);
                        sendEvent(Event.ReadEvent, jsResult);
                    }
                });

        transactions.replaceSubscription(transactionId, subscription);
    }


    // Mark: Characteristics getters ---------------------------------------------------------------

    @Nullable
    private Characteristic getCharacteristicOrReject(@NonNull final String deviceId,
                                                     @NonNull final String serviceUUID,
                                                     @NonNull final String characteristicUUID,
                                                     @NonNull Promise promise) {

        final UUID[] UUIDs = UUIDConverter.convert(serviceUUID, characteristicUUID);
        if (UUIDs == null) {
            BleErrorUtils.invalidIdentifiers(serviceUUID, characteristicUUID).reject(promise);
            return null;
        }

        final Device device = connectedDevices.get(deviceId);
        if (device == null) {
            BleErrorUtils.deviceNotConnected(deviceId).reject(promise);
            return null;
        }

        final Service service = device.getServiceByUUID(UUIDs[0]);
        if (service == null) {
            BleErrorUtils.serviceNotFound(serviceUUID).reject(promise);
            return null;
        }

        final Characteristic characteristic = service.getCharacteristicByUUID(UUIDs[1]);
        if (characteristic == null) {
            BleErrorUtils.characteristicNotFound(characteristicUUID).reject(promise);
            return null;
        }

        return characteristic;
    }

    @Nullable
    private Characteristic getCharacteristicOrReject(final int serviceIdentifier,
                                                     @NonNull final String characteristicUUID,
                                                     @NonNull Promise promise) {

        final UUID uuid = UUIDConverter.convert(characteristicUUID);
        if (uuid == null) {
            BleErrorUtils.invalidIdentifiers(characteristicUUID).reject(promise);
            return null;
        }

        final Service service = discoveredServices.get(serviceIdentifier);
        if (service == null) {
            BleErrorUtils.serviceNotFound(Integer.toString(serviceIdentifier)).reject(promise);
            return null;
        }

        final Characteristic characteristic = service.getCharacteristicByUUID(uuid);
        if (characteristic == null) {
            BleErrorUtils.characteristicNotFound(characteristicUUID).reject(promise);
            return null;
        }

        return characteristic;
    }

    @Nullable
    private Characteristic getCharacteristicOrReject(final int characteristicIdentifier,
                                                     @NonNull Promise promise) {

        final Characteristic characteristic = discoveredCharacteristics.get(characteristicIdentifier);
        if (characteristic == null) {
            BleErrorUtils.characteristicNotFound(Integer.toString(characteristicIdentifier)).reject(promise);
            return null;
        }

        return characteristic;
    }

    // Mark: Device getters -------------------------------------------------------------------

    @Nullable
    private RxBleConnection getConnectionOrReject(@NonNull final Device device,
                                                  @NonNull Promise promise) {
        final RxBleConnection connection = device.getConnection();
        if (connection == null) {
            BleErrorUtils.deviceNotConnected(device.getNativeDevice().getMacAddress()).reject(promise);
            return null;
        }
        return connection;
    }

    @Nullable
    private List<Service> getServicesOrReject(@NonNull final Device device,
                                              @NonNull Promise promise) {
        final List<Service> services = device.getServices();
        if (services == null) {
            BleErrorUtils.deviceServicesNotDiscovered(device.getNativeDevice().getMacAddress()).reject(promise);
            return null;
        }
        return services;
    }

    @Nullable
    private Device getDeviceOrReject(@NonNull final String deviceId,
                                     @NonNull Promise promise) {
        final Device device = connectedDevices.get(deviceId);
        if (device == null) {
            BleErrorUtils.deviceNotConnected(deviceId).reject(promise);
            return null;
        }
        return device;
    }

    // Mark: Private -------------------------------------------------------------------------------

    private void sendEvent(@NonNull Event event, @Nullable Object params) {
        getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(event.name, params);
    }

    private void cleanServicesAndCharacteristicsForDevice(@NonNull Device device) {
        for (int i = discoveredServices.size() - 1; i >=0; i--) {
            int key = discoveredServices.keyAt(i);
            Service service = discoveredServices.get(key);

            if (service.getDevice().getNativeDevice().getMacAddress().equals(device.getNativeDevice().getMacAddress())) {
                discoveredServices.remove(key);
            }
        }
        for (int i = discoveredCharacteristics.size() - 1; i >=0; i--) {
            int key = discoveredCharacteristics.keyAt(i);
            Characteristic characteristic = discoveredCharacteristics.get(key);

            if (characteristic.getService().getDevice().getNativeDevice().getMacAddress().equals(device.getNativeDevice().getMacAddress())) {
                discoveredCharacteristics.remove(key);
            }
        }
    }
}
