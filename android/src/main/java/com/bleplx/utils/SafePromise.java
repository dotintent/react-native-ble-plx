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

  public void reject(@Nullable String code, @Nullable String message) {
    if (isFinished.compareAndSet(false, true)) {
      String safeCode = code == null ? ErrorDefaults.CODE : code;
      String safeMessage = message == null ? ErrorDefaults.MESSAGE : message;
      promise.reject(safeCode, safeMessage);
    }
  }

  public void reject(@Nullable String code, Throwable e) {
    if (isFinished.compareAndSet(false, true)) {
      String safeCode = code == null ? ErrorDefaults.CODE : code;
      promise.reject(safeCode, e);
    }
  }

  public void reject(@Nullable String code, @Nullable String message, Throwable e) {
    if (isFinished.compareAndSet(false, true)) {
      String safeCode = code == null ? ErrorDefaults.CODE : code;
      String safeMessage = message == null ? ErrorDefaults.MESSAGE : message;
      promise.reject(safeCode, safeMessage, e);
    }
  }

  @Deprecated
  public void reject(@Nullable String message) {
    if (isFinished.compareAndSet(false, true)) {
      String safeMessage = message == null ? ErrorDefaults.MESSAGE : message;
      promise.reject(ErrorDefaults.CODE, safeMessage);
    }
  }

  public void reject(Throwable reason) {
    if (isFinished.compareAndSet(false, true)) {
      promise.reject(reason);
    }
  }
}
