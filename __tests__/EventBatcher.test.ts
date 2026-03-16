import { EventBatcher } from '../src/EventBatcher'

test('immediate mode delivers events without delay', () => {
  const received: number[] = []
  const batcher = new EventBatcher<number>(0, 50, batch => {
    received.push(...batch)
  })
  batcher.push(1)
  batcher.push(2)
  expect(received).toEqual([1, 2])
  batcher.dispose()
})

test('batched mode collects events and delivers on interval', done => {
  const received: number[][] = []
  const batcher = new EventBatcher<number>(50, 50, batch => {
    received.push([...batch])
    if (received.length === 1) {
      expect(received[0]!).toEqual([1, 2, 3])
      batcher.dispose()
      done()
    }
  })
  batcher.push(1)
  batcher.push(2)
  batcher.push(3)
  // Events should not be delivered yet
  expect(received).toEqual([])
})

test('max batch size caps delivery', done => {
  const received: number[][] = []
  const batcher = new EventBatcher<number>(50, 3, batch => {
    received.push([...batch])
    if (received.length === 1) {
      expect(received[0]!.length).toBeLessThanOrEqual(3)
      batcher.dispose()
      done()
    }
  })
  for (let i = 0; i < 10; i += 1) batcher.push(i)
})

test('dispose discards buffered events instead of flushing', () => {
  const received: number[] = []
  const batcher = new EventBatcher<number>(5000, 50, batch => {
    received.push(...batch)
  })
  batcher.push(1)
  batcher.push(2)
  batcher.push(3)

  // Events are buffered (interval is 5000ms)
  expect(received).toEqual([])

  // Dispose should discard, not flush
  batcher.dispose()
  expect(received).toEqual([])
})

test('push after dispose is ignored', () => {
  const received: number[] = []
  const batcher = new EventBatcher<number>(0, 50, batch => {
    received.push(...batch)
  })
  batcher.dispose()
  batcher.push(1)
  expect(received).toEqual([])
})
