type ctx

type context_config = {
  pool: Pg.pool,
  followerPool: option<Pg.pool>,
  batchSize: int
}

@module("@equinox-js/message-db") @scope("MessageDbContext")
external createContext: context_config => ctx = "create"

module AccessStrategy = {
  type t<'event, 'state>
  @module("@equinox-js/message-db") @scope("AccessStrategy")
  external unoptimized: unit => t<'event, 'state> = "Unoptimized"
  @module("@equinox-js/message-db") @scope("AccessStrategy")
  external latestKnown: unit => t<'event, 'state> = "LatestKnownEvent"
  @module("@equinox-js/message-db") @scope("AccessStrategy")
  external adjacentSnapshots: (string, 'state => 'event) => t<'event, 'state> = "AdjacentSnapshots"
}

@module("@equinox-js/message-db") @scope("MessageDbCategory")
external create: (
  ctx,
  string,
  Codec.t<'event, 'ctx>,
  ('state, array<'event>) => 'state,
  'state,
  Caching.t,
  AccessStrategy.t<'event, 'state>,
) => Decider.category<'event, 'state, 'ctx> = "create"
