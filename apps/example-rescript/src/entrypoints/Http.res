open Identifiers

let pool = Pg.createPool(Environment.get("MDB_CONN_STR"))
let followerPool = Environment.tryGet("MDB_RO_CONN_STR")->Belt.Option.map(Pg.createPool)

let context = MessageDbCategory.createContext({pool, followerPool, batchSize: 500})
let cache = Caching.createCache()
let config = StoreConfig.MessageDb(context, cache)

let payerService = Payer.Config.create(config)
let invoiceService = Invoice.Config.create(config)

open Express

let app = express()
app->use(jsonMiddleware())

type handlerP = (req, res) => Js.Promise.t<unit>
@send external getP: (express, string, handlerP) => unit = "get"
@send external putP: (express, string, handlerP) => unit = "put"
@send external deleteP: (express, string, handlerP) => unit = "delete"

app->getP("/payer/:id", async (req, res) => {
  open Payer.Service
  let payerId = (req->params)["id"]->PayerId.parse
  let profile = await payerService->readProfile(payerId)
  switch (profile) {
  | None => res->status(404)->json(Js.Nullable.null)
  | Some(profile) => res->status(200)->json(profile)
  }
  ->ignore
})

app->putP("/payer/:id", async (req, res) => {
  open Payer.Service
  let (body, params) = (req->body, req->params)
  let payerId = params["id"]->PayerId.parse
  await payerService->updateProfile(payerId, body)
  res->status(200)->json(body)->ignore
})

app->deleteP("/payer/:id", async (req, res) => {
  open Payer.Service
  let payerId = (req->params)["id"]->PayerId.parse
  await payerService->deletePayer(payerId)
  res->status(200)->json(Js.Nullable.null)->ignore
})



//
// app.post("/invoice", async (req, res) => {
//   const id = InvoiceId.create()
//   const body = Invoice.RaisedSchema.parse(req.body)
//   await invoiceService.raise(id, body)
//   res.status(200).json({ id })
// })
//
// app.get('/invoice/:id', async (req, res) => {
//   const invoice = await invoiceService.readInvoice(InvoiceId.parse(req.params.id))
//   if (!invoice) return res.status(404).json(null)
//   return res.status(200).json(invoice)
// })

let _ = app->listenWithCallback(3000, _ => Js.log("App listening on port 3000"))
