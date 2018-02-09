const EventEmitter = require('events')
import { fullUUID, fillStringWithArguments } from '../src/Utils'

export class NativeEventEmitter extends EventEmitter {
  constructor(module) {
    super()
    module.emit = this.emit.bind(this)
  }
  emit() {
    return super.emit.apply(this, arguments)
  }
  addListener(eventName, listener) {
    super.addListener(eventName, listener)
    return {
      remove: () => {
        super.removeListener(eventName, listener)
      }
    }
  }
}

test('Mocked NativeEventEmitter allows to emit events directly by module', () => {
  const module = {
    emit: jest.fn()
  }
  const emitter = new NativeEventEmitter(module)

  const listener = jest.fn()
  const listener2 = jest.fn()

  emitter.addListener('event', listener)
  emitter.addListener('event2', listener2)

  module.emit('event', 'a')
  module.emit('event2', 'b')
  module.emit('event2', 'c')

  expect(listener.mock.calls).toEqual([['a']])
  expect(listener2.mock.calls).toEqual([['b'], ['c']])
})

test('Mocked NativeEventEmitter allows to unsubscribe from events', () => {
  const module = {
    emit: jest.fn()
  }
  const emitter = new NativeEventEmitter(module)
  const listener = jest.fn()

  module.emit('event', 'a')
  const subscription = emitter.addListener('event', listener)
  module.emit('event', 'b')
  subscription.remove()
  module.emit('event', 'c')
  expect(listener.mock.calls).toEqual([['b']])
})

test('fullUUID properly transforms 16bit UUID', () => {
  expect(fullUUID('180A')).toBe('0000180a-0000-1000-8000-00805f9b34fb')
})

test('fullUUID properly transforms 32bit UUID', () => {
  expect(fullUUID('180AffFF')).toBe('180affff-0000-1000-8000-00805f9b34fb')
})

test('fullUUID properly transforms 128bit UUID', () => {
  expect(fullUUID('0000180A-0000-1000-8000-00805f9B34Fb')).toBe('0000180a-0000-1000-8000-00805f9b34fb')
})

test('string replacment based on object', () => {
  expect(fillStringWithArguments('hello', {})).toBe('hello')
  expect(fillStringWithArguments('My {id} is {a} or {b}', { a: 'OK', id: 'X' })).toBe('My X is OK or ?')
})
