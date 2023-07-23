open Identifiers

let pool = Pg.createPool(Environment.get("MDB_CONN_STR"))
let followerPool = Environment.tryGet("MDB_RO_CONN_STR")->Belt.Option.map(Pg.createPool)
let context = MessageDbCategory.createContext({pool, followerPool, batchSize: 500})
let cache = Caching.createCache()
let config = StoreConfig.MessageDb(context, cache)

let invoiceEmailer = InvoiceAutoEmailer.Config.create(config)

let main = async () => {
  let checkpointer = PgCheckpoints.create(Pg.createPool(Environment.get("CP_CONN_STR")))
  await PgCheckpoints.ensureTable(checkpointer)

  let handle = async (streamName, events) => {
    let (category, id) = StreamName.parseCategoryAndId(streamName)
    if category == Invoice.category {
      switch Invoice.codec.tryDecode(events[0]) {
      | Some(Invoice.InvoiceRaised({payer_id, amount})) =>
        let invoiceId = InvoiceId.parse(id)
        await invoiceEmailer->InvoiceAutoEmailer.Service.sendEmail(invoiceId, payer_id, amount)
        Js.log("Handled email event")
      | _ => ()
      }
    }
  }

  let source = MessageDbSource.create({
    pool: followerPool->Belt.Option.getWithDefault(pool),
    batchSize: 500,
    categories: [Invoice.category],
    groupName: "InvoiceAutoEmailer2",
    checkpointer,
    handler: handle,
    tailSleepIntervalMs: 100,
    maxConcurrentStreams: 10,
  })

  let ctrl = AbortController.make()
  source->MessageDbSource.start(ctrl.signal)
}

main()->ignore

