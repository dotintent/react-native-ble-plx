// @flow
'use strict'

import { BleModule } from './BleModule'
import { createCallback } from './Utils'
import type { CancelOptions } from './Promise'
import type { ManagerId } from './TypeDefinition'

export type BufferId = number

// eslint-disable-next-line no-unused-vars
export type Buffer<T> = {
  id: BufferId,
  centralId: ManagerId
}

export type BufferActionOptions = {
  strategy: 'take' | 'peek',
  placement: 'latest' | 'oldest',
  chunkSize: ?number
}

export function takeLatest<T>(buffer: Buffer<T>, cancelOptions: CancelOptions = {}): Promise<T> {
  return actionOnBuffer(
    buffer,
    {
      strategy: 'take',
      placement: 'latest',
      chunkSize: 1
    },
    cancelOptions
  ).then(value => value[0])
}

export function takeLatestChunk<T>(buffer: Buffer<T>, size: number, cancelOptions: CancelOptions = {}): Promise<[T]> {
  return actionOnBuffer(
    buffer,
    {
      strategy: 'take',
      placement: 'latest',
      chunkSize: size
    },
    cancelOptions
  )
}

export function takeOldest<T>(buffer: Buffer<T>, cancelOptions: CancelOptions = {}): Promise<T> {
  return actionOnBuffer(
    buffer,
    {
      strategy: 'take',
      placement: 'oldest',
      chunkSize: 1
    },
    cancelOptions
  ).then(value => value[0])
}

export function takeOldestChunk<T>(buffer: Buffer<T>, size: number, cancelOptions: CancelOptions = {}): Promise<[T]> {
  return actionOnBuffer(
    buffer,
    {
      strategy: 'take',
      placement: 'oldest',
      chunkSize: size
    },
    cancelOptions
  )
}

export function takeAll<T>(buffer: Buffer<T>, cancelOptions: CancelOptions = {}): Promise<[T]> {
  return actionOnBuffer(
    buffer,
    {
      strategy: 'take',
      placement: 'latest',
      chunkSize: null
    },
    cancelOptions
  )
}

export function peekLatest<T>(buffer: Buffer<T>, cancelOptions: CancelOptions = {}): Promise<T> {
  return actionOnBuffer(
    buffer,
    {
      strategy: 'peek',
      placement: 'latest',
      chunkSize: 1
    },
    cancelOptions
  ).then(value => value[0])
}

export function peekLatestChunk<T>(buffer: Buffer<T>, size: number, cancelOptions: CancelOptions = {}): Promise<[T]> {
  return actionOnBuffer(
    buffer,
    {
      strategy: 'peek',
      placement: 'latest',
      chunkSize: size
    },
    cancelOptions
  )
}

export function peekOldest<T>(buffer: Buffer<T>, cancelOptions: CancelOptions = {}): Promise<T> {
  return actionOnBuffer(
    buffer,
    {
      strategy: 'peek',
      placement: 'oldest',
      chunkSize: 1
    },
    cancelOptions
  ).then(value => value[0])
}

export function peekOldestChunk<T>(buffer: Buffer<T>, size: number, cancelOptions: CancelOptions = {}): Promise<[T]> {
  return actionOnBuffer(
    buffer,
    {
      strategy: 'peek',
      placement: 'oldest',
      chunkSize: size
    },
    cancelOptions
  )
}

export function peekAll<T>(buffer: Buffer<T>, cancelOptions: CancelOptions = {}): Promise<[T]> {
  return actionOnBuffer(
    buffer,
    {
      strategy: 'peek',
      placement: 'latest',
      chunkSize: null
    },
    cancelOptions
  )
}

// CHANGE:- no api
// export function flushAll<T>(buffer: Buffer<T>, options: ?CancelOptions): Promise<[T]> {}

export function destroy<T>(buffer: Buffer<T>): Promise<void> {
  return new Promise((resolve, reject) => {
    BleModule.stopBuffer(buffer.centralId, buffer.id, createCallback(resolve, reject))
  })
}

function actionOnBuffer<T>(
  buffer: Buffer<T>,
  options: BufferActionOptions,
  cancelOptions: CancelOptions
): Promise<[T]> {
  return new Promise((resolve, reject) => {
    BleModule.actionOnBuffer(buffer.centralId, buffer.id, options, cancelOptions, createCallback(resolve, reject))
  })
}
