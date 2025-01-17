import { MemoryCheckpoints } from "./Checkpoints.js"
import { TailingFeedSource } from "./FeedSource.mjs"
import { test, expect, vi } from "vitest"
import { Batch, IngesterBatch, Sink } from "./Types.js"
import { StreamName } from "@equinox-js/core"
import { StreamId } from "@equinox-js/core"

class MemorySink implements Sink {
  async start() {}

  async pump(batch: IngesterBatch, signal: AbortSignal): Promise<void> {
    batch.onComplete()
  }
}

function createCrawl(batches: Batch[]) {
  return async function* crawl(): AsyncIterable<Batch> {
    while (batches.length) {
      yield batches.shift()!
    }
  }
}

const streamName = (id: string) => StreamName.create("Cat", StreamId.create(id))

test("Checkpointing happens asynchronously", async () => {
  const checkpoints = new MemoryCheckpoints()
  const sink = new MemorySink()
  const crawl = createCrawl([
    {
      items: [
        [streamName("1"), {} as any],
        [streamName("2"), {} as any],
      ],
      checkpoint: 0n,
      isTail: false,
    },
    {
      items: [
        [streamName("3"), {} as any],
        [streamName("4"), {} as any],
      ],
      checkpoint: 1n,
      isTail: false,
    },
    {
      items: [
        [streamName("5"), {} as any],
        [streamName("6"), {} as any],
      ],
      checkpoint: 2n,
      isTail: false,
    },
    {
      items: [
        [streamName("7"), {} as any],
        [streamName("8"), {} as any],
      ],
      checkpoint: 3n,
      isTail: true,
    },
  ])
  const ctrl = new AbortController()
  const checkpointReached = checkpoints.waitForCheckpoint("TestGroup", "0", 3n)
  const source = new TailingFeedSource({
    tailSleepIntervalMs: 1000,
    checkpointIntervalMs: 10,
    groupName: "TestGroup",
    checkpoints,
    sink,
    crawl,
  })
  vi.spyOn(checkpoints, "commit")
  expect(await checkpoints.load("TestGroup", "0")).toBe(0n)
  source.start("0", ctrl.signal)
  await checkpointReached
  ctrl.abort()
  expect(await checkpoints.load("TestGroup", "0")).toBe(3n)
  expect(checkpoints.commit).toHaveBeenCalledTimes(1)
})
