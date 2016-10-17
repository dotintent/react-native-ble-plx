// @flow
"use strict"

export function fullUUID(uuid: string): string {
    if (uuid.length === 4) return "0000" + uuid.toLowerCase() + "-0000-1000-8000-00805f9b34fb"
    return uuid.toLowerCase()
}