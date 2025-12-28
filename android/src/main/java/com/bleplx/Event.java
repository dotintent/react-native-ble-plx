package com.bleplx;

public enum Event {

  ScanEvent("ScanEvent"),
  ReadEvent("ReadEvent"),
  StateChangeEvent("StateChangeEvent"),
  RestoreStateEvent("RestoreStateEvent"),
  DisconnectionEvent("DisconnectionEvent");

  public final String name;

  Event(String name) {
    this.name = name;
  }
}
