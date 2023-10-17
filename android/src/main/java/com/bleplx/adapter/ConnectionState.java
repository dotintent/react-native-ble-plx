package com.bleplx.adapter;

public enum ConnectionState {

  CONNECTING("connecting"), CONNECTED("connected"), DISCONNECTING("disconnecting"), DISCONNECTED("disconnected");

  public final String value;

  ConnectionState(String value) {
    this.value = value;
  }
}
