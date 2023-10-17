package com.bleplx.adapter;

import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattService;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * @noinspection unused
 */
public class Service {

  final private int id;
  final private String deviceID;
  final private BluetoothGattService btGattService;

  public Service(int id, String deviceID, BluetoothGattService btGattService) {
    this.id = id;
    this.deviceID = deviceID;
    this.btGattService = btGattService;
  }

  public int getId() {
    return this.id;
  }

  public UUID getUuid() {
    return btGattService.getUuid();
  }

  public String getDeviceID() {
    return deviceID;
  }

  public boolean isPrimary() {
    return btGattService.getType() == BluetoothGattService.SERVICE_TYPE_PRIMARY;
  }

  @Nullable
  public Characteristic getCharacteristicByUUID(@NonNull UUID uuid) {
    BluetoothGattCharacteristic characteristic = btGattService.getCharacteristic(uuid);
    if (characteristic == null) return null;
    return new Characteristic(this, characteristic);
  }

  public List<Characteristic> getCharacteristics() {
    ArrayList<Characteristic> characteristics = new ArrayList<>(btGattService.getCharacteristics().size());
    for (BluetoothGattCharacteristic gattCharacteristic : btGattService.getCharacteristics()) {
      characteristics.add(new Characteristic(this, gattCharacteristic));
    }
    return characteristics;
  }
}
