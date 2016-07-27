package org.konradkrakowiak.blereactnative;

import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattService;
import android.support.annotation.Nullable;
import android.util.Base64;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.polidea.rxandroidble.RxBleClient;
import com.polidea.rxandroidble.RxBleConnection;
import com.polidea.rxandroidble.RxBleDevice;
import com.polidea.rxandroidble.RxBleScanResult;
import com.polidea.rxandroidble.internal.RxBleLog;

import org.konradkrakowiak.blereactnative.converter.ConverterManager;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;

import rx.Subscription;

public class BleModule extends ReactContextBaseJavaModule {

    private static final String NAME = "BleClientManager";

    private static final String TAG = BleModule.class.getSimpleName();

    private final ErrorConverter errorConverter = new ErrorConverter();

    private final ConverterManager converterManager = new ConverterManager();

    private RxBleClient rxBleClient;

    private Subscription scanSubscription;

    private HashMap<String, Subscription> connectionSubscriptionMap;

    private HashMap<String, Subscription> characteristicOperationMap;

    private HashMap<String, RxBleConnection> connectionMap;


    public BleModule(ReactApplicationContext reactContext) {
        super(reactContext);
        connectionSubscriptionMap = new HashMap<>();
        connectionMap = new HashMap<>();
        characteristicOperationMap = new HashMap<>();
    }

    @Override
    public String getName() {
        return NAME;
    }

    private UUID[] convertToUUIDs(@Nullable String... filteredUUIDs) {
        if (filteredUUIDs == null) {
            return null;
        }

        ArrayList<UUID> result = new ArrayList<>();
        for (String uuidStr : filteredUUIDs) {
            UUID uuid = UUID.fromString(uuidStr);
            result.add(uuid);
        }
        return result.toArray(new UUID[result.size()]);
    }

    @ReactMethod
    public void createClient() {
        Log.d(TAG, "createClient was called");
        rxBleClient = RxBleClient.create(getReactApplicationContext());
    }

    @ReactMethod
    public void destroyClient() {
        Log.d(TAG, "destroyClient was called");
        if (scanSubscription != null) {
            scanSubscription.unsubscribe();
            scanSubscription = null;
        }
        rxBleClient = null;
    }

    @ReactMethod
    public void scanBleDevices(ReadableArray filteredUUIDs) {
        Log.d(TAG, "scanBleDevices was called");

        if (rxBleClient == null) {
            // TODO: check if ble client is already initialized
        }

        UUID[] uuids = convertToUUIDs(null);

        // TODO: Check if UUIDs are valid

        scanSubscription = rxBleClient
                .scanBleDevices(uuids)
                .subscribe(
                        this::onScanBleDevicesSuccess,
                        throwable -> onScanBleDevicesFailure(throwable));
    }

    @ReactMethod
    public void stopScanBleDevices() {
        Log.d(TAG, "stopScanBleDevices was called");
        if (scanSubscription != null) {
            scanSubscription.unsubscribe();
            scanSubscription = null;
        }
    }

    @ReactMethod
    public void establishConnection(String deviceId, Promise promise) {
        Log.d(TAG, "establishConnection was called");

        final RxBleDevice device = rxBleClient.getBleDevice(deviceId);
        if (device == null) {
            promise.reject(new RuntimeException(ErrorKey.NO_DEVICE_FOUND));
            return;
        }
        boolean autoConnect = false;
        final Subscription subscribe = device
                .establishConnection(getReactApplicationContext(), autoConnect)
                .subscribe(
                        rxBleConnection -> onEstablishConnectionSuccessSuccess(deviceId, rxBleConnection, promise),
                        throwable -> onEstablishConnectionSuccessFailure(throwable, promise)
                );
        connectionSubscriptionMap.put(deviceId, subscribe);
    }

    @ReactMethod
    public void closeConnection(String deviceId, Promise promise) {
        Log.d(TAG, "closeConnection was called");
        final Subscription connectionSubscription = connectionSubscriptionMap.get(deviceId);
        if (connectionSubscription != null) {
            connectionSubscription.unsubscribe();
            connectionSubscriptionMap.remove(deviceId);
            Log.d(TAG, "Connection was closed for device: " + deviceId);
            promise.resolve(deviceId);
        } else {
            Log.d(TAG, "There is no open connection for device: " + deviceId);
            // TODO: handle errors
            String error = ErrorKey.BLE_GATT_CANNOT_START_EXCEPTION;
            promise.reject(error, error);
        }
    }

    @ReactMethod
    public void serviceIdsForDevice(String deviceIdentifier, Promise promise) {
        final RxBleConnection rxBleConnection = connectionMap.get(deviceIdentifier);
        if (rxBleConnection == null) {
            // TODO: handle error
            String error = ErrorKey.BLE_GATT_CANNOT_START_EXCEPTION;
            promise.reject(error, error);
            return;
        }
        rxBleConnection.discoverServices().subscribe(
                rxBleDeviceServices -> {
                    List<BluetoothGattService> services = rxBleDeviceServices.getBluetoothGattServices();
                    WritableArray resultServices = Arguments.createArray();
                    for (BluetoothGattService service : services) {
                        resultServices.pushString(service.getUuid().toString());
                    }
                    promise.resolve(resultServices);
                },
                throwable -> {
                    final String error = errorConverter.convert(throwable);
                    promise.reject(error, error);
                }
        );
    }

    @ReactMethod
    public void characteristicIdsForDevice(String deviceIdentifier, String serviceIdentifier, Promise promise) {
        final RxBleConnection rxBleConnection = connectionMap.get(deviceIdentifier);
        if (rxBleConnection == null) {
            // TODO: handle error
            String error = ErrorKey.BLE_GATT_CANNOT_START_EXCEPTION;
            promise.reject(error, error);
            return;
        }
        rxBleConnection.discoverServices().subscribe(
                rxBleDeviceServices -> {
                    WritableArray resultCharacteristics = Arguments.createArray();
                    List<BluetoothGattService> services = rxBleDeviceServices.getBluetoothGattServices();
                    for (BluetoothGattService service : services) {
                        if (service.getUuid().toString().compareToIgnoreCase(serviceIdentifier) == 0) {
                            List<BluetoothGattCharacteristic> characteristics = service.getCharacteristics();
                            for (BluetoothGattCharacteristic characteristic : characteristics) {
                                resultCharacteristics.pushString(characteristic.getUuid().toString());
                            }
                            break;
                        }
                    }
                    promise.resolve(resultCharacteristics);
                },
                throwable -> {
                    // TODO: handle error
                    final String error = errorConverter.convert(throwable);
                    promise.reject(error, error);
                }
        );
    }

    @ReactMethod
    public void detailsForCharacteristic(String deviceIdentifier, String serviceIdentifier, String characteristicIdentifier, Promise promise) {
        final RxBleConnection rxBleConnection = connectionMap.get(deviceIdentifier);
        if (rxBleConnection == null) {
            // TODO: handle error
            String error = ErrorKey.BLE_GATT_CANNOT_START_EXCEPTION;
            promise.reject(error, error);
            return;
        }
        rxBleConnection.discoverServices().subscribe(rxBleDeviceServices -> {
            List<BluetoothGattService> services = rxBleDeviceServices.getBluetoothGattServices();
            for (BluetoothGattService service : services) {
                if (service.getUuid().toString().compareToIgnoreCase(serviceIdentifier) == 0) {
                    List<BluetoothGattCharacteristic> characteristics = service.getCharacteristics();
                    for (BluetoothGattCharacteristic characteristic : characteristics) {
                        if (characteristic.getUuid().toString().compareToIgnoreCase(characteristicIdentifier) == 0) {
                            WritableMap result = Arguments.createMap();
                            result.putBoolean("isWritable", isCharacteristicWriteable(characteristic));
                            result.putBoolean("isReadable", isCharacterisitcReadable(characteristic));
                            result.putBoolean("isNotifiable", isCharacterisiticNotifiable(characteristic));
                            result.putString("uuid", characteristic.getUuid().toString());
                            promise.resolve(result);
                        }
                    }
                }
            }
            // TODO: handle error
//            final String error = errorConverter.convert(throwable);
//            promise.reject(error, error);
        }, throwable -> {
            // TODO: handle error
            final String error = errorConverter.convert(throwable);
            promise.reject(error, error);
        });
    }

    @ReactMethod
    public void writeCharacteristic(String deviceIdentifier, String serviceIdentifier, String characteristicIdentifier, String valueBase64, String transactionId, Promise promise) {
        Log.d(TAG, "writeCharacteristic was called");
        final RxBleConnection rxBleConnection = connectionMap.get(deviceIdentifier);
        if (rxBleConnection == null) {
            // TODO: handle errors
            String error = "Write characteristic error!";
            promise.reject(error, error);
            return;
        }
        final Subscription subscription = rxBleConnection
                // TODO: later user also serviceIdentifier to be sure that we are writing to the correct characteristic
                .writeCharacteristic(UUID.fromString(characteristicIdentifier), Base64.decode(valueBase64, Base64.DEFAULT))
                .subscribe(
                        bytes -> onWriteCharacteristicSuccess(bytes, promise),
                        throwable -> onWriteCharacteristicFailure(throwable, promise));

        characteristicOperationMap.put(transactionId, subscription);
    }

    @ReactMethod
    public void readCharacteristic(String deviceIdentifier, String serviceIdentifier, String characteristicIdentifier, String transactionId, Promise promise) {
        Log.d(TAG, "readCharacteristic was called");
        final RxBleConnection rxBleConnection = connectionMap.get(deviceIdentifier);
        if (rxBleConnection == null) {
            // TODO: handle errors
            String error = "Write characteristic error!";
            promise.reject(error, error);
            return;
        }
        final Subscription subscription = rxBleConnection
                // TODO: later user also serviceIdentifier to be sure that we are reading to the correct characteristic
                .readCharacteristic(UUID.fromString(characteristicIdentifier))
                .subscribe(
                        bytes -> onReadCharacteristicSuccess(bytes, promise),
                        throwable -> onReadCharacteristicFailure(throwable, promise));

        characteristicOperationMap.put(transactionId, subscription);
    }

    @ReactMethod
    public void cancelCharacteristicOperation(String transactionId) {
        // TODO: handle canceling of the pending operation
        final Subscription subscription = characteristicOperationMap.get(transactionId);
        if (subscription == null || !subscription.isUnsubscribed()) {
            Log.d(TAG, "Read characteristic is missing for transactionId : " + transactionId);
            return;
        }
        Log.d(TAG, "Read characteristic was canceled for transactionId : " + transactionId);
        subscription.unsubscribe();
        characteristicOperationMap.remove(transactionId);
    }

    // Support for scanBleDevices(...)

    private void onScanBleDevicesSuccess(RxBleScanResult rxBleScanResult) {
        Log.d(TAG, "onScanBleDevicesSuccess: " + rxBleScanResult.toString());
        sendEvent(EventKey.SCAN_RESULT, converterManager.convert(rxBleScanResult));
    }

    private void onScanBleDevicesFailure(Throwable throwable) {
        final String error = errorConverter.convert(throwable);
        Log.e(TAG, "onScanBleDevicesFailure: ", throwable);

        // TODO: send scan error and stop
    }

    //Support for establishConnection(...)

    private void onEstablishConnectionSuccessSuccess(String deviceId, RxBleConnection rxBleConnection, Promise promise) {
        connectionMap.put(deviceId, rxBleConnection);
        promise.resolve(deviceId);
        Log.d(TAG, "Establish connection success for : " + deviceId);
    }

    private void onEstablishConnectionSuccessFailure(Throwable throwable, Promise promise) {
        final String error = errorConverter.convert(throwable);
        Log.e(TAG, "onEstablishConnectionSuccessFailure: ", throwable);
        promise.reject(error, error);
    }

    //Support for readCharacteristic(...)

    private void onReadCharacteristicSuccess(byte[] data, Promise promise) {
        final String value = Base64.encodeToString(data, Base64.DEFAULT);
        promise.resolve(value);
        Log.d(TAG, "Read characteristic with : " + value);

    }

    private void onReadCharacteristicFailure(Throwable throwable, Promise errorCallback) {
        final String error = errorConverter.convert(throwable);
        Log.e(TAG, "onReadCharacteristicFailure: ", throwable);
        errorCallback.reject(error, error);
    }

    //Support for writeCharacteristic(...)

    private void onWriteCharacteristicSuccess(byte[] data, Promise promise) {
        final String value = Base64.encodeToString(data, Base64.DEFAULT);
        promise.resolve(value);
        Log.d(TAG, "Write characteristic success with : " + value);

    }

    private void onWriteCharacteristicFailure(Throwable throwable, Promise promise) {
        final String error = errorConverter.convert(throwable);
        Log.e(TAG, "onWriteCharacteristicFailure: ", throwable);
        promise.reject(error, error);
    }

    //Common support method

    private void sendEvent(String eventName, @Nullable WritableMap params) {
        getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }


    // Get properties from characteristic and check against flags
    // TODO: move it to the helper class

    private boolean isCharacteristicWriteable(BluetoothGattCharacteristic pChar) {
        return (pChar.getProperties() & BluetoothGattCharacteristic.PROPERTY_WRITE) != 0;
    }

    private boolean isCharacterisitcReadable(BluetoothGattCharacteristic pChar) {
        return (pChar.getProperties() & BluetoothGattCharacteristic.PROPERTY_READ) != 0;
    }

    private boolean isCharacterisiticNotifiable(BluetoothGattCharacteristic pChar) {
        return (pChar.getProperties() & BluetoothGattCharacteristic.PROPERTY_NOTIFY) != 0;
    }
}
