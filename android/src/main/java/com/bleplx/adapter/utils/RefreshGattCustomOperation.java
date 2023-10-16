package com.bleplx.adapter.utils;

import android.bluetooth.BluetoothGatt;

import androidx.annotation.NonNull;

import com.polidea.rxandroidble2.RxBleCustomOperation;
import com.polidea.rxandroidble2.internal.RxBleLog;
import com.polidea.rxandroidble2.internal.connection.RxBleGattCallback;

import java.lang.reflect.Method;
import java.util.concurrent.TimeUnit;

import io.reactivex.Observable;
import io.reactivex.Scheduler;

public class RefreshGattCustomOperation implements RxBleCustomOperation<Boolean> {

  /**
   * @noinspection unchecked, JavaReflectionMemberAccess, DataFlowIssue
   */
  @NonNull
  @Override
  public Observable<Boolean> asObservable(
    final BluetoothGatt bluetoothGatt,
    final RxBleGattCallback rxBleGattCallback,
    final Scheduler scheduler
  ) {
    return Observable.ambArray(
      Observable.fromCallable(() -> {
          boolean success = false;
          try {
            Method bluetoothGattRefreshFunction = bluetoothGatt.getClass().getMethod("refresh");

            success = (Boolean) bluetoothGattRefreshFunction.invoke(bluetoothGatt);

            if (!success) RxBleLog.d("BluetoothGatt.refresh() returned false");
          } catch (Exception e) {
            RxBleLog.d(e, "Could not call function BluetoothGatt.refresh()");
          }

          RxBleLog.i("Calling BluetoothGatt.refresh() status: %s", success ? "Success" : "Failure");
          return success;
        })
        .subscribeOn(scheduler)
        .delay(1, TimeUnit.SECONDS, scheduler),
      rxBleGattCallback.observeDisconnect()
    );
  }
}
