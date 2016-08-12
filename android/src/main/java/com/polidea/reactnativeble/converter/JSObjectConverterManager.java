package com.polidea.reactnativeble.converter;

public class JSObjectConverterManager {
    public RxBleScanResultConverter scanResult = new RxBleScanResultConverter();
    public RxBleDeviceConverter device = new RxBleDeviceConverter();
    public BluetoothGattServiceConverter service = new BluetoothGattServiceConverter();
    public BluetoothGattCharacteristicConverter characteristic = new BluetoothGattCharacteristicConverter();
}
