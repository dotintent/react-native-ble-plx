package com.bleplx.adapter;

import android.content.Context;

public class BleAdapterFactory {

  private static BleAdapterCreator bleAdapterCreator = new BleAdapterCreator() {
    @Override
    public BleAdapter createAdapter(Context context) {
      return new BleModule(context);
    }
  };

  public static BleAdapter getNewAdapter(Context context) {
    return bleAdapterCreator.createAdapter(context);
  }

  public static void setBleAdapterCreator(BleAdapterCreator bleAdapterCreator) {
    BleAdapterFactory.bleAdapterCreator = bleAdapterCreator;
  }
}
