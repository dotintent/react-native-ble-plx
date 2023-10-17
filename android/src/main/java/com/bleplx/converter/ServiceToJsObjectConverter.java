package com.bleplx.converter;

import com.bleplx.adapter.Service;
import com.bleplx.adapter.utils.UUIDConverter;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

public class ServiceToJsObjectConverter extends JSObjectConverter<Service> {

  private interface Metadata {
    String ID = "id";
    String UUID = "uuid";
    String DEVICE_ID = "deviceID";
    String IS_PRIMARY = "isPrimary";
  }

  @Override
  public WritableMap toJSObject(Service service) {
    WritableMap result = Arguments.createMap();
    result.putInt(Metadata.ID, service.getId());
    result.putString(Metadata.UUID, UUIDConverter.fromUUID(service.getUuid()));
    result.putString(Metadata.DEVICE_ID, service.getDeviceID());
    result.putBoolean(Metadata.IS_PRIMARY, service.isPrimary());
    return result;
  }
}
