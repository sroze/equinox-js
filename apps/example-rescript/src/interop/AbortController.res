type signal
type t = { signal: signal }

@new external make: unit => t = "AbortController"

@send external abort: t => unit = "abort"

