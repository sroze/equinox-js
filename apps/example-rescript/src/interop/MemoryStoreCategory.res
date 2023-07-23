type store

@module("@equinox-js/memory-store") @scope("MemoryStoreCategory")
external create: (
  store,
  string,
  Codec.t<'event, 'ctx>,
  ('state, array<'event>) => 'state,
  'state,
) => Decider.category<'event, 'state, 'ctx> = "create"
