import { ITimelineEvent, StreamName } from "@equinox-js/core"
import { traceHandler, EventHandler } from "./Tracing.js"
import { Attributes, trace } from "@opentelemetry/api"
import { IngesterBatch, Sink } from "./Types.js"
import { AsyncQueue } from "./Queue.js"

const tracer = trace.getTracer("@equinox-js/propeller")

class Stream {
  events: ITimelineEvent[] = []
  constructor(public name: StreamName) {}

  merge(event: ITimelineEvent): void {
    const last = this.events[this.events.length - 1]
    if (!last || last.index === event.index - 1n) {
      this.events.push(event)
      return
    }
    if (last.index > event.index) return
    if (event.index > last.index) throw new Error("Unexpected gap")
  }
}

export class StreamsSink implements Sink {
  private queue = new AsyncQueue<Stream>()
  private streams = new Map<StreamName, Stream>()
  private batchStreams = new Map<IngesterBatch, Set<Stream>>()
  private onReady?: () => void
  private inProgressBatches = 0
  constructor(
    private readonly handle: EventHandler<string>,
    private maxConcurrentStreams: number,
    private maxConcurrentBatches: number,
    private readonly tracingAttrs: Attributes = {},
  ) {
    this.addTracingAttrs({ "eqx.max_concurrent_streams": maxConcurrentStreams })
  }

  addTracingAttrs(attrs: Attributes) {
    Object.assign(this.tracingAttrs, attrs)
  }

  start(signal: AbortSignal) {
    // set up a linked abort controller to avoid attaching too many event listeners to the provided signal
    // node has a default limit of 11 before it emits a warning to the console. We have entirely legitimate reasons
    // for attaching more than 11 listeners
    const ctrl = new AbortController()
    signal.addEventListener("abort", () => ctrl.abort())
    const _signal = ctrl.signal
    // Starts N workers that will process streams in parallel
    return new Promise<void>((_resolve, reject) => {
      let stopped = false
      const aux = async (): Promise<void> => {
        if (_signal.aborted || stopped) return
        try {
          const stream = await this.queue.tryGetAsync(_signal)
          this.streams.delete(stream.name)
          await traceHandler(tracer, this.tracingAttrs, stream.name, stream.events, this.handle)
          for (const [batch, streams] of this.batchStreams) {
            streams.delete(stream)
            if (streams.size === 0) {
              batch.onComplete()
              this.batchStreams.delete(batch)
              this.inProgressBatches--
              this.onReady?.()
              delete this.onReady
            }
          }
          void aux()
        } catch (err) {
          stopped = true
          reject(err)
        }
      }

      for (let i = 0; i < this.maxConcurrentStreams; ++i) aux()
    })
  }

  private waitForCapacity(signal: AbortSignal) {
    if (this.inProgressBatches < this.maxConcurrentBatches) return
    return new Promise<void>((resolve, reject) => {
      const abort = () => reject(new Error("Aborted"))
      signal.addEventListener("abort", abort)
      this.onReady = () => {
        signal.removeEventListener("abort", abort)
        resolve()
      }
    })
  }

  pump(batch: IngesterBatch, signal: AbortSignal): Promise<void> | void {
    const p = this.waitForCapacity(signal)
    if (p != null) return p.then(() => this.pump(batch, signal))
    this.inProgressBatches++
    const streamsInBatch = new Set<Stream>()
    this.batchStreams.set(batch, streamsInBatch)
    for (const [sn, event] of batch.items) {
      const current = this.streams.get(sn)
      const stream = current ?? new Stream(sn)
      stream.merge(event)
      streamsInBatch.add(stream)
      if (!current) {
        this.streams.set(sn, stream)
        this.queue.add(stream)
      }
    }
  }
}
