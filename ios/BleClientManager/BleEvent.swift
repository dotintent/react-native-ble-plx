//
//  BleEvent.swift
//  EmptyProject
//
//  Created by Przemysław Lenart on 25/07/16.
//

import Foundation

enum BleEvent: String {
  case scan = "ScanEvent"

  /// Used to export event id as event name global variable
  var name: String {
    return rawValue
  }

  /// Unique identifier for an event
  var id: String {
    return "BleClientManager" + rawValue
  }

  /// List of all supported events by this module
  static let supportedEvents = [scan]
}