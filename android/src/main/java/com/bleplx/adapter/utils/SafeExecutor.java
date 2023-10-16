package com.bleplx.adapter.utils;

import androidx.annotation.Nullable;

import com.bleplx.adapter.OnErrorCallback;
import com.bleplx.adapter.OnSuccessCallback;
import com.bleplx.adapter.errors.BleError;

import java.util.concurrent.atomic.AtomicBoolean;

public class SafeExecutor<T> {

  private final OnSuccessCallback<T> successCallback;
  private final OnErrorCallback errorCallback;
  private final AtomicBoolean wasExecuted = new AtomicBoolean(false);

  public SafeExecutor(@Nullable OnSuccessCallback<T> successCallback, @Nullable OnErrorCallback errorCallback) {
    this.successCallback = successCallback;
    this.errorCallback = errorCallback;
  }

  public void success(T data) {
    if (wasExecuted.compareAndSet(false, true) && successCallback != null) {
      successCallback.onSuccess(data);
    }
  }

  public void error(BleError error) {
    if (wasExecuted.compareAndSet(false, true) && errorCallback != null) {
      errorCallback.onError(error);
    }
  }
}
