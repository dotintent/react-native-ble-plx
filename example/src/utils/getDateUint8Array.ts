export const getDateUint8Array = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
) => {
  const yearFirstByte = year >> 8
  const yearSecondByte = year - Math.pow(2, 16)

  return new Uint8Array([yearFirstByte, yearSecondByte, month, day, hour, minute, second])
}
