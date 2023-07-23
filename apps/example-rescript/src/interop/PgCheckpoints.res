type t

@module("@equinox-js/message-db-consumer") @new
external create: Pg.pool => t = "PgCheckpoints"


@send external ensureTable: (t) => Js.Promise.t<unit> = "ensureTable"
