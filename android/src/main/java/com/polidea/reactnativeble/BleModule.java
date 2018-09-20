package com.polidea.reactnativeble;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.polidea.blenative.ManagerWrapper;
import com.polidea.blenative.utils.ResultKey;

import java.util.Arrays;
import java.util.Map;

import kotlin.jvm.functions.Function1;

public class BleModule extends ReactContextBaseJavaModule {

    private static final String NAME = "BleClientManager";

    private ManagerWrapper wrapper = new ManagerWrapper();

    BleModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return NAME;
    }

    @ReactMethod
    void createCentralClient(ReadableMap options, final Callback callback) {
        wrapper.createCentralManager(getReactApplicationContext(), NativeParser.toNative(options), callbackWrapper(callback));
    }

    @ReactMethod
    void destroyCentralClient(Integer managerId) {
        wrapper.destroyCentralManager(managerId);
    }

    @ReactMethod
    void cancelPromise(Integer managerId, String promiseId) {
        wrapper.cancelPromise(managerId, promiseId);
    }

    @ReactMethod
    void actionOnBuffer(Integer managerId, Integer bufferId, ReadableMap options, ReadableMap cancelOptions, Callback callback) {
        wrapper.actionOnBuffer(managerId, bufferId, NativeParser.toNative(options), NativeParser.toNative(cancelOptions), callbackWrapper(callback));
    }

    @ReactMethod
    void stopBuffer(Integer managerId, Integer bufferId, Callback callback) {
        wrapper.stopBuffer(managerId, bufferId, callbackWrapper(callback));
    }

    @ReactMethod
    void getState(Integer managerId, Callback callback) {
        wrapper.getState(managerId, callbackWrapper(callback));
    }

    @ReactMethod
    void monitorState(Integer managerId, ReadableMap options, Callback callback) {
        wrapper.monitorState(managerId, NativeParser.toNative(options), callbackWrapper(callback));
    }

    @ReactMethod
    void monitorRestoreState(Integer managerId, Callback callback) {
        wrapper.monitorRestoreState(managerId, callbackWrapper(callback));
    }

    @ReactMethod
    void scanForPeripherals(Integer managerId, ReadableArray filteredUUIDs, ReadableMap options, Callback callback) {
        String[] uuids = null;
        if (filteredUUIDs != null) {
            final Object[] objectUuidsArray = NativeParser.toNative(filteredUUIDs).toArray();
            uuids = Arrays.copyOf(objectUuidsArray, objectUuidsArray.length, String[].class);
        }
        wrapper.scanForPeripherals(managerId, uuids, NativeParser.toNative(options), callbackWrapper(callback));
    }

    @ReactMethod
    void readRSSIForPeripheral(Integer managerId, String peripheralUuid, ReadableMap cancelOptions, Callback callback) {
        wrapper.readRSSIForPeripheral(managerId, peripheralUuid, NativeParser.toNative(cancelOptions), callbackWrapper(callback));
    }

    @ReactMethod
    void requestMTUForPeripheral(Integer managerId, String peripheralUuid, Integer mtu, ReadableMap cancelOptions, Callback callback) {
        wrapper.requestMTUForPeripheral(managerId, peripheralUuid, mtu, NativeParser.toNative(cancelOptions), callbackWrapper(callback));
    }

    @ReactMethod
    void getMTUForPeripheral(Integer managerId, String peripheralUuid, Callback callback) {
        wrapper.getMTUForPeripheral(managerId, peripheralUuid, callbackWrapper(callback));
    }

    @ReactMethod
    void monitorMTUForPeripheral(Integer managerId, String peripheralUuid, Callback callback) {
        wrapper.monitorMTUForPeripheral(managerId, peripheralUuid, callbackWrapper(callback));
    }

    @ReactMethod
    void getPeripherals(Integer managerId, ReadableArray deviceIdentifiers, Callback callback) {
        final Object[] identifiersObjectArray = NativeParser.toNative(deviceIdentifiers).toArray();
        wrapper.getPeripherals(managerId, Arrays.copyOf(identifiersObjectArray, identifiersObjectArray.length, String[].class), callbackWrapper(callback));
    }

    @ReactMethod
    void getConnectedPeripherals(Integer managerId, ReadableArray serviceUuids, Callback callback) {
        final Object[] idsObjectArray = NativeParser.toNative(serviceUuids).toArray();
        wrapper.getConnectedPeripherals(managerId, Arrays.copyOf(idsObjectArray, idsObjectArray.length, String[].class), callbackWrapper(callback));
    }

    @ReactMethod
    void connectToPeripheral(Integer managerId, String peripheralUuid, ReadableMap options, Callback callback) {
        wrapper.connectToPeripheral(managerId, peripheralUuid, NativeParser.toNative(options), callbackWrapper(callback));
    }

    @ReactMethod
    void cancelPeripheralConnection(Integer managerId, String peripheralUuid, ReadableMap cancelOptions, Callback callback) {
        wrapper.cancelPeripheralConnection(managerId, peripheralUuid, NativeParser.toNative(cancelOptions), callbackWrapper(callback));
    }

    @ReactMethod
    void isPeripheralConnected(Integer managerId, String peripheralUuid, Callback callback) {
        wrapper.isPeripheralConnected(managerId, peripheralUuid, callbackWrapper(callback));
    }

    @ReactMethod
    void monitorDisconnection(Integer managerId, Callback callback) {
        wrapper.monitorDisconnection(managerId, callbackWrapper(callback));
    }

    @ReactMethod
    void getNameForPeripheral(Integer managerId, String peripheralUuid, Callback callback) {
        wrapper.getNameForPeripheral(managerId, peripheralUuid, callbackWrapper(callback));
    }

    @ReactMethod
    void monitorPeripheralName(Integer managerId, String peripheralUuid, Callback callback) {
        wrapper.monitorPeripheralName(managerId, peripheralUuid, callbackWrapper(callback));
    }

    @ReactMethod
    void discoverAllServicesAndCharacteristicsForPeripheral(Integer managerId, String peripheralUuid, Callback callback) {
        wrapper.discoverAllServicesAndCharacteristicsForPeripheral(managerId, peripheralUuid, callbackWrapper(callback));
    }

    @ReactMethod
    void getServiceForPeripheral(Integer managerId, String peripheralUuid, String serviceUuid, Callback callback) {
        wrapper.getServiceForPeripheral(managerId, peripheralUuid, serviceUuid, callbackWrapper(callback));
    }

    @ReactMethod
    void getServicesForPeripheral(Integer managerId, String peripheralUuid, Callback callback) {
        wrapper.getServicesForPeripheral(managerId, peripheralUuid, callbackWrapper(callback));
    }

    @ReactMethod
    void getCharacteristicForServiceByUUID(Integer managerId, String peripheralUuid, String serviceUuid, String characteristicUuid, Callback callback) {
        wrapper.getCharacteristicForServiceByUUID(managerId, peripheralUuid, serviceUuid, characteristicUuid, callbackWrapper(callback));
    }

    @ReactMethod
    void getCharacteristicForService(Integer managerId, Integer serviceId, String characteristicUuid, Callback callback) {
        wrapper.getCharacteristicForService(managerId, serviceId, characteristicUuid, callbackWrapper(callback));
    }

    @ReactMethod
    void getCharacteristicsForService(Integer managerId, Integer serviceId, Callback callback) {
        wrapper.getCharacteristicsForService(managerId, serviceId, callbackWrapper(callback));
    }

    @ReactMethod
    void readBase64CharacteristicValue(Integer managerId, Integer characteristicId, ReadableMap cancelOptions, Callback callback) {
        wrapper.readBase64CharacteristicValue(managerId, characteristicId, NativeParser.toNative(cancelOptions), callbackWrapper(callback));
    }

    @ReactMethod
    void writeBase64CharacteristicValue(Integer managerId, Integer characteristicId, String valueBase64, Boolean response, ReadableMap cancelOptions, Callback callback) {
        wrapper.writeBase64CharacteristicValue(managerId, characteristicId, valueBase64, response, NativeParser.toNative(cancelOptions), callbackWrapper(callback));
    }

    @ReactMethod
    void monitorBase64CharacteristicValue(Integer managerId, Integer characteristicId, Callback callback) {
        wrapper.monitorBase64CharacteristicValue(managerId, characteristicId, callbackWrapper(callback));
    }

    @ReactMethod
    void isCharacteristicNotifying(Integer managerId, Integer characteristicId, Callback callback) {
        wrapper.isCharacteristicNotifying(managerId, characteristicId, callbackWrapper(callback));
    }

    @ReactMethod
    void setLogLevel(String logLevel) {
        wrapper.setLogLevel(logLevel);
    }

    @ReactMethod
    void getLogLevel(Callback callback) {
        wrapper.getLogLevel(callbackWrapper(callback));
    }

    private Function1<Map<Integer, ?>, Void> callbackWrapper(final Callback callback) {
        return new Function1<Map<Integer, ? extends Object>, Void>() {
            @Override
            public Void invoke(Map<Integer, ?> result) {
                callback.invoke(
                        NativeParser.toJs(result.get(ResultKey.ERROR.getValue())),
                        NativeParser.toJs(result.get(ResultKey.DATA.getValue()))
                );
                return null;
            }
        };
    }
}
