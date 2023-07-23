open Identifiers

let category = "Invoice"
let streamId = StreamId.gen(InvoiceId.toString)

type raised = {payer_id: PayerId.t, amount: int}
type payment = {amount: int, reference: string}

type event =
  | InvoiceRaised(raised)
  | PaymentReceived(payment)
  | InvoiceFinalized

let encode = (event, ()): Codec.event_data =>
  switch event {
  | InvoiceRaised(data) => {
      type_: "InvoiceRaised",
      data: Js.Json.stringifyAny(data),
      meta: None,
    }
  | PaymentReceived(data) => {
      type_: "PaymentReceived",
      data: Js.Json.stringifyAny(data),
      meta: None,
    }
  | InvoiceFinalized => {
      type_: "InvoiceFinalized",
      data: None,
      meta: None,
    }
  }

@scope("JSON") @val
external parseJson: option<string> => 'a = "parse"

let tryDecode = (ev: Codec.timeline_event) =>
  switch ev.type_ {
  | "InvoiceRaised" => InvoiceRaised(parseJson(ev.data))->Some
  | "PaymentReceived" => PaymentReceived(parseJson(ev.data))->Some
  | "InvoiceFinalized" => InvoiceFinalized->Some
  | _ => None
  }

let codec = Codec.create(encode, tryDecode)

module Fold = {
  type invoice_state = {
    amount: int,
    payer_id: PayerId.t,
    payments: Belt.Set.String.t,
    amount_paid: int,
  }
  type state =
    | Initial
    | Raised(invoice_state)
    | Finalized(invoice_state)
  let initial = Initial
  let evolveInitial = (event: event) =>
    switch event {
    | InvoiceRaised(data) =>
      Raised({
        amount: data.amount,
        payer_id: data.payer_id,
        payments: Belt.Set.String.empty,
        amount_paid: 0,
      })
    | _ => failwith("Unexpected event")
    }

  let evolveRaised = (state: invoice_state, event: event) =>
    switch event {
    | InvoiceRaised(_) => failwith("Unexpected event")
    | PaymentReceived(data) =>
      Raised({
        ...state,
        payments: Belt.Set.String.add(state.payments, data.reference),
        amount_paid: state.amount_paid + data.amount,
      })
    | InvoiceFinalized => Finalized(state)
    }
  let evolveFinalized = (_event: event) => failwith("Unexpected event")

  let evolve = (state: state, event: event) =>
    switch state {
    | Initial => evolveInitial(event)
    | Raised(state) => evolveRaised(state, event)
    | Finalized(_) => evolveFinalized(event)
    }
  let fold = Js.Array.reduce(evolve)
}

// Decisions

module Decide = {
  let raiseInvoice = (data, state) =>
    switch state {
    | Fold.Initial => [InvoiceRaised(data)]
    | Raised(_) => []
    | Finalized(_) => []
    }

  let recordPayment = (data, state) =>
    switch state {
    | Fold.Initial => failwith("Invoice not found")
    | Raised(state) =>
      if Belt.Set.String.has(state.payments, data.reference) {
        []
      } else {
        [PaymentReceived(data)]
      }
    | Finalized(_) => failwith("Invoice is finalized")
    }
  let finalize = state =>
    switch state {
    | Fold.Initial => failwith("Invoice not found")
    | Raised(state) =>
      if state.amount_paid >= state.amount {
        [InvoiceFinalized]
      } else {
        []
      }
    | Finalized(_) => []
    }
}

module Query = {
  type model = {
    amount: int,
    payer_id: string,
    finalized: bool,
  }
  let summary = state =>
    switch state {
    | Fold.Initial => None
    | Raised(state) =>
      Some({
        amount: state.amount,
        payer_id: PayerId.toString(state.payer_id),
        finalized: false,
      })
    | Finalized(state) =>
      Some({
        amount: state.amount,
        payer_id: PayerId.toString(state.payer_id),
        finalized: true,
      })
    }
}

module Service = {
  type t = {resolve: InvoiceId.t => Decider.t<event, Fold.state>}

  let raise = (service, id, data) => {
    let decider = service.resolve(id)
    decider->Decider.transact(Decide.raiseInvoice(data))
  }

  let recordPayment = (service, id, data) => {
    let decider = service.resolve(id)
    decider->Decider.transact(Decide.recordPayment(data))
  }

  let finalize = (service, id) => {
    let decider = service.resolve(id)
    decider->Decider.transact(Decide.finalize)
  }

  let readInvoice = (service, id) => {
    let decider = service.resolve(id)
    decider->Decider.query(Query.summary)
  }
}

module Config = {
  open StoreConfig
  let (fold, initial) = (Fold.fold, Fold.initial)
  let resolveCategory = config =>
    switch config {
    | Memory(store) => Memory.create(category, codec, fold, initial, store)
    | MessageDb(store, cache) =>
      MessageDb.createUnoptimized(category, codec, fold, initial, (store, cache))
    }

  let create = config => {
    let category = resolveCategory(config)
    let resolve = id => streamId(id) |> Decider.resolve(category)
    {resolve}
  }
}
