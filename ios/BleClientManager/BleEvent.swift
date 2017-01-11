//
//  BleEvent.swift
//  EmptyProject
//
//  Created by Przemysław Lenart on 25/07/16.
//

import Foundation

@objc
public class BleEvent: NSObject {
    static public let scanEvent = "ScanEvent"
    static public let readEvent = "ReadEvent"
    static public let stateChangeEvent = "StateChangeEvent"
    static public let disconnectionEvent = "DisconnectionEvent"

    static public let events = [
        scanEvent,
        readEvent,
        stateChangeEvent,
        disconnectionEvent
    ]
}
