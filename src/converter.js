export const glucometerInfoReading = (res) => {
    const version = new Uint8Array(res.slice(3, 4))[0];
    const clientCode = new Uint8Array(res.slice(4, 5))[0];
    let clientCodeName = 'unknown';
    switch (clientCode) {
        case 0:
            clientCodeName = 'apple';
            break;
        case 1:
            clientCodeName = 'bioland';
            break;
        case 2:
        case 3:
            clientCodeName = 'haier';
            break;
        case 4:
            clientCodeName = 'xiaomi';
            break;
        case 5:
            clientCodeName = 'gallery';
            break;
        case 6:
            clientCodeName = 'kanwei';
            break;
    }

    const batteryLevel = new Uint8Array(res.slice(5, 6))[0];
    const modelCode = new Uint8Array(res.slice(6, 7))[0];
    const codeType = new Uint8Array(res.slice(7, 8))[0];
    const serialNumber = [
        new Uint8Array(res.slice(8, 9))[0],
        new Uint8Array(res.slice(9, 10))[0],
        new Uint8Array(res.slice(10, 11))[0],
        new Uint8Array(res.slice(11, 12))[0],
        new Uint8Array(res.slice(12, 13))[0],
        new Uint8Array(res.slice(13, 14))[0],
        new Uint8Array(res.slice(14, 15))[0],
        new Uint8Array(res.slice(15, 16))[0],
        new Uint8Array(res.slice(16, 17))[0],
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

export const glucometerCountdown = (res) => {
    try {
        return new Uint8Array(res.slice(4, 5))[0];
    } catch {
        return 0
    }
}

export const glucometerFinalMeasurement = (res) => {
    try {

        const readingTime = {
            year: new Uint8Array(res.slice(3, 4))[0],
            month: new Uint8Array(res.slice(4, 5))[0],
            day: new Uint8Array(res.slice(5, 6))[0],
            hour: new Uint8Array(res.slice(6, 7))[0],
            minutes: new Uint8Array(res.slice(7, 8))[0]
        };

        const retain = new Uint8Array(res.slice(8, 9))[0];
        const glucoseLowByte = new Uint8Array(res.slice(9, 10))[0];
        const glucoseHighByte = new Uint8Array(res.slice(10, 11))[0] + 1;
        const glucoseReadingmgdl = Math.pow(glucoseLowByte, glucoseHighByte);
        const glucoseReadingmmol = Math.round(glucoseReadingmgdl / 18);

        return {
            retain,
            year: eadingTime.year,
            month: readingTime.month,
            day: readingTime.day,
            hour: readingTime.hour,
            minutes: readingTime.minutes,
            glucose: glucoseReadingmgdl
        }

    } catch {

    }
}