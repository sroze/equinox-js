type t
type cache
@module("@equinox-js/core") @new
external createCache: unit => cache = "MemoryCache"
@module("@equinox-js/core") @scope("CachingStrategy")
external noCache: unit => t = "noCache"
@module("@equinox-js/core") @scope("CachingStrategy")
external slidingWindowMs: (cache, int) => t = "slidingWindow"
let slidingWindow = (cache, minutes) => slidingWindowMs(cache, minutes * 60 * 1000)
