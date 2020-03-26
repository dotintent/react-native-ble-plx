package com.polidea.reactnativeble.converter;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.polidea.multiplatformbleadapter.Characteristic;
import com.polidea.multiplatformbleadapter.utils.Base64Converter;
import com.polidea.multiplatformbleadapter.utils.UUIDConverter;

public class CharacteristicToJsObjectConverter extends JSObjectConverter<Characteristic> {

    private interface Metadata {
        String ID = "id";
        String UUID = "uuid";
        String SERVICE_ID = "serviceID";
        String SERVICE_UUID = "serviceUUID";
        String DEVICE_ID = "deviceID";
        String IS_READABLE = "isReadable";
        String IS_WRITABLE_WITH_RESPONSE = "isWritableWithResponse";
        String IS_WRITABLE_WITHOUT_RESPONSE = "isWritableWithoutResponse";
        String IS_NOTIFIABLE = "isNotifiable";
        String IS_NOTIFYING = "isNotifying";
        String IS_INDICATABLE = "isIndicatable";
        String VALUE = "value";
    }

    @Override
    public WritableMap toJSObject(Characteristic characteristic) {
        WritableMap js = Arguments.createMap();

        js.putInt(Metadata.ID, characteristic.getId());
        js.putString(Metadata.UUID, UUIDConverter.fromUUID(characteristic.getUuid()));
        js.putInt(Metadata.SERVICE_ID, characteristic.getServiceID());
        js.putString(Metadata.SERVICE_UUID, UUIDConverter.fromUUID(characteristic.getServiceUUID()));
        js.putString(Metadata.DEVICE_ID, characteristic.getDeviceId());
        js.putBoolean(Metadata.IS_READABLE, characteristic.isReadable());
        js.putBoolean(Metadata.IS_WRITABLE_WITH_RESPONSE, characteristic.isWritableWithResponse());
        js.putBoolean(Metadata.IS_WRITABLE_WITHOUT_RESPONSE, characteristic.isWritableWithoutResponse());
        js.putBoolean(Metadata.IS_NOTIFIABLE, characteristic.isNotifiable());
        js.putBoolean(Metadata.IS_INDICATABLE, characteristic.isIndicatable());
        js.putBoolean(Metadata.IS_NOTIFYING, characteristic.isNotifying());
        js.putString(Metadata.VALUE,
                characteristic.getValue() != null ?
                        Base64Converter.encode(characteristic.getValue()) : null);
        return js;
    }
}
