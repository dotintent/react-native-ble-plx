package com.bleplx.adapter;

import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.bleplx.adapter.utils.ByteUtils;
import com.bleplx.adapter.utils.Constants;
import com.bleplx.adapter.utils.IdGenerator;
import com.bleplx.adapter.utils.IdGeneratorKey;
import com.polidea.rxandroidble2.internal.RxBleLog;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * @noinspection ALL
 */
public class Characteristic {

  final private int id;
  final private int serviceID;
  final private UUID serviceUUID;
  final private String deviceID;
  private byte[] value;
  final BluetoothGattCharacteristic gattCharacteristic;

  public void setValue(byte[] value) {
    this.value = value;
  }

  public Characteristic(@NonNull Service service, @NonNull BluetoothGattCharacteristic gattCharacteristic) {
    this.deviceID = service.getDeviceID();
    this.serviceUUID = service.getUuid();
    this.serviceID = service.getId();
    this.gattCharacteristic = gattCharacteristic;
    this.id = IdGenerator.getIdForKey(new IdGeneratorKey(deviceID, gattCharacteristic.getUuid(), gattCharacteristic.getInstanceId()));
  }

  public Characteristic(int id, @NonNull Service service, BluetoothGattCharacteristic gattCharacteristic) {
    this.id = id;
    this.deviceID = service.getDeviceID();
    this.serviceUUID = service.getUuid();
    this.serviceID = service.getId();
    this.gattCharacteristic = gattCharacteristic;
  }

  public Characteristic(Characteristic other) {
    id = other.id;
    serviceID = other.serviceID;
    serviceUUID = other.serviceUUID;
    deviceID = other.deviceID;
    if (other.value != null) value = other.value.clone();
    gattCharacteristic = other.gattCharacteristic;
  }

  public int getId() {
    return this.id;
  }

  public UUID getUuid() {
    return gattCharacteristic.getUuid();
  }

  public int getServiceID() {
    return serviceID;
  }

  public UUID getServiceUUID() {
    return serviceUUID;
  }

  public String getDeviceId() {
    return deviceID;
  }

  public int getInstanceId() {
    return gattCharacteristic.getInstanceId();
  }

  public BluetoothGattDescriptor getGattDescriptor(UUID uuid) {
    return gattCharacteristic.getDescriptor(uuid);
  }

  public void setWriteType(int writeType) {
    gattCharacteristic.setWriteType(writeType);
  }

  public boolean isReadable() {
    return (gattCharacteristic.getProperties() & BluetoothGattCharacteristic.PROPERTY_READ) != 0;
  }

  public boolean isWritableWithResponse() {
    return (gattCharacteristic.getProperties() & BluetoothGattCharacteristic.PROPERTY_WRITE) != 0;
  }

  public boolean isWritableWithoutResponse() {
    return (gattCharacteristic.getProperties() & BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE) != 0;
  }

  public boolean isNotifiable() {
    return (gattCharacteristic.getProperties() & BluetoothGattCharacteristic.PROPERTY_NOTIFY) != 0;
  }

  public List<Descriptor> getDescriptors() {
    ArrayList<Descriptor> descriptors = new ArrayList<>(gattCharacteristic.getDescriptors().size());
    for (BluetoothGattDescriptor gattDescriptor : gattCharacteristic.getDescriptors()) {
      descriptors.add(new Descriptor(this, gattDescriptor));
    }
    return descriptors;
  }

  public boolean isNotifying() {
    BluetoothGattDescriptor descriptor = gattCharacteristic.getDescriptor(Constants.CLIENT_CHARACTERISTIC_CONFIG_UUID);
    boolean isNotifying = false;
    if (descriptor != null) {
      byte[] descriptorValue = descriptor.getValue();
      if (descriptorValue != null) {
        isNotifying = (descriptorValue[0] & 0x01) != 0;
      }
    }
    return isNotifying;
  }

  public boolean isIndicatable() {
    return (gattCharacteristic.getProperties() & BluetoothGattCharacteristic.PROPERTY_INDICATE) != 0;
  }

  public byte[] getValue() {
    return value;
  }

  @Nullable
  public Descriptor getDescriptorByUUID(@NonNull UUID uuid) {
    BluetoothGattDescriptor descriptor = this.gattCharacteristic.getDescriptor(uuid);
    if (descriptor == null) return null;
    return new Descriptor(this, descriptor);
  }

  void logValue(String message, byte[] value) {
    if (value == null) {
      value = gattCharacteristic.getValue();
    }
    String hexValue = value != null ? ByteUtils.bytesToHex(value) : "(null)";
    RxBleLog.v(message +
      " Characteristic(uuid: " + gattCharacteristic.getUuid().toString() +
      ", id: " + id +
      ", value: " + hexValue + ")");
  }
}
