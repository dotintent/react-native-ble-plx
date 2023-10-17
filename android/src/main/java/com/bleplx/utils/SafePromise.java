package com.bleplx.utils;

import com.facebook.react.bridge.Promise;

import java.util.concurrent.atomic.AtomicBoolean;

import javax.annotation.Nullable;

public class SafePromise {
  private Promise promise;
  private AtomicBoolean isFinished = new AtomicBoolean();

  public SafePromise(Promise promise) {
    this.promise = promise;
  }

  public void resolve(@Nullable Object value) {
    if (isFinished.compareAndSet(false, true)) {
      promise.resolve(value);
    }
  }

  public void reject(String code, String message) {
    if (isFinished.compareAndSet(false, true)) {
      promise.reject(code, message);
    }
  }

  public void reject(String code, Throwable e) {
    if (isFinished.compareAndSet(false, true)) {
      promise.reject(code, e);
    }
  }

  public void reject(String code, String message, Throwable e) {
    if (isFinished.compareAndSet(false, true)) {
      promise.reject(code, message, e);
    }
  }

  @Deprecated
  public void reject(String message) {
    if (isFinished.compareAndSet(false, true)) {
      promise.reject(message);
    }
  }

  public void reject(Throwable reason) {
    if (isFinished.compareAndSet(false, true)) {
      promise.reject(reason);
    }
  }
}
