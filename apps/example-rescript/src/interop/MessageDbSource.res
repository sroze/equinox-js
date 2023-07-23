
type config = {
  pool: Pg.pool,
  batchSize: int,
  categories: array<string>,
  groupName: string,
  checkpointer: PgCheckpoints.t,
  handler: (string, array<Codec.timeline_event>) => Js.Promise.t<unit>,
  tailSleepIntervalMs: int,
  maxConcurrentStreams: int 
}

type t

@module("@equinox-js/message-db-consumer") 
@scope("MessageDbSource")
external create: config => t = "create"


@send external start: (t, AbortController.signal) => unit = "start"
