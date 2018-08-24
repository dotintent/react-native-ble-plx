import {
  takeLatest,
  takeLatestChunk,
  takeOldest,
  takeOldestChunk,
  takeAll,
  peekLatest,
  peekLatestChunk,
  peekOldest,
  peekOldestChunk,
  peekAll,
  destroy
} from '../src/Buffer'
import * as Native from '../src/BleModule'

beforeEach(() => {
  Native.BleModule = {
    actionOnBuffer: jest.fn(),
    stopBuffer: jest.fn()
  }
})

describe('takeLatest', () => {
  test('call actionOnBuffer with correct arguments', () => {
    testActionOnBuffer({ strategy: 'take', placement: 'latest', chunkSize: 1 }, takeLatest)
  })
})

describe('takeLatestChunk', () => {
  test('call actionOnBuffer with correct arguments', () => {
    testActionOnBuffer({ strategy: 'take', placement: 'latest', chunkSize: 10 }, takeLatestChunk, 10)
  })
})

describe('takeOldest', () => {
  test('call actionOnBuffer with correct arguments', () => {
    testActionOnBuffer({ strategy: 'take', placement: 'oldest', chunkSize: 1 }, takeOldest)
  })
})

describe('takeOldestChunk', () => {
  test('call actionOnBuffer with correct arguments', () => {
    testActionOnBuffer({ strategy: 'take', placement: 'oldest', chunkSize: 10 }, takeOldestChunk, 10)
  })
})

describe('takeAll', () => {
  test('call actionOnBuffer with correct arguments', () => {
    testActionOnBuffer({ strategy: 'take', placement: 'latest', chunkSize: null }, takeAll)
  })
})

describe('peekLatest', () => {
  test('call actionOnBuffer with correct arguments', () => {
    testActionOnBuffer({ strategy: 'peek', placement: 'latest', chunkSize: 1 }, peekLatest)
  })
})

describe('peekLatestChunk', () => {
  test('call actionOnBuffer with correct arguments', () => {
    testActionOnBuffer({ strategy: 'peek', placement: 'latest', chunkSize: 10 }, peekLatestChunk, 10)
  })
})

describe('peekOldest', () => {
  test('call actionOnBuffer with correct arguments', () => {
    testActionOnBuffer({ strategy: 'peek', placement: 'oldest', chunkSize: 1 }, peekOldest)
  })
})

describe('peekOldestChunk', () => {
  test('call actionOnBuffer with correct arguments', () => {
    testActionOnBuffer({ strategy: 'peek', placement: 'oldest', chunkSize: 10 }, peekOldestChunk, 10)
  })
})

describe('peekAll', () => {
  test('call actionOnBuffer with correct arguments', () => {
    testActionOnBuffer({ strategy: 'peek', placement: 'latest', chunkSize: null }, peekAll)
  })
})

describe('destroy', () => {
  test('call stopBuffer with correct arguments', () => {
    const buffer = { id: 1, centralId: 2 }
  
    const expected = {
      centralId: 2,
      bufferId: 1
    }
  
    destroy(buffer)
  
    expect(Native.BleModule.stopBuffer).toBeCalledWith(
      expected.centralId,
      expected.bufferId,
      expect.anything()
    )
  })
})

// utils

function testActionOnBuffer(options, call, size) {
  const args = {
    buffer: { id: 1, centralId: 2 },
    cancelOptions: { promiseId: 1, timeout: 100, ignoreCancelled: true }
  }

  const expected = {
    centralId: 2,
    bufferId: 1,
    options,
    cancelOptions: { ...args.cancelOptions }
  }

  call(args.buffer, size ? size : args.cancelOptions, args.cancelOptions)

  expect(Native.BleModule.actionOnBuffer).toBeCalledWith(
    expected.centralId,
    expected.bufferId,
    expected.options,
    expected.cancelOptions,
    expect.anything()
  )
}
