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

  // Safe reject: ensures code is never null
  public void reject(@Nullable String code, @Nullable String message) {
    if (isFinished.compareAndSet(false, true)) {
      String safeCode = code != null ? code : "UNKNOWN_ERROR";
      String safeMessage = message != null ? message : "No message provided";
      promise.reject(safeCode, safeMessage);
    }
  }

  public void reject(@Nullable String code, Throwable e) {
    if (isFinished.compareAndSet(false, true)) {
      String safeCode = code != null ? code : "UNKNOWN_ERROR";
      promise.reject(safeCode, e);
    }
  }

  public void reject(@Nullable String code, @Nullable String message, Throwable e) {
    if (isFinished.compareAndSet(false, true)) {
      String safeCode = code != null ? code : "UNKNOWN_ERROR";
      String safeMessage = message != null ? message : "No message provided";
      promise.reject(safeCode, safeMessage, e);
    }
  }

  @Deprecated
  public void reject(@Nullable String message) {
    if (isFinished.compareAndSet(false, true)) {
      String safeMessage = message != null ? message : "No message provided";
      promise.reject(safeMessage);
    }
  }

  public void reject(Throwable reason) {
    if (isFinished.compareAndSet(false, true)) {
      promise.reject(reason);
    }
  }
}
