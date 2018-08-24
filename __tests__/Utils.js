import { fullUUID, fillStringWithArguments } from '../src/Utils'

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
