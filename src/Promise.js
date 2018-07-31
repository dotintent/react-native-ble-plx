// @flow
'use strict'

import { BleModule } from './BleModule'
import type { Manager } from './TypeDefinition'

export type PromiseId = string

export type CancelOptions = {
  promiseId?: PromiseId,
  timeout?: number,
  ignoreCancelled?: boolean
}

export function cancel(manager: Manager, promiseId: PromiseId): void {
  BleModule.cancelPromise(manager.id, promiseId)
}