type t =
  | Memory(MemoryStoreCategory.store)
  | MessageDb(MessageDbCategory.ctx, Caching.cache)

module MessageDb = {
  open MessageDbCategory
  let createCached = (name, codec, fold, initial, access, (ctx, cache)) => {
    let caching = Caching.slidingWindow(cache, 20)
    create(ctx, name, codec, fold, initial, caching, access)
  }

  let createUnoptimized = (name, codec, fold, initial, config) => {
    let access = AccessStrategy.unoptimized()
    createCached(name, codec, fold, initial, access, config)
  }
  
  let createSnapshotted = (name, codec, fold, initial, eventName, toSnapshot, config) => {
    let access = AccessStrategy.adjacentSnapshots(eventName, toSnapshot) 
    createCached(name, codec, fold, initial, access, config)
  }

  let createLatestKnown = (name, codec, fold, initial, config) => {
    let access = AccessStrategy.latestKnown()
    createCached(name, codec, fold, initial, access, config)
  }
}

module Memory = {
  let create = (name, codec, fold, initial, store) => {
    MemoryStoreCategory.create(store, name, codec, fold, initial)
  }
}

