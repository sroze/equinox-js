type category<'event, 'state, 'ctx>
type t<'event, 'state>

@module("@equinox-js/core") @scope("Decider")
external resolve: (category<'event, 'state, unit>, string) => t<'event, 'state> = "resolve"

@module("@equinox-js/core") @scope("Decider")
external resolveWithContext: (category<'event, 'state, 'ctx>, string, 'ctx) => t<'event, 'state> = "resolve"

@send external transact: (t<'event, 'state>, ('state => array<'event>)) => Js.Promise.t<unit> = "transact"
@send external transactAsync: (t<'event, 'state>, ('state => Js.Promise.t<array<'event>>)) => Js.Promise.t<unit> = "transactAsync"
@send external query: (t<'event, 'state>, ('state => 'a)) => Js.Promise.t<'a> = "query"
