package com.polidea.reactnativeble.errors;

import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattService;

import com.polidea.reactnativeble.exceptions.CannotMonitorCharacteristicException;
import com.polidea.reactnativeble.utils.UUIDConverter;
import com.polidea.rxandroidble.exceptions.BleAlreadyConnectedException;
import com.polidea.rxandroidble.exceptions.BleCannotSetCharacteristicNotificationException;
import com.polidea.rxandroidble.exceptions.BleCharacteristicNotFoundException;
import com.polidea.rxandroidble.exceptions.BleConflictingNotificationAlreadySetException;
import com.polidea.rxandroidble.exceptions.BleDisconnectedException;
import com.polidea.rxandroidble.exceptions.BleGattCallbackTimeoutException;
import com.polidea.rxandroidble.exceptions.BleGattCannotStartException;
import com.polidea.rxandroidble.exceptions.BleGattCharacteristicException;
import com.polidea.rxandroidble.exceptions.BleGattDescriptorException;
import com.polidea.rxandroidble.exceptions.BleGattException;
import com.polidea.rxandroidble.exceptions.BleGattOperationType;
import com.polidea.rxandroidble.exceptions.BleScanException;
import com.polidea.rxandroidble.exceptions.BleServiceNotFoundException;

import java.util.UUID;
import java.util.concurrent.TimeoutException;

public class ErrorConverter {

    public BleError toError(Throwable throwable) {

        // Custom exceptions -----------------------------------------------------------------------

        if (throwable instanceof CannotMonitorCharacteristicException) {
            CannotMonitorCharacteristicException exception = (CannotMonitorCharacteristicException) throwable;
            BluetoothGattCharacteristic gattCharacteristic = exception.getCharacteristic();
            BluetoothGattService gattService = gattCharacteristic.getService();
            // TODO: Missing deviceID
            return BleErrorUtils.cannotMonitorCharacteristic(
                    throwable.getMessage(),
                    null,
                    UUIDConverter.fromUUID(gattService.getUuid()),
                    UUIDConverter.fromUUID(gattCharacteristic.getUuid()));
        }

        // RxSwift exceptions ----------------------------------------------------------------------

        if (throwable instanceof TimeoutException) {
            return new BleError(BleErrorCode.OperationTimedOut, throwable.getMessage(), null);
        }

        // RxAndroidBle exceptions -----------------------------------------------------------------

        if (throwable instanceof BleAlreadyConnectedException) {
            // TODO: Missing deviceID
            return new BleError(BleErrorCode.DeviceAlreadyConnected, throwable.getMessage(), null);
        }

        if (throwable instanceof BleCannotSetCharacteristicNotificationException) {
            BluetoothGattCharacteristic gattCharacteristic = ((BleCannotSetCharacteristicNotificationException) throwable).getBluetoothGattCharacteristic();
            BluetoothGattService gattService = gattCharacteristic.getService();
            // TODO: Missing deviceID
            return BleErrorUtils.cannotMonitorCharacteristic(
                    throwable.getMessage(),
                    null,
                    UUIDConverter.fromUUID(gattService.getUuid()),
                    UUIDConverter.fromUUID(gattCharacteristic.getUuid()));
        }


        if (throwable instanceof BleCharacteristicNotFoundException) {
            UUID uuid = ((BleCharacteristicNotFoundException) throwable).getCharactersisticUUID();
            BleError bleError = new BleError(BleErrorCode.CharacteristicNotFound, throwable.getMessage(), null);
            bleError.characteristicUUID = UUIDConverter.fromUUID(uuid);
            return bleError;
        }

        if (throwable instanceof BleConflictingNotificationAlreadySetException) {
            UUID characteristicUUID = ((BleConflictingNotificationAlreadySetException) throwable).getCharacteristicUuid();
            // TODO: Missing Service UUID and device ID
            return BleErrorUtils.cannotMonitorCharacteristic(throwable.getMessage(), null, null, UUIDConverter.fromUUID(characteristicUUID));
        }

        if (throwable instanceof BleDisconnectedException) {
            BleDisconnectedException bleDisconnectedException = (BleDisconnectedException) throwable;
            BleError bleError = new BleError(BleErrorCode.DeviceDisconnected, throwable.getMessage(), bleDisconnectedException.state);
            bleError.deviceID = bleDisconnectedException.bluetoothDeviceAddress;
            return bleError;
        }

        if (throwable instanceof BleScanException) {
            return toError((BleScanException) throwable);
        }

        if (throwable instanceof BleServiceNotFoundException) {
            BleError bleError = new BleError(BleErrorCode.ServiceNotFound, throwable.getMessage(), null);
            bleError.serviceUUID = UUIDConverter.fromUUID(((BleServiceNotFoundException) throwable).getServiceUUID());
            return bleError;
        }

        // RxAndroidBle (GATT) exceptions ----------------------------------------------------------

        if (throwable instanceof BleGattCallbackTimeoutException) {
            return new BleError(BleErrorCode.OperationTimedOut, throwable.getMessage(), ((BleGattCallbackTimeoutException) throwable).getStatus());
        }

        if (throwable instanceof BleGattCannotStartException) {
            return new BleError(BleErrorCode.OperationStartFailed, throwable.getMessage(), ((BleGattCannotStartException) throwable).getStatus());
        }

        if (throwable instanceof BleGattCharacteristicException) {
            BleGattCharacteristicException exception = (BleGattCharacteristicException) throwable;
            int code = exception.getStatus();
            BleGattOperationType operationType = exception.getBleGattOperationType();

            return toError(code,
                    throwable.getMessage(),
                    operationType,
                    exception.getMacAddress(),
                    UUIDConverter.fromUUID(exception.characteristic.getService().getUuid()),
                    UUIDConverter.fromUUID(exception.characteristic.getUuid()),
                    null);
        }

        if (throwable instanceof BleGattDescriptorException) {
            BleGattDescriptorException exception = (BleGattDescriptorException) throwable;
            int code = exception.getStatus();
            BleGattOperationType operationType = exception.getBleGattOperationType();

            return toError(code,
                    throwable.getMessage(),
                    operationType,
                    exception.getMacAddress(),
                    UUIDConverter.fromUUID(exception.descriptor.getCharacteristic().getService().getUuid()),
                    UUIDConverter.fromUUID(exception.descriptor.getCharacteristic().getUuid()),
                    UUIDConverter.fromUUID(exception.descriptor.getUuid()));
        }

        if (throwable instanceof BleGattException) {
            BleGattException exception = (BleGattException) throwable;
            int code = exception.getStatus();
            BleGattOperationType operationType = exception.getBleGattOperationType();

            return toError(code,
                    throwable.getMessage(),
                    operationType,
                    exception.getMacAddress(),
                    null,
                    null,
                    null);
        }

        return new BleError(BleErrorCode.UnknownError, throwable.toString(), null);
    }

    private BleError toError(int code, String message, BleGattOperationType operationType, String deviceID, String serviceUUID, String characteristicUUID, String descriptorUUID) {
        if (BleGattOperationType.CONNECTION_STATE == operationType) {
            BleError bleError = new BleError(BleErrorCode.DeviceDisconnected, message, code);
            bleError.deviceID = deviceID;
            return bleError;
        } else if (BleGattOperationType.SERVICE_DISCOVERY == operationType) {
            BleError bleError = new BleError(BleErrorCode.ServicesDiscoveryFailed, message, code);
            bleError.deviceID = deviceID;
            return bleError;
        } else if (BleGattOperationType.CHARACTERISTIC_READ == operationType || BleGattOperationType.CHARACTERISTIC_CHANGED == operationType) {
            BleError bleError = new BleError(BleErrorCode.CharacteristicReadFailed, message, code);
            bleError.deviceID = deviceID;
            bleError.serviceUUID = serviceUUID;
            bleError.characteristicUUID = characteristicUUID;
            return bleError;
        } else if (BleGattOperationType.CHARACTERISTIC_WRITE == operationType || BleGattOperationType.CHARACTERISTIC_LONG_WRITE == operationType || BleGattOperationType.RELIABLE_WRITE_COMPLETED == operationType) {
            BleError bleError = new BleError(BleErrorCode.CharacteristicWriteFailed, message, code);
            bleError.deviceID = deviceID;
            bleError.serviceUUID = serviceUUID;
            bleError.characteristicUUID = characteristicUUID;
            return bleError;
        } else if (BleGattOperationType.DESCRIPTOR_READ == operationType) {
            BleError bleError = new BleError(BleErrorCode.DescriptorReadFailed, message, code);
            bleError.deviceID = deviceID;
            bleError.serviceUUID = serviceUUID;
            bleError.characteristicUUID = characteristicUUID;
            bleError.descriptorUUID = descriptorUUID;
            return bleError;
        } else if (BleGattOperationType.DESCRIPTOR_WRITE == operationType) {
            BleError bleError = new BleError(BleErrorCode.DescriptorWriteFailed, message, code);
            bleError.deviceID = deviceID;
            bleError.serviceUUID = serviceUUID;
            bleError.characteristicUUID = characteristicUUID;
            bleError.descriptorUUID = descriptorUUID;
            return bleError;
        } else if (BleGattOperationType.READ_RSSI == operationType) {
            BleError bleError = new BleError(BleErrorCode.DeviceRSSIReadFailed, message, code);
            bleError.deviceID = deviceID;
            return bleError;
        } else if (BleGattOperationType.ON_MTU_CHANGED == operationType) {
            BleError bleError = new BleError(BleErrorCode.DeviceMTUChangeFailed, message, code);
            bleError.deviceID = deviceID;
            return bleError;
        } else if (BleGattOperationType.CONNECTION_PRIORITY_CHANGE == operationType) {
            // TODO: Handle?
        }

        return new BleError(BleErrorCode.UnknownError, message, code);
    }

    private BleError toError(BleScanException bleScanException) {
        final int reason = bleScanException.getReason();
        switch (reason) {
            case BleScanException.BLUETOOTH_CANNOT_START:
                return new BleError(BleErrorCode.ScanStartFailed, bleScanException.getMessage(), null);
            case BleScanException.BLUETOOTH_DISABLED:
                return new BleError(BleErrorCode.BluetoothPoweredOff, bleScanException.getMessage(), null);
            case BleScanException.BLUETOOTH_NOT_AVAILABLE:
                return new BleError(BleErrorCode.BluetoothUnsupported, bleScanException.getMessage(), null);
            case BleScanException.LOCATION_PERMISSION_MISSING:
                return new BleError(BleErrorCode.BluetoothUnauthorized, bleScanException.getMessage(), null);
            case BleScanException.LOCATION_SERVICES_DISABLED:
                return new BleError(BleErrorCode.LocationServicesDisabled, bleScanException.getMessage(), null);
            default:
                return new BleError(BleErrorCode.ScanStartFailed, bleScanException.getMessage(), null);
        }
    }
}