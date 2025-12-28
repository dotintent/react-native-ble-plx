package com.bleplx.converter;

import com.bleplx.adapter.errors.BleError;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;

import org.json.JSONException;
import org.json.JSONObject;

import android.util.Log;

/**
 * Converts BleError objects to JSON strings for React Native bridge.
 */
public class BleErrorToJsObjectConverter {

  private static final String TAG = "BlePlx";

  public ReadableArray toJSCallback(BleError error) {
    WritableArray array = Arguments.createArray();
    array.pushString(toJs(error));
    array.pushNull();
    return array;
  }

  /**
   * Converts a BleError to a JSON string.
   * Uses JSONObject to properly escape special characters and prevent JSON injection.
   */
  public String toJs(BleError error) {
    try {
      JSONObject json = new JSONObject();

      json.put("errorCode", error.errorCode.code);

      // ATT error code: valid range is 0x00 to 0x7F
      if (error.androidCode == null || error.androidCode >= 0x80 || error.androidCode < 0) {
        json.put("attErrorCode", JSONObject.NULL);
      } else {
        json.put("attErrorCode", error.androidCode.intValue());
      }

      // iOS error code is always null on Android
      json.put("iosErrorCode", JSONObject.NULL);

      // Android-specific error code: 0x80 and above
      if (error.androidCode == null || error.androidCode < 0x80) {
        json.put("androidErrorCode", JSONObject.NULL);
      } else {
        json.put("androidErrorCode", error.androidCode.intValue());
      }

      // String fields - JSONObject.put handles null and escaping automatically
      json.put("reason", error.reason != null ? error.reason : JSONObject.NULL);
      json.put("deviceID", error.deviceID != null ? error.deviceID : JSONObject.NULL);
      json.put("serviceUUID", error.serviceUUID != null ? error.serviceUUID : JSONObject.NULL);
      json.put("characteristicUUID", error.characteristicUUID != null ? error.characteristicUUID : JSONObject.NULL);
      json.put("descriptorUUID", error.descriptorUUID != null ? error.descriptorUUID : JSONObject.NULL);
      json.put("internalMessage", error.internalMessage != null ? error.internalMessage : JSONObject.NULL);

      return json.toString();
    } catch (JSONException e) {
      Log.e(TAG, "Failed to convert BleError to JSON", e);
      // Fallback to a safe minimal error response
      return "{\"errorCode\":" + error.errorCode.code + ",\"reason\":\"Error conversion failed\"}";
    }
  }
}
