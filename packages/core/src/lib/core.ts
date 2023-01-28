export type StateTuple<State> = [StreamToken, State]

export type SyncResult<State> =
  /** The write succeeded (the supplied token and state can be used to efficiently continue the processing if, and only if, desired) */
  | { type: "Written"; data: StateTuple<State> }

  /**
   * The set of changes supplied to TrySync conflict with the present state of the underlying stream based on the configured policy for that store
   * The inner is Async as some stores (and/or states) are such that determining the conflicting state (if, and only if, required) needs an extra trip to obtain
   */
  | { type: "Conflict"; resync: () => Promise<StateTuple<State>> }

export type StreamToken = {
  value: unknown
  version: bigint
  bytes: number
}

/**
 * Store-agnostic interface representing interactions a Flow can have with the state of a given event stream. Not intended for direct use by consumer code.
 */
export interface IStream<Event, State> {
  /** Generate a stream token that represents a stream one believes to be empty to use as a Null Object when optimizing out the initial load roundtrip */
  loadEmpty(): [StreamToken, State]

  /** Obtain the state from the target stream */
  load(allowStale: boolean, requireLeader: boolean): Promise<StateTuple<State>>

  /**
   * Given the supplied `token` [and related `originState`], attempt to move to state `state'` by appending the supplied `events` to the underlying stream
   * SyncResult.Written: implies the state is now the value represented by the Result's value
   * SyncResult.Conflict: implies the `events` were not synced; if desired the consumer can use the included resync workflow in order to retry
   */
  trySync(attempt: number, originTokenAndState: [StreamToken, State], events: Event[]): Promise<SyncResult<State>>
}

function run<Event, State, Result, V = Result>(
  stream: IStream<Event, State>,
  decide: (ctx: StateTuple<State>) => Promise<[Result, Event[]]>,
  validateResync: (attempt: number) => void,
  mapResult: (r: Result, ctx: StateTuple<State>) => V,
  origin: StateTuple<State>
) {
  async function loop(attempt: number, tokenAndState: StateTuple<State>): Promise<V> {
    const [result, events] = await decide(tokenAndState)
    if (events.length === 0) return mapResult(result, tokenAndState)

    const syncResult = await stream.trySync(attempt, tokenAndState, events)

    switch (syncResult.type) {
      case "Written":
        return mapResult(result, syncResult.data)
      case "Conflict": {
        validateResync(attempt)
        return loop(attempt + 1, await syncResult.resync())
      }
    }
  }

  return loop(1, origin)
}

export async function transactAsync<Event, State, Result, V = Result>(
  stream: IStream<Event, State>,
  fetch: (stream: IStream<Event, State>) => Promise<StateTuple<State>>,
  decide: (ctx: StateTuple<State>) => Promise<[Result, Event[]]>,
  reload: (attempt: number) => void,
  mapResult: (r: Result, ctx: StateTuple<State>) => V
) {
  const origin = await fetch(stream)
  return run(stream, decide, reload, mapResult, origin)
}

export async function queryAsync<Event, State, V>(
  stream: IStream<Event, State>,
  fetch: (stream: IStream<Event, State>) => Promise<StateTuple<State>>,
  projection: (ctx: StateTuple<State>) => V
): Promise<V> {
  const origin = await fetch(stream)
  return projection(origin)
}
