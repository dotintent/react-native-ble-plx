package com.bleplx.adapter;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class Device {

  private String id;
  private String name;
  @Nullable
  private Integer rssi;
  @Nullable
  private Integer mtu;
  @Nullable
  private List<Service> services;

  public Device(String id, String name) {
    this.id = id;
    this.name = name;
  }

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  @Nullable
  public Integer getRssi() {
    return rssi;
  }

  public void setRssi(@Nullable Integer rssi) {
    this.rssi = rssi;
  }

  @Nullable
  public Integer getMtu() {
    return mtu;
  }

  public void setMtu(@Nullable Integer mtu) {
    this.mtu = mtu;
  }

  @Nullable
  public List<Service> getServices() {
    return services;
  }

  @Nullable
  public List<UUID> getServicesUUIDs() {
    if (services == null) {
      return null;
    }

    List<UUID> servicesUUIDs = new ArrayList<>();
    for (Service service : services) {
      servicesUUIDs.add(service.getUuid());
    }

    return servicesUUIDs;
  }

  public void setServices(@Nullable List<Service> services) {
    this.services = services;
  }

  @Nullable
  public Service getServiceByUUID(@NonNull UUID uuid) {
    if (services == null) {
      return null;
    }

    for (Service service : services) {
      if (uuid.equals(service.getUuid()))
        return service;
    }
    return null;
  }
}
