// @flow

export type devices = {
  [uuid: string]: device
}

export type device = {
  uuid: string,
  name: string,
  rssi: number,
  isConnectable: boolean,
  services: services
}

export type services = {
  [uuid: string]: service
}

export type characteristics = {
  [uuid: string]: characteristic
}

export type service = {
  characteristics: characteristics
}

export type characteristic = {
  base64Value: string
}
