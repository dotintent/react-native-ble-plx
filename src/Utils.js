// @flow
'use strict'

import type { UUID } from './TypeDefinition'
import moment from 'moment'

/**
 * Converts UUID to full 128bit, lowercase format which should be used to compare UUID values.
 *
 * @param {UUID} uuid 16bit, 32bit or 128bit UUID.
 * @returns {UUID} 128bit lowercase UUID.
 */
export function fullUUID(uuid: UUID): UUID {
    if (uuid.length === 4) return '0000' + uuid.toLowerCase() + '-0000-1000-8000-00805f9b34fb'
    if (uuid.length === 8) return uuid.toLowerCase() + '-0000-1000-8000-00805f9b34fb'
    return uuid.toLowerCase()
}

export function fillStringWithArguments(value: string, object: Object) {
    return value.replace(/\{([^}]+)\}/g, function(_, arg: string) {
        return object[arg] || '?'
    })
}

export const glucometerInfoReading = (
    res: number[]
): {
    batteryLevel: number,
    serialNumber: string,
    version: string,
    clientCodeName: string,
    modelCode: string,
    codeType: string
} => {
    const version = new Uint8Array(res.slice(3, 4))[0]
    const clientCode = new Uint8Array(res.slice(4, 5))[0]
    let clientCodeName = 'unknown'
    switch (clientCode) {
        case 0:
            clientCodeName = 'apple'
            break
        case 1:
            clientCodeName = 'bioland'
            break
        case 2:
        case 3:
            clientCodeName = 'haier'
            break
        case 4:
            clientCodeName = 'xiaomi'
            break
        case 5:
            clientCodeName = 'gallery'
            break
        case 6:
            clientCodeName = 'kanwei'
            break
    }

    const batteryLevel = new Uint8Array(res.slice(5, 6))[0]
    const modelCode = new Uint8Array(res.slice(6, 7))[0]
    const codeType = new Uint8Array(res.slice(7, 8))[0]
    const serialNumber = [
        new Uint8Array(res.slice(8, 9))[0],
        new Uint8Array(res.slice(9, 10))[0],
        new Uint8Array(res.slice(10, 11))[0],
        new Uint8Array(res.slice(11, 12))[0],
        new Uint8Array(res.slice(12, 13))[0],
        new Uint8Array(res.slice(13, 14))[0],
        new Uint8Array(res.slice(14, 15))[0],
        new Uint8Array(res.slice(15, 16))[0],
        new Uint8Array(res.slice(16, 17))[0]
    ]

    return {
        batteryLevel,
        serialNumber: serialNumber.join(''),
        version,
        clientCodeName,
        modelCode,
        codeType
    }
}

export const glucometerCountdown = (res: number[]): number => {
    try {
        return new Uint8Array(res.slice(4, 5))[0]
    } catch {
        return 0
    }
}

export const glucometerFinalMeasurement = (res: number[]): { date: string, fastingGlucose: number } => {
    try {
        const readingTime = {
            year: new Uint8Array(res.slice(3, 4))[0],
            month: new Uint8Array(res.slice(4, 5))[0],
            day: new Uint8Array(res.slice(5, 6))[0],
            hour: new Uint8Array(res.slice(6, 7))[0],
            minutes: new Uint8Array(res.slice(7, 8))[0]
        }

        const retain = new Uint8Array(res.slice(8, 9))[0]
        const glucoseLowByte = new Uint8Array(res.slice(9, 10))[0]
        const glucoseHighByte = new Uint8Array(res.slice(10, 11))[0]
        const glucoseReadingmgdl = Math.round(glucoseLowByte + 256 * glucoseHighByte)
        const glucoseReadingmmol = Math.round(glucoseReadingmgdl / 18)

        const yearFormatted = '20' + String(readingTime.year)
        const monthFormatted = readingTime.month < 10 ? '0' + String(readingTime.month) : String(readingTime.month)
        const dayFormatted = readingTime.day < 10 ? '0' + String(readingTime.day) : String(readingTime.day)
        const hourFormatted = readingTime.hour < 10 ? '0' + String(readingTime.hour) : String(readingTime.hour)
        const minuteFormatted = readingTime.minutes < 10 ? '0' + String(readingTime.minutes) : String(readingTime.minutes)

        const date = moment(
            `${yearFormatted}-${monthFormatted}-${dayFormatted} ${hourFormatted}:${minuteFormatted}`
        ).toDate()

        return {
            date,
            fastingGlucose: glucoseReadingmgdl
        }
    } catch {}
}