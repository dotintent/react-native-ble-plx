package com.polidea.reactnativeble.utils;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;

import java.util.concurrent.atomic.AtomicBoolean;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;

public class SafePromise implements Promise {
    private Promise promise;
    private AtomicBoolean isFinished = new AtomicBoolean();

    public SafePromise(Promise promise) {
        this.promise = promise;
    }

    @Override
    public void resolve(@Nullable Object value) {
        if (isFinished.compareAndSet(false, true)) {
            promise.resolve(value);
        }
    }

    @Override
    public void reject(String code, String message) {
        if (isFinished.compareAndSet(false, true)) {
            promise.reject(code, message);
        }
    }

    @Override
    public void reject(String code, Throwable e) {
        if (isFinished.compareAndSet(false, true)) {
            promise.reject(code, e);
        }
    }

    @Override
    public void reject(String code, String message, Throwable e) {
        if (isFinished.compareAndSet(false, true)) {
            promise.reject(code, message, e);
        }
    }

    @Override
    public void reject(Throwable e, WritableMap userInfo) {
        if (isFinished.compareAndSet(false, true)) {
            promise.reject(e, userInfo);
        }
    }

    @Override
    public void reject(String code, @Nonnull WritableMap userInfo) {
        if (isFinished.compareAndSet(false, true)) {
            promise.reject(code, userInfo);
        }
    }

    @Override
    public void reject(String code, Throwable e, WritableMap userInfo) {
        if (isFinished.compareAndSet(false, true)) {
            promise.reject(code, e, userInfo);
        }
    }

    @Override
    public void reject(String code, String message, @Nonnull WritableMap userInfo) {
        if (isFinished.compareAndSet(false, true)) {
            promise.reject(code, message, userInfo);
        }
    }

    @Override
    public void reject(String code, String message, Throwable e, WritableMap userInfo) {
        if (isFinished.compareAndSet(false, true)) {
            promise.reject(code, message, e, userInfo);
        }
    }

    @Deprecated
    @Override
    public void reject(String message) {
        if (isFinished.compareAndSet(false, true)) {
            promise.reject(message);
        }
    }

    @Override
    public void reject(Throwable reason) {
        if (isFinished.compareAndSet(false, true)) {
            promise.reject(reason);
        }
    }
}
