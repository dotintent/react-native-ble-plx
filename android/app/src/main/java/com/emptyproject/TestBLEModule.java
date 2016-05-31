package com.emptyproject;

import android.os.Handler;
import android.support.annotation.Nullable;
import android.util.Log;
import android.widget.Toast;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import java.util.HashMap;
import java.util.Map;

/**
 * Created by Konrad on 23/05/16.
 */
public class TestBLEModule extends ReactContextBaseJavaModule {

    private static final String DURATION_SHORT_KEY = "SHORT";
    private static final String DURATION_LONG_KEY = "LONG";

    public TestBLEModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "TestBLEModule";
    }
    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put(DURATION_SHORT_KEY, Toast.LENGTH_SHORT);
        constants.put(DURATION_LONG_KEY, Toast.LENGTH_LONG);
        return constants;
    }


    @ReactMethod
    public void show(String message, int duration) {
        Toast.makeText(getReactApplicationContext(), message, duration).show();
    }

    @ReactMethod
    public void showV2(String message, int duration) {
        Toast.makeText(getReactApplicationContext(), message, duration).show();
    }


    @ReactMethod
    public void LogE(String message, Callback successCallback) {
        Log.e("TEST", message);
        successCallback.invoke("wygolono");
    }

    @ReactMethod
    public void justLogE(String message) {
        Log.e("React", message);
    }



    @ReactMethod
    public void ping(String msg, Callback callback) {
        callback.invoke(msg);
    }

    @ReactMethod
    public void pingPromise(String msg, Promise promise) {
//        promise.resolve(msg);

        promise.reject("RejectCode", "rejected");
    }


    @ReactMethod
    public void pingEvent(String msg) {
        new Handler().postDelayed(new Runnable() {
            @Override
            public void run() {

                WritableMap params = Arguments.createMap();
                params.putString("CONNECTION_STATE", "connected");
                params.putString("MAC_ADDRESS", "00:FF:34:b6:23");
                sendEvent(getReactApplicationContext(), "BLE_EVENT", params);
            }
        },5000);
    }

    private void sendEvent(ReactContext reactContext, String eventName, @Nullable WritableMap params) {
        reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }
}
