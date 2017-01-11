//
//  BleEvent.swift
//  EmptyProject
//
//  Created by Przemysław Lenart on 25/07/16.
//

import Foundation

@objc
open class BleEvent: NSObject {
    static open let scanEvent: String = "ScanEvent"
    static open let readEvent = "ReadEvent"
    static open let stateChangeEvent = "StateChangeEvent"
    static open let disconnectionEvent = "DisconnectionEvent"

    static open let events = [
        scanEvent,
        readEvent,
        stateChangeEvent,
        disconnectionEvent
    ]
}
