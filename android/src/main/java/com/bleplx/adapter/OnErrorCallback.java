package com.bleplx.adapter;

import com.bleplx.adapter.errors.BleError;

public interface OnErrorCallback {

  void onError(BleError error);
}
