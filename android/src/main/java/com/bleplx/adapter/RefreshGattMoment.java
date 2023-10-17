package com.bleplx.adapter;


public enum RefreshGattMoment {

  ON_CONNECTED("OnConnected");

  final String name;

  RefreshGattMoment(String name) {
    this.name = name;
  }

  public static RefreshGattMoment getByName(String name) {
    for (RefreshGattMoment refreshGattMoment : RefreshGattMoment.values()) {
      if (refreshGattMoment.name.equals(name)) return refreshGattMoment;
    }
    return null;
  }
}
