package com.polidea.reactnativeble.converter;

import com.facebook.react.bridge.WritableMap;
import com.polidea.rxandroidble.RxBleDevice;
import com.polidea.rxandroidble.RxBleDeviceServices;
import com.polidea.rxandroidble.RxBleScanResult;

public class ConverterManager {


    private final RxBleScanResultConverter rxBleScanResultConverter;

    private final RxBleDeviceConverter bleDeviceConverter;

    private final RxBleConnectionStateConverter rxBleConnectionStateConverter;

    private final RxBleDeviceServicesConverter rxBleDeviceServicesConverter;

    private final BluetoothGattServiceConverter bluetoothGattServiceConverter;

    private final BluetoothGattCharacteristicConverter bluetoothGattCharacteristicConverter;

    public ConverterManager() {
        rxBleConnectionStateConverter = new RxBleConnectionStateConverter();
        bluetoothGattCharacteristicConverter = new BluetoothGattCharacteristicConverter();
        bluetoothGattServiceConverter = new BluetoothGattServiceConverter(bluetoothGattCharacteristicConverter);
        rxBleDeviceServicesConverter = new RxBleDeviceServicesConverter(bluetoothGattServiceConverter);
        bleDeviceConverter = new RxBleDeviceConverter(rxBleConnectionStateConverter);
        rxBleScanResultConverter = new RxBleScanResultConverter(bleDeviceConverter);
    }

    public WritableMap convert(RxBleScanResult rxBleScanResult) {
        return rxBleScanResultConverter.convert(rxBleScanResult);
    }

    public WritableMap convert(RxBleDevice rxBleDevice) {
        return bleDeviceConverter.convert(rxBleDevice);
    }

    public WritableMap convert(RxBleDeviceServices rxBleDeviceServices) {
        return rxBleDeviceServicesConverter.convert(rxBleDeviceServices);
    }
}
