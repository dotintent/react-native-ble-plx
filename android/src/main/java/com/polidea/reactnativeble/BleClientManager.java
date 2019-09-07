package com.polidea.reactnativeble;

import android.support.annotation.NonNull;
import android.support.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.polidea.multiplatformbleadapter.BleAdapter;
import com.polidea.multiplatformbleadapter.BleModule;
import com.polidea.multiplatformbleadapter.Characteristic;
import com.polidea.multiplatformbleadapter.ConnectionOptions;
import com.polidea.multiplatformbleadapter.Device;
import com.polidea.multiplatformbleadapter.OnErrorCallback;
import com.polidea.multiplatformbleadapter.OnEventCallback;
import com.polidea.multiplatformbleadapter.OnSuccessCallback;
import com.polidea.multiplatformbleadapter.RefreshGattMoment;
import com.polidea.multiplatformbleadapter.ScanResult;
import com.polidea.multiplatformbleadapter.Service;
import com.polidea.multiplatformbleadapter.errors.BleError;
import com.polidea.reactnativeble.converter.BleErrorToJsObjectConverter;
import com.polidea.reactnativeble.converter.CharacteristicToJsObjectConverter;
import com.polidea.reactnativeble.converter.DeviceToJsObjectConverter;
import com.polidea.reactnativeble.converter.ScanResultToJsObjectConverter;
import com.polidea.reactnativeble.converter.ServiceToJsObjectConverter;
import com.polidea.reactnativeble.utils.ReadableArrayConverter;
import com.polidea.reactnativeble.utils.SafePromise;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;


import static com.polidea.rxandroidble.scan.ScanSettings.CALLBACK_TYPE_ALL_MATCHES;
import static com.polidea.rxandroidble.scan.ScanSettings.SCAN_MODE_LOW_POWER;

public class BleClientManager extends ReactContextBaseJavaModule {

    // Name of module
    private static final String NAME = "BleClientManager";

    // Value converters
    private final BleErrorToJsObjectConverter errorConverter = new BleErrorToJsObjectConverter();
    private final ScanResultToJsObjectConverter scanResultConverter = new ScanResultToJsObjectConverter();
    private final DeviceToJsObjectConverter deviceConverter = new DeviceToJsObjectConverter();
    private final CharacteristicToJsObjectConverter characteristicConverter = new CharacteristicToJsObjectConverter();
    private final ServiceToJsObjectConverter serviceConverter = new ServiceToJsObjectConverter();

    private BleAdapter bleAdapter;

    public BleClientManager(ReactApplicationContext reactContext) {
        super(reactContext);
        bleAdapter = new BleModule(reactContext);
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
        bleAdapter.createClient(restoreStateIdentifier,
                new OnEventCallback<String>() {
                    @Override
                    public void onEvent(String state) {
                        sendEvent(Event.StateChangeEvent, state);
                    }
                }, new OnEventCallback<Integer>() {
                    @Override
                    public void onEvent(Integer data) {
                        sendEvent(Event.RestoreStateEvent, null);
                    }
                });
    }

    @ReactMethod
    public void destroyClient() {
        bleAdapter.destroyClient();
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        destroyClient();
    }

    // Mark: Common --------------------------------------------------------------------------------

    @ReactMethod
    public void cancelTransaction(String transactionId) {
        bleAdapter.cancelTransaction(transactionId);
    }

    @ReactMethod
    public void setLogLevel(String logLevel) {
        bleAdapter.setLogLevel(logLevel);
    }

    @ReactMethod
    public void logLevel(Promise promise) {
        promise.resolve(bleAdapter.getLogLevel());
    }

    // Mark: Monitoring state ----------------------------------------------------------------------

    @ReactMethod
    public void enable(final String transactionId, final Promise promise) {
        final SafePromise safePromise = new SafePromise(promise);
        bleAdapter.enable(transactionId, new OnSuccessCallback<Void>() {
            @Override
            public void onSuccess(Void data) {
                safePromise.resolve(null);
            }
        }, new OnErrorCallback() {
            @Override
            public void onError(BleError error) {
                safePromise.reject(null, errorConverter.toJs(error));
            }
        });
    }

    @ReactMethod
    public void disable(final String transactionId, final Promise promise) {
        final SafePromise safePromise = new SafePromise(promise);
        bleAdapter.disable(transactionId, new OnSuccessCallback<Void>() {
            @Override
            public void onSuccess(Void data) {
                safePromise.resolve(null);
            }
        }, new OnErrorCallback() {
            @Override
            public void onError(BleError error) {
                safePromise.reject(null, errorConverter.toJs(error));
            }
        });
    }

    @ReactMethod
    public void state(Promise promise) {
        promise.resolve(bleAdapter.getCurrentState());
    }

    // Mark: Scanning ------------------------------------------------------------------------------

    @ReactMethod
    public void startDeviceScan(@Nullable ReadableArray filteredUUIDs, @Nullable ReadableMap options) {
        UUID[] uuids = null;

        int scanMode = SCAN_MODE_LOW_POWER;
        int callbackType = CALLBACK_TYPE_ALL_MATCHES;

        if (options != null) {
            if (options.hasKey("scanMode") && options.getType("scanMode") == ReadableType.Number) {
                scanMode = options.getInt("scanMode");
            }
            if (options.hasKey("callbackType") && options.getType("callbackType") == ReadableType.Number) {
                callbackType = options.getInt("callbackType");
            }
        }

        bleAdapter.startDeviceScan(
                filteredUUIDs != null ? ReadableArrayConverter.toStringArray(filteredUUIDs) : null,
                scanMode, callbackType,
                new OnEventCallback<ScanResult>() {
                    @Override
                    public void onEvent(ScanResult data) {
                        sendEvent(Event.ScanEvent, scanResultConverter.toJSCallback(data));
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        sendEvent(Event.ScanEvent, errorConverter.toJSCallback(error));
                    }
                });
    }

    @ReactMethod
    public void stopDeviceScan() {
        bleAdapter.stopDeviceScan();
    }

    // Mark: Device management ---------------------------------------------------------------------

    @ReactMethod
    public void devices(final ReadableArray deviceIdentifiers, final Promise promise) {
        bleAdapter.getKnownDevices(ReadableArrayConverter.toStringArray(deviceIdentifiers),
                new OnSuccessCallback<Device[]>() {
                    @Override
                    public void onSuccess(Device[] data) {
                        WritableArray jsDevices = Arguments.createArray();
                        for (Device device : data) {
                            jsDevices.pushMap(deviceConverter.toJSObject(device));
                        }
                        promise.resolve(jsDevices);
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        promise.reject(null, errorConverter.toJs(error));
                    }
                });
    }

    @ReactMethod
    public void connectedDevices(final ReadableArray serviceUUIDs, final Promise promise) {
        bleAdapter.getConnectedDevices(ReadableArrayConverter.toStringArray(serviceUUIDs),
                new OnSuccessCallback<Device[]>() {
                    @Override
                    public void onSuccess(Device[] data) {
                        final WritableArray writableArray = Arguments.createArray();
                        for (Device device : data) {
                            writableArray.pushMap(deviceConverter.toJSObject(device));
                        }
                        promise.resolve(writableArray);
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        promise.reject(null, errorConverter.toJs(error));
                    }
                });
    }

    // Mark: Device operations ---------------------------------------------------------------------

    @ReactMethod
    public void requestConnectionPriorityForDevice(final String deviceId, int connectionPriority, final String transactionId, final Promise promise) {
        final SafePromise safePromise = new SafePromise(promise);
        bleAdapter.requestConnectionPriorityForDevice(deviceId, connectionPriority, transactionId,
                new OnSuccessCallback<Device>() {
                    @Override
                    public void onSuccess(Device data) {
                        safePromise.resolve(deviceConverter.toJSObject(data));
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        safePromise.reject(null, errorConverter.toJs(error));
                    }
                });
    }

    @ReactMethod
    public void requestMTUForDevice(final String deviceId, int mtu, final String transactionId, final Promise promise) {
        final SafePromise safePromise = new SafePromise(promise);
        bleAdapter.requestMTUForDevice(deviceId, mtu, transactionId,
                new OnSuccessCallback<Device>() {
                    @Override
                    public void onSuccess(Device data) {
                        safePromise.resolve(deviceConverter.toJSObject(data));
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        safePromise.reject(null, errorConverter.toJs(error));
                    }
                });
    }

    @ReactMethod
    public void readRSSIForDevice(final String deviceId, final String transactionId, final Promise promise) {
        final SafePromise safePromise = new SafePromise(promise);
        bleAdapter.readRSSIForDevice(deviceId, transactionId,
                new OnSuccessCallback<Device>() {
                    @Override
                    public void onSuccess(Device data) {
                        safePromise.resolve(deviceConverter.toJSObject(data));
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        safePromise.reject(null, errorConverter.toJs(error));
                    }
                });
    }

    @ReactMethod
    public void connectToDevice(final String deviceId, @Nullable ReadableMap options, final Promise promise) {
        final SafePromise safePromise = new SafePromise(promise);

        boolean autoConnect = false;
        int requestMtu = 0;
        RefreshGattMoment refreshGattMoment = null;
        Integer timeout = null;
        int connectionPriority = 0; // CONNECTION_PRIORITY_BALANCED

        if (options != null) {
            if (options.hasKey("autoConnect") && options.getType("autoConnect") == ReadableType.Boolean) {
                autoConnect = options.getBoolean("autoConnect");
            }
            if (options.hasKey("requestMTU") && options.getType("requestMTU") == ReadableType.Number) {
                requestMtu = options.getInt("requestMTU");
            }
            if (options.hasKey("refreshGatt") && options.getType("refreshGatt") == ReadableType.String) {
                refreshGattMoment = RefreshGattMoment.getByName(options.getString("refreshGatt"));
            }
            if (options.hasKey("timeout") && options.getType("timeout") == ReadableType.Number) {
                timeout = options.getInt("timeout");
            }
            if (options.hasKey("connectionPriority") && options.getType("connectionPriority") == ReadableType.Number) {
                connectionPriority = options.getInt("connectionPriority");
            }
        }
        bleAdapter.connectToDevice(
                deviceId,
                new ConnectionOptions(autoConnect,
                        requestMtu,
                        refreshGattMoment,
                        timeout != null ? timeout.longValue() : null,
                        connectionPriority),
                new OnSuccessCallback<Device>() {
                    @Override
                    public void onSuccess(Device data) {
                        safePromise.resolve(deviceConverter.toJSObject(data));
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        safePromise.reject(null, errorConverter.toJs(error));
                    }
                });
    }

    @ReactMethod
    public void cancelDeviceConnection(String deviceId, Promise promise) {
        final SafePromise safePromise = new SafePromise(promise);
        bleAdapter.cancelDeviceConnection(deviceId,
                new OnSuccessCallback<Device>() {
                    @Override
                    public void onSuccess(Device data) {
                        safePromise.resolve(deviceConverter.toJSObject(data));
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        safePromise.reject(null, errorConverter.toJs(error));
                    }
                });
    }

    @ReactMethod
    public void isDeviceConnected(String deviceId, final Promise promise) {
        bleAdapter.isDeviceConnected(deviceId,
                new OnSuccessCallback<Boolean>() {
                    @Override
                    public void onSuccess(Boolean isConnected) {
                        promise.resolve(isConnected);
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        promise.reject(null, errorConverter.toJs(error));
                    }
                });
    }

    // Mark: Discovery -----------------------------------------------------------------------------

    @ReactMethod
    public void discoverAllServicesAndCharacteristicsForDevice(String deviceId, final String transactionId, final Promise promise) {
        final SafePromise safePromise = new SafePromise(promise);
        bleAdapter.discoverAllServicesAndCharacteristicsForDevice(deviceId, transactionId,
                new OnSuccessCallback<Device>() {
                    @Override
                    public void onSuccess(Device data) {
                        safePromise.resolve(deviceConverter.toJSObject(data));
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        safePromise.reject(null, errorConverter.toJs(error));
                    }
                });
    }

    // Mark: Service and characteristic getters ----------------------------------------------------

    @ReactMethod
    public void servicesForDevice(final String deviceId, final Promise promise) {
        bleAdapter.getServicesForDevice(deviceId,
                new OnSuccessCallback<Service[]>() {
                    @Override
                    public void onSuccess(Service[] data) {
                        WritableArray jsArray = Arguments.createArray();
                        for (Service service : data) {
                            jsArray.pushMap(serviceConverter.toJSObject(service));
                        }
                        promise.resolve(jsArray);
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        promise.reject(null, errorConverter.toJs(error));
                    }
                });
    }

    @ReactMethod
    public void characteristicsForDevice(final String deviceId,
                                         final String serviceUUID,
                                         final Promise promise) {
        bleAdapter.getCharacteristicsForDevice(deviceId, serviceUUID,
                new OnSuccessCallback<Characteristic[]>() {
                    @Override
                    public void onSuccess(Characteristic[] data) {
                        WritableArray jsCharacteristics = Arguments.createArray();
                        for (Characteristic characteristic : data) {
                            jsCharacteristics.pushMap(characteristicConverter.toJSObject(characteristic));
                        }
                        promise.resolve(jsCharacteristics);
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        promise.reject(null, errorConverter.toJs(error));
                    }
                });
    }

    @ReactMethod
    public void characteristicsForService(final int serviceIdentifier, final Promise promise) {
        bleAdapter.getCharacteristicsForService(serviceIdentifier,
                new OnSuccessCallback<Characteristic[]>() {
                    @Override
                    public void onSuccess(Characteristic[] data) {
                        WritableArray jsCharacteristics = Arguments.createArray();
                        for (Characteristic characteristic : data) {
                            jsCharacteristics.pushMap(characteristicConverter.toJSObject(characteristic));
                        }
                        promise.resolve(jsCharacteristics);
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        promise.reject(null, errorConverter.toJs(error));
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

        bleAdapter.writeCharacteristicForDevice(
                deviceId, serviceUUID, characteristicUUID, valueBase64, response, transactionId,
                new OnSuccessCallback<Characteristic>() {
                    @Override
                    public void onSuccess(Characteristic data) {
                        safePromise.resolve(characteristicConverter.toJSObject(data));
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        safePromise.reject(null, errorConverter.toJs(error));
                    }
                }
        );
    }

    @ReactMethod
    public void writeCharacteristicForService(final int serviceIdentifier,
                                              final String characteristicUUID,
                                              final String valueBase64,
                                              final Boolean response,
                                              final String transactionId,
                                              final Promise promise) {
        final SafePromise safePromise = new SafePromise(promise);
        bleAdapter.writeCharacteristicForService(
                serviceIdentifier, characteristicUUID, valueBase64, response, transactionId,
                new OnSuccessCallback<Characteristic>() {
                    @Override
                    public void onSuccess(Characteristic data) {
                        safePromise.resolve(characteristicConverter.toJSObject(data));
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        safePromise.reject(null, errorConverter.toJs(error));
                    }
                }
        );
    }

    @ReactMethod
    public void writeCharacteristic(final int characteristicIdentifier,
                                    final String valueBase64,
                                    final Boolean response,
                                    final String transactionId,
                                    final Promise promise) {
        final SafePromise safePromise = new SafePromise(promise);

        bleAdapter.writeCharacteristic(characteristicIdentifier, valueBase64, response, transactionId,
                new OnSuccessCallback<Characteristic>() {
                    @Override
                    public void onSuccess(Characteristic data) {
                        safePromise.resolve(characteristicConverter.toJSObject(data));
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        safePromise.reject(null, errorConverter.toJs(error));
                    }
                });
    }

    @ReactMethod
    public void readCharacteristicForDevice(final String deviceId,
                                            final String serviceUUID,
                                            final String characteristicUUID,
                                            final String transactionId,
                                            final Promise promise) {
        final SafePromise safePromise = new SafePromise(promise);

        bleAdapter.readCharacteristicForDevice(
                deviceId, serviceUUID, characteristicUUID, transactionId,
                new OnSuccessCallback<Characteristic>() {
                    @Override
                    public void onSuccess(Characteristic data) {
                        safePromise.resolve(characteristicConverter.toJSObject(data));
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        safePromise.reject(null, errorConverter.toJs(error));
                    }
                }
        );
    }

    @ReactMethod
    public void readCharacteristicForService(final int serviceIdentifier,
                                             final String characteristicUUID,
                                             final String transactionId,
                                             final Promise promise) {
        final SafePromise safePromise = new SafePromise(promise);

        bleAdapter.readCharacteristicForService(
                serviceIdentifier, characteristicUUID, transactionId,
                new OnSuccessCallback<Characteristic>() {
                    @Override
                    public void onSuccess(Characteristic data) {
                        safePromise.resolve(characteristicConverter.toJSObject(data));
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        safePromise.reject(null, errorConverter.toJs(error));
                    }
                }
        );
    }

    @ReactMethod
    public void readCharacteristic(final int characteristicIdentifier,
                                   final String transactionId,
                                   final Promise promise) {
        final SafePromise safePromise = new SafePromise(promise);

        bleAdapter.readCharacteristic(
                characteristicIdentifier, transactionId,
                new OnSuccessCallback<Characteristic>() {
                    @Override
                    public void onSuccess(Characteristic data) {
                        safePromise.resolve(characteristicConverter.toJSObject(data));
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        safePromise.reject(null, errorConverter.toJs(error));
                    }
                }
        );
    }

    @ReactMethod
    public void monitorCharacteristicForDevice(final String deviceId,
                                               final String serviceUUID,
                                               final String characteristicUUID,
                                               final String transactionId,
                                               final Promise promise) {
        final SafePromise safePromise = new SafePromise(promise);
        bleAdapter.monitorCharacteristicForDevice(
                deviceId, serviceUUID, characteristicUUID, transactionId,
                new OnEventCallback<Characteristic>() {
                    @Override
                    public void onEvent(Characteristic data) {
                        WritableArray jsResult = Arguments.createArray();
                        jsResult.pushNull();
                        jsResult.pushMap(characteristicConverter.toJSObject(data));
                        jsResult.pushString(transactionId);
                        sendEvent(Event.ReadEvent, jsResult);
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        safePromise.reject(null, errorConverter.toJs(error));
                    }
                }
        );
    }

    @ReactMethod
    public void monitorCharacteristicForService(final int serviceIdentifier,
                                                final String characteristicUUID,
                                                final String transactionId,
                                                final Promise promise) {
        final SafePromise safePromise = new SafePromise(promise);
        bleAdapter.monitorCharacteristicForService(
                serviceIdentifier, characteristicUUID, transactionId,
                new OnEventCallback<Characteristic>() {
                    @Override
                    public void onEvent(Characteristic data) {
                        WritableArray jsResult = Arguments.createArray();
                        jsResult.pushNull();
                        jsResult.pushMap(characteristicConverter.toJSObject(data));
                        jsResult.pushString(transactionId);
                        sendEvent(Event.ReadEvent, jsResult);
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        safePromise.reject(null, errorConverter.toJs(error));
                    }
                }
        );
    }

    @ReactMethod
    public void monitorCharacteristic(final int characteristicIdentifier,
                                      final String transactionId,
                                      final Promise promise) {
        final SafePromise safePromise = new SafePromise(promise);
        //TODO resolve safePromise with null when monitoring has been completed
        bleAdapter.monitorCharacteristic(
                characteristicIdentifier, transactionId,
                new OnEventCallback<Characteristic>() {
                    @Override
                    public void onEvent(Characteristic data) {
                        WritableArray jsResult = Arguments.createArray();
                        jsResult.pushNull();
                        jsResult.pushMap(characteristicConverter.toJSObject(data));
                        jsResult.pushString(transactionId);
                        sendEvent(Event.ReadEvent, jsResult);
                    }
                }, new OnErrorCallback() {
                    @Override
                    public void onError(BleError error) {
                        safePromise.reject(null, errorConverter.toJs(error));
                    }
                }
        );
    }

    private void sendEvent(@NonNull Event event, @Nullable Object params) {
        getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(event.name, params);
    }
}
