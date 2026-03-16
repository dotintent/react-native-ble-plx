export class EventBatcher<T> {
  private buffer: T[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private disposed = false

  constructor(
    private intervalMs: number,
    private maxBatchSize: number,
    private onBatch: (events: T[]) => void
  ) {
    if (intervalMs > 0) {
      this.timer = setInterval(() => this.flush(), intervalMs)
    }
  }

  push(event: T): void {
    if (this.disposed) return
    if (this.intervalMs === 0) {
      this.onBatch([event])
      return
    }
    this.buffer.push(event)
    if (this.buffer.length >= this.maxBatchSize) {
      this.flush()
    }
  }

  flush(): void {
    if (this.buffer.length === 0) return
    const batch = this.buffer.splice(0, this.maxBatchSize)
    this.onBatch(batch)
  }

  dispose(): void {
    this.disposed = true
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.buffer.length = 0
  }
}
