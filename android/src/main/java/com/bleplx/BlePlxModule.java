package com.bleplx;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.bleplx.adapter.BleAdapter;
import com.bleplx.adapter.BleAdapterFactory;
import com.bleplx.adapter.Characteristic;
import com.bleplx.adapter.ConnectionOptions;
import com.bleplx.adapter.ConnectionState;
import com.bleplx.adapter.Descriptor;
import com.bleplx.adapter.Device;
import com.bleplx.adapter.OnErrorCallback;
import com.bleplx.adapter.OnEventCallback;
import com.bleplx.adapter.OnSuccessCallback;
import com.bleplx.adapter.RefreshGattMoment;
import com.bleplx.adapter.ScanResult;
import com.bleplx.adapter.Service;
import com.bleplx.adapter.errors.BleError;
import com.bleplx.adapter.errors.BleErrorCode;
import com.bleplx.converter.BleErrorToJsObjectConverter;
import com.bleplx.converter.CharacteristicToJsObjectConverter;
import com.bleplx.converter.DescriptorToJsObjectConverter;
import com.bleplx.converter.DeviceToJsObjectConverter;
import com.bleplx.converter.ScanResultToJsObjectConverter;
import com.bleplx.converter.ServiceToJsObjectConverter;
import com.bleplx.utils.ReadableArrayConverter;
import com.bleplx.utils.SafePromise;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.polidea.rxandroidble2.internal.RxBleLog;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import io.reactivex.exceptions.UndeliverableException;
import io.reactivex.plugins.RxJavaPlugins;

@ReactModule(name = BlePlxModule.NAME)
public class BlePlxModule extends ReactContextBaseJavaModule {
  public static final String NAME = "BlePlx";
  private final ReactApplicationContext reactContext;

  public BlePlxModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
    RxJavaPlugins.setErrorHandler(throwable -> {
      if (throwable instanceof UndeliverableException) {
        RxBleLog.e("Handle all unhandled exceptions from RxJava: " + throwable.getMessage());
      } else {
        Thread currentThread = Thread.currentThread();
        Thread.UncaughtExceptionHandler errorHandler = currentThread.getUncaughtExceptionHandler();
        if (errorHandler != null) {
          errorHandler.uncaughtException(currentThread, throwable);
        }
      }
    });
  }

  @Override
  @NonNull
  public String getName() {
    return NAME;
  }


  // Value converters
  private final BleErrorToJsObjectConverter errorConverter = new BleErrorToJsObjectConverter();
  private final ScanResultToJsObjectConverter scanResultConverter = new ScanResultToJsObjectConverter();
  private final DeviceToJsObjectConverter deviceConverter = new DeviceToJsObjectConverter();
  private final CharacteristicToJsObjectConverter characteristicConverter = new CharacteristicToJsObjectConverter();
  private final DescriptorToJsObjectConverter descriptorConverter = new DescriptorToJsObjectConverter();
  private final ServiceToJsObjectConverter serviceConverter = new ServiceToJsObjectConverter();

  private BleAdapter bleAdapter;

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
    bleAdapter = BleAdapterFactory.getNewAdapter(reactContext);
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
  public void destroyClient(final Promise promise) {
    if (!this.isRequestPossibleHandler("destroyClient", promise)) {
      return;
    }

    bleAdapter.destroyClient();
    bleAdapter = null;
    promise.resolve(null);
  }

  // Mark: Common --------------------------------------------------------------------------------

  @ReactMethod
  public void cancelTransaction(String transactionId, final Promise promise) {
    if (!this.isRequestPossibleHandler("cancelTransaction", promise)) {
      return;
    }
    bleAdapter.cancelTransaction(transactionId);
    promise.resolve(null);
  }

  @ReactMethod
  public void setLogLevel(String logLevel, final Promise promise) {
    if (!this.isRequestPossibleHandler("setLogLevel", promise)) {
      return;
    }
    bleAdapter.setLogLevel(logLevel);
    promise.resolve(bleAdapter.getLogLevel());
  }

  @ReactMethod
  public void logLevel(final Promise promise) {
    if (!this.isRequestPossibleHandler("logLevel", promise)) {
      return;
    }
    promise.resolve(bleAdapter.getLogLevel());
  }

  // Mark: Monitoring state ----------------------------------------------------------------------

  @ReactMethod
  public void enable(final String transactionId, final Promise promise) {
    if (!this.isRequestPossibleHandler("enable", promise)) {
      return;
    }
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
    if (!this.isRequestPossibleHandler("disable", promise)) {
      return;
    }
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
  public void state(final Promise promise) {
    if (!this.isRequestPossibleHandler("state", promise)) {
      return;
    }
    promise.resolve(bleAdapter.getCurrentState());
  }

  // Mark: Scanning ------------------------------------------------------------------------------

  @ReactMethod
  public void startDeviceScan(@Nullable ReadableArray filteredUUIDs, @Nullable ReadableMap options, final Promise promise) {
    if (!this.isRequestPossibleHandler("startDeviceScan", promise)) {
      return;
    }
    final int DEFAULT_SCAN_MODE_LOW_POWER = 0;
    final int DEFAULT_CALLBACK_TYPE_ALL_MATCHES = 1;

    int scanMode = DEFAULT_SCAN_MODE_LOW_POWER;
    int callbackType = DEFAULT_CALLBACK_TYPE_ALL_MATCHES;
    boolean legacyScan = true;

    if (options != null) {
      if (options.hasKey("scanMode") && options.getType("scanMode") == ReadableType.Number) {
        scanMode = options.getInt("scanMode");
      }
      if (options.hasKey("callbackType") && options.getType("callbackType") == ReadableType.Number) {
        callbackType = options.getInt("callbackType");
      }
      if (options.hasKey("legacyScan") && options.getType("legacyScan") == ReadableType.Boolean) {
        legacyScan = options.getBoolean("legacyScan");
      }
    }

    bleAdapter.startDeviceScan(
      filteredUUIDs != null ? ReadableArrayConverter.toStringArray(filteredUUIDs) : null,
      scanMode, callbackType, legacyScan,
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

      promise.resolve(null);
  }

  @ReactMethod
  public void stopDeviceScan(final Promise promise) {
    if (!this.isRequestPossibleHandler("stopDeviceScan", promise)) {
      return;
    }
    bleAdapter.stopDeviceScan();
    promise.resolve(null);
  }

  // Mark: Device management ---------------------------------------------------------------------

  @ReactMethod
  public void devices(final ReadableArray deviceIdentifiers, final Promise promise) {
    if (!this.isRequestPossibleHandler("devices", promise)) {
      return;
    }
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
    if (!this.isRequestPossibleHandler("connectedDevices", promise)) {
      return;
    }
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
    if (!this.isRequestPossibleHandler("requestConnectionPriorityForDevice", promise)) {
      return;
    }
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
    if (!this.isRequestPossibleHandler("requestMTUForDevice", promise)) {
      return;
    }
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
    if (!this.isRequestPossibleHandler("readRSSIForDevice", promise)) {
      return;
    }
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
    if (!this.isRequestPossibleHandler("connectToDevice", promise)) {
      return;
    }
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
      },
      new OnEventCallback<ConnectionState>() {
        @Override
        public void onEvent(ConnectionState connectionState) {
          if (connectionState == ConnectionState.DISCONNECTED) {
            WritableArray event = Arguments.createArray();
            event.pushNull();
            WritableMap device = Arguments.createMap();
            device.putString("id", deviceId);
            event.pushMap(device);
            sendEvent(Event.DisconnectionEvent, event);
          }
        }
      },
      new OnErrorCallback() {
        @Override
        public void onError(BleError error) {
          safePromise.reject(null, errorConverter.toJs(error));
        }
      });
  }

  @ReactMethod
  public void cancelDeviceConnection(String deviceId, final Promise promise) {
    if (!this.isRequestPossibleHandler("cancelDeviceConnection", promise)) {
      return;
    }
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
    if (!this.isRequestPossibleHandler("isDeviceConnected", promise)) {
      return;
    }
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
    if (!this.isRequestPossibleHandler("discoverAllServicesAndCharacteristicsForDevice", promise)) {
      return;
    }
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
    if (!this.isRequestPossibleHandler("servicesForDevice", promise)) {
      return;
    }
    try {
      List<Service> services = bleAdapter.getServicesForDevice(deviceId);
      WritableArray jsArray = Arguments.createArray();
      for (Service service : services) {
        jsArray.pushMap(serviceConverter.toJSObject(service));
      }
      promise.resolve(jsArray);
    } catch (BleError error) {
      promise.reject(null, errorConverter.toJs(error));
    }

  }

  @ReactMethod
  public void characteristicsForDevice(final String deviceId,
                                       final String serviceUUID,
                                       final Promise promise) {
    if (!this.isRequestPossibleHandler("characteristicsForDevice", promise)) {
      return;
    }
    try {
      List<Characteristic> characteristics = bleAdapter.getCharacteristicsForDevice(deviceId, serviceUUID);

      WritableArray jsCharacteristics = Arguments.createArray();
      for (Characteristic characteristic : characteristics) {
        jsCharacteristics.pushMap(characteristicConverter.toJSObject(characteristic));
      }
      promise.resolve(jsCharacteristics);
    } catch (BleError error) {
      promise.reject(null, errorConverter.toJs(error));
    }
  }

  @ReactMethod
  public void characteristicsForService(final int serviceIdentifier, final Promise promise) {
    if (!this.isRequestPossibleHandler("characteristicsForService", promise)) {
      return;
    }
    try {
      List<Characteristic> characteristics = bleAdapter.getCharacteristicsForService(serviceIdentifier);
      WritableArray jsCharacteristics = Arguments.createArray();
      for (Characteristic characteristic : characteristics) {
        jsCharacteristics.pushMap(characteristicConverter.toJSObject(characteristic));
      }
      promise.resolve(jsCharacteristics);
    } catch (BleError error) {
      promise.reject(null, errorConverter.toJs(error));
    }
  }

  @ReactMethod
  public void descriptorsForDevice(final String deviceIdentifier,
                                   final String serviceUUID,
                                   final String characteristicUUID,
                                   final Promise promise) {
    if (!this.isRequestPossibleHandler("descriptorsForDevice", promise)) {
      return;
    }
    try {
      List<Descriptor> descriptors = bleAdapter.descriptorsForDevice(deviceIdentifier, serviceUUID, characteristicUUID);
      WritableArray jsDescriptors = Arguments.createArray();
      for (Descriptor descriptor : descriptors) {
        jsDescriptors.pushMap(descriptorConverter.toJSObject(descriptor));
      }
      promise.resolve(jsDescriptors);
    } catch (BleError error) {
      promise.reject(null, errorConverter.toJs(error));
    }
  }

  @ReactMethod
  public void descriptorsForService(final int serviceIdentifier,
                                    final String characteristicUUID,
                                    final Promise promise) {
    if (!this.isRequestPossibleHandler("descriptorsForService", promise)) {
      return;
    }
    try {
      List<Descriptor> descriptors = bleAdapter.descriptorsForService(serviceIdentifier, characteristicUUID);
      WritableArray jsDescriptors = Arguments.createArray();
      for (Descriptor descriptor : descriptors) {
        jsDescriptors.pushMap(descriptorConverter.toJSObject(descriptor));
      }
      promise.resolve(jsDescriptors);
    } catch (BleError error) {
      promise.reject(null, errorConverter.toJs(error));
    }
  }

  @ReactMethod
  public void descriptorsForCharacteristic(final int characteristicIdentifier,
                                           final Promise promise) {
    if (!this.isRequestPossibleHandler("descriptorsForCharacteristic", promise)) {
      return;
    }
    try {
      List<Descriptor> descriptors = bleAdapter.descriptorsForCharacteristic(characteristicIdentifier);
      WritableArray jsDescriptors = Arguments.createArray();
      for (Descriptor descriptor : descriptors) {
        jsDescriptors.pushMap(descriptorConverter.toJSObject(descriptor));
      }
      promise.resolve(jsDescriptors);
    } catch (BleError error) {
      promise.reject(null, errorConverter.toJs(error));
    }
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
    if (!this.isRequestPossibleHandler("writeCharacteristicForDevice", promise)) {
      return;
    }
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
    if (!this.isRequestPossibleHandler("writeCharacteristicForService", promise)) {
      return;
    }
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
    if (!this.isRequestPossibleHandler("writeCharacteristic", promise)) {
      return;
    }
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
    if (!this.isRequestPossibleHandler("readCharacteristicForDevice", promise)) {
      return;
    }
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
    if (!this.isRequestPossibleHandler("readCharacteristicForService", promise)) {
      return;
    }
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
    if (!this.isRequestPossibleHandler("readCharacteristic", promise)) {
      return;
    }
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
                                             final String subscriptionType,
                                             final Promise promise) {
    if (!this.isRequestPossibleHandler("monitorCharacteristicForDevice", promise)) {
      return;
    }
    final SafePromise safePromise = new SafePromise(promise);
    bleAdapter.monitorCharacteristicForDevice(
      deviceId, serviceUUID, characteristicUUID, transactionId, subscriptionType,
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
                                              final String subscriptionType,
                                              final Promise promise) {
    if (!this.isRequestPossibleHandler("monitorCharacteristicForService", promise)) {
      return;
    }
    final SafePromise safePromise = new SafePromise(promise);
    bleAdapter.monitorCharacteristicForService(
      serviceIdentifier, characteristicUUID, transactionId, subscriptionType,
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
                                    final String subscriptionType,
                                    final Promise promise) {
    if (!this.isRequestPossibleHandler("monitorCharacteristic", promise)) {
      return;
    }
    final SafePromise safePromise = new SafePromise(promise);
    //TODO resolve safePromise with null when monitoring has been completed
    bleAdapter.monitorCharacteristic(
      characteristicIdentifier, transactionId, subscriptionType,
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
  public void readDescriptorForDevice(final String deviceId,
                                      final String serviceUUID,
                                      final String characteristicUUID,
                                      final String descriptorUUID,
                                      final String transactionId,
                                      final Promise promise) {
    if (!this.isRequestPossibleHandler("readDescriptorForDevice", promise)) {
      return;
    }
    bleAdapter.readDescriptorForDevice(
      deviceId,
      serviceUUID,
      characteristicUUID,
      descriptorUUID,
      transactionId,
      new OnSuccessCallback<Descriptor>() {
        @Override
        public void onSuccess(Descriptor descriptor) {
          promise.resolve(descriptorConverter.toJSObject(descriptor));
        }
      }, new OnErrorCallback() {
        @Override
        public void onError(BleError bleError) {
          promise.reject(null, errorConverter.toJs(bleError));
        }
      });
  }

  @ReactMethod
  public void readDescriptorForService(final int serviceIdentifier,
                                       final String characteristicUUID,
                                       final String descriptorUUID,
                                       final String transactionId,
                                       final Promise promise) {
    if (!this.isRequestPossibleHandler("readDescriptorForService", promise)) {
      return;
    }
    bleAdapter.readDescriptorForService(
      serviceIdentifier,
      characteristicUUID,
      descriptorUUID,
      transactionId,
      new OnSuccessCallback<Descriptor>() {
        @Override
        public void onSuccess(Descriptor descriptor) {
          promise.resolve(descriptorConverter.toJSObject(descriptor));
        }
      },
      new OnErrorCallback() {
        @Override
        public void onError(BleError bleError) {
          promise.reject(null, errorConverter.toJs(bleError));
        }
      });
  }

  @ReactMethod
  public void readDescriptorForCharacteristic(final int characteristicIdentifier,
                                              final String descriptorUUID,
                                              final String transactionId,
                                              final Promise promise) {
    if (!this.isRequestPossibleHandler("readDescriptorForCharacteristic", promise)) {
      return;
    }
    bleAdapter.readDescriptorForCharacteristic(
      characteristicIdentifier,
      descriptorUUID,
      transactionId,
      new OnSuccessCallback<Descriptor>() {
        @Override
        public void onSuccess(Descriptor descriptor) {
          promise.resolve(descriptorConverter.toJSObject(descriptor));
        }
      },
      new OnErrorCallback() {
        @Override
        public void onError(BleError bleError) {
          promise.reject(null, errorConverter.toJs(bleError));
        }
      });
  }

  @ReactMethod
  public void readDescriptor(final int descriptorIdentifier,
                             final String transactionId,
                             final Promise promise) {
    if (!this.isRequestPossibleHandler("readDescriptor", promise)) {
      return;
    }
    bleAdapter.readDescriptor(
      descriptorIdentifier,
      transactionId,
      new OnSuccessCallback<Descriptor>() {
        @Override
        public void onSuccess(Descriptor descriptor) {
          promise.resolve(descriptorConverter.toJSObject(descriptor));
        }
      },
      new OnErrorCallback() {
        @Override
        public void onError(BleError bleError) {
          promise.reject(null, errorConverter.toJs(bleError));
        }
      });
  }

  @ReactMethod
  public void writeDescriptorForDevice(final String deviceId,
                                       final String serviceUUID,
                                       final String characteristicUUID,
                                       final String descriptorUUID,
                                       final String valueBase64,
                                       final String transactionId,
                                       final Promise promise) {
    if (!this.isRequestPossibleHandler("writeDescriptorForDevice", promise)) {
      return;
    }
    bleAdapter.writeDescriptorForDevice(
      deviceId,
      serviceUUID,
      characteristicUUID,
      descriptorUUID,
      valueBase64,
      transactionId,
      new OnSuccessCallback<Descriptor>() {
        @Override
        public void onSuccess(Descriptor descriptor) {
          promise.resolve(descriptorConverter.toJSObject(descriptor));
        }
      },
      new OnErrorCallback() {
        @Override
        public void onError(BleError bleError) {
          promise.reject(null, errorConverter.toJs(bleError));
        }
      }
    );
  }

  @ReactMethod
  public void writeDescriptorForService(final int serviceIdentifier,
                                        final String characteristicUUID,
                                        final String descriptorUUID,
                                        final String valueBase64,
                                        final String transactionId,
                                        final Promise promise) {
    if (!this.isRequestPossibleHandler("writeDescriptorForService", promise)) {
      return;
    }
    bleAdapter.writeDescriptorForService(
      serviceIdentifier,
      characteristicUUID,
      descriptorUUID,
      valueBase64,
      transactionId,
      new OnSuccessCallback<Descriptor>() {
        @Override
        public void onSuccess(Descriptor descriptor) {
          promise.resolve(descriptorConverter.toJSObject(descriptor));
        }
      },
      new OnErrorCallback() {
        @Override
        public void onError(BleError bleError) {
          promise.reject(null, errorConverter.toJs(bleError));
        }
      }
    );
  }

  @ReactMethod
  public void writeDescriptorForCharacteristic(final int characteristicIdentifier,
                                               final String descriptorUUID,
                                               final String valueBase64,
                                               final String transactionId,
                                               final Promise promise) {
    if (!this.isRequestPossibleHandler("writeDescriptorForCharacteristic", promise)) {
      return;
    }
    bleAdapter.writeDescriptorForCharacteristic(
      characteristicIdentifier,
      descriptorUUID,
      valueBase64,
      transactionId,
      new OnSuccessCallback<Descriptor>() {
        @Override
        public void onSuccess(Descriptor descriptor) {
          promise.resolve(descriptorConverter.toJSObject(descriptor));
        }
      },
      new OnErrorCallback() {
        @Override
        public void onError(BleError bleError) {
          promise.reject(null, errorConverter.toJs(bleError));
        }
      }
    );
  }

  @ReactMethod
  public void writeDescriptor(final int descriptorIdentifier,
                              final String valueBase64,
                              final String transactionId,
                              final Promise promise) {
    if (!this.isRequestPossibleHandler("writeDescriptor", promise)) {
      return;
    }
    bleAdapter.writeDescriptor(
      descriptorIdentifier,
      valueBase64,
      transactionId,
      new OnSuccessCallback<Descriptor>() {
        @Override
        public void onSuccess(Descriptor descriptor) {
          promise.resolve(descriptorConverter.toJSObject(descriptor));
        }
      },
      new OnErrorCallback() {
        @Override
        public void onError(BleError bleError) {
          promise.reject(null, errorConverter.toJs(bleError));
        }
      }
    );
  }

  @ReactMethod
  public void addListener(String eventName) {
    // Keep: Required for RN built in Event Emitter Calls.
  }

  @ReactMethod
  public void removeListeners(int count) {
    // Keep: Required for RN built in Event Emitter Calls.
  }

  private void sendEvent(@NonNull Event event, @Nullable Object params) {
    getReactApplicationContext()
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
      .emit(event.name, params);
  }

  private boolean isRequestPossibleHandler(String functionName, final Promise promise) {
    if(this.bleAdapter == null){
      BleError bleError = new BleError(BleErrorCode.BluetoothManagerDestroyed, String.format("BleManager cannot call the %s function because BleManager has been destroyed", functionName), null);

      promise.reject(null, errorConverter.toJs(bleError));
      return false;
    }

    return true;
  }
}
