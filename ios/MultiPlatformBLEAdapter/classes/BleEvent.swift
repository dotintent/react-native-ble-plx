//
//  BleEvent.swift
//
//  Created by Przemysław Lenart on 25/07/16.
//

import Foundation

@objc
public class BleEvent: NSObject {

    @objc
    static public let scanEvent = "ScanEvent"

    @objc
    static public let readEvent = "ReadEvent"

    @objc
    static public let stateChangeEvent = "StateChangeEvent"

    @objc
    static public let restoreStateEvent = "RestoreStateEvent"

    @objc
    static public let disconnectionEvent = "DisconnectionEvent"

    @objc
    static public let events = [
        scanEvent,
        readEvent,
        stateChangeEvent,
        restoreStateEvent,
        disconnectionEvent
    ]
}
