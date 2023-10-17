package com.bleplx.adapter;

import android.bluetooth.BluetoothGattDescriptor;

import androidx.annotation.NonNull;

import com.bleplx.adapter.utils.ByteUtils;
import com.bleplx.adapter.utils.IdGenerator;
import com.bleplx.adapter.utils.IdGeneratorKey;
import com.polidea.rxandroidble2.internal.RxBleLog;

import java.util.UUID;

/**
 * @noinspection unused
 */
public class Descriptor {
  final private int characteristicId;
  final private int serviceId;
  final private UUID characteristicUuid;
  final private UUID serviceUuid;
  final private String deviceId;
  final private BluetoothGattDescriptor descriptor;
  final private int id;
  final private UUID uuid;
  private byte[] value = null;

  public Descriptor(@NonNull Characteristic characteristic, @NonNull BluetoothGattDescriptor gattDescriptor) {
    this.characteristicId = characteristic.getId();
    this.characteristicUuid = characteristic.getUuid();
    this.serviceId = characteristic.getServiceID();
    this.serviceUuid = characteristic.getServiceUUID();
    this.descriptor = gattDescriptor;
    this.deviceId = characteristic.getDeviceId();
    this.id = IdGenerator.getIdForKey(new IdGeneratorKey(deviceId, descriptor.getUuid(), characteristicId));
    this.uuid = gattDescriptor.getUuid();
  }

  //secondary constructor, not used by MBA itself, but which can be used by external plugins (eg. BLEmulator)
  public Descriptor(int characteristicId, int serviceId, UUID characteristicUuid, UUID serviceUuid, String deviceId, BluetoothGattDescriptor descriptor, int id, UUID uuid) {
    this.characteristicId = characteristicId;
    this.serviceId = serviceId;
    this.characteristicUuid = characteristicUuid;
    this.serviceUuid = serviceUuid;
    this.deviceId = deviceId;
    this.descriptor = descriptor;
    this.id = id;
    this.uuid = uuid;
  }

  public Descriptor(Descriptor other) {
    characteristicUuid = other.characteristicUuid;
    characteristicId = other.characteristicId;
    serviceUuid = other.serviceUuid;
    serviceId = other.serviceId;
    deviceId = other.deviceId;
    descriptor = other.descriptor;
    id = other.id;
    uuid = other.uuid;
    if (other.value != null) value = other.value.clone();
  }

  public int getId() {
    return id;
  }

  public String getDeviceId() {
    return deviceId;
  }

  public int getCharacteristicId() {
    return characteristicId;
  }

  public int getServiceId() {
    return serviceId;
  }

  public UUID getCharacteristicUuid() {
    return characteristicUuid;
  }

  public UUID getServiceUuid() {
    return serviceUuid;
  }

  public UUID getUuid() {
    return uuid;
  }

  public byte[] getValue() {
    return value;
  }

  public void setValue(byte[] value) {
    this.value = value;
  }

  public void setValueFromCache() {
    value = descriptor.getValue();
  }

  public BluetoothGattDescriptor getNativeDescriptor() {
    return descriptor;
  }

  public void logValue(String message, byte[] value) {
    if (value == null) {
      value = descriptor.getValue();
    }
    String hexValue = value != null ? ByteUtils.bytesToHex(value) : "(null)";
    RxBleLog.v(message +
      " Descriptor(uuid: " + descriptor.getUuid().toString() +
      ", id: " + id +
      ", value: " + hexValue + ")");
  }
}
