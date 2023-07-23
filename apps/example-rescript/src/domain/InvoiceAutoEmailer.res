open Identifiers

let category = "InvoiceAutoEmail"
let streamId = StreamId.gen(InvoiceId.toString)

type email_sent = {
  email: string,
  payer_id: PayerId.t,
}
type email_failure = {
  payer_id: PayerId.t,
  reason: string,
}
type event =
  | EmailSent(email_sent)
  | EmailSendingFailed(email_failure)

let encode = (ev, ()): Codec.event_data =>
  switch ev {
  | EmailSent(data) => {
      type_: "EmailSent",
      data: Js.Json.stringifyAny(data),
      meta: None,
    }
  | EmailSendingFailed(data) => {
      type_: "EmailSendingFailed",
      data: Js.Json.stringifyAny(data),
      meta: None,
    }
  }

@scope("JSON") @val
external parseJson: option<string> => 'a = "parse"

let tryDecode = (ev: Codec.timeline_event) =>
  switch ev.type_ {
  | "EmailSent" => Some(EmailSent(parseJson(ev.data)))
  | "EmailSendingFailed" => Some(EmailSendingFailed(parseJson(ev.data)))
  | _ => None
  }

let codec = Codec.create(encode, tryDecode)

module Fold = {
  type state = option<event>
  let initial = None
  let fold = (state, events) =>
    switch events {
    | [] => state
    | _ => Some(events[Array.length(events) - 1])
    }
}

module Decide = {
  let sendEmail = async (mailer, payers, payerId, amount, state) => {
    switch state {
    | Some(EmailSent(_)) => []
    | _ =>
      let payer = await payers->Payer.Service.readProfile(payerId)
      switch payer {
      | None => [EmailSendingFailed({payer_id: payerId, reason: "Payer not found"})]
      | Some(payer) =>
        try {
          await mailer->EmailSender.sendEmail(
            payer.email,
            "Invoice",
            `Please pay ${string_of_int(amount)} by tuesday`,
          )
          [EmailSent({email: payer.email, payer_id: payerId})]
        } catch {
        | Js.Exn.Error(err) => {
            let reason = Js.Exn.message(err)->Belt.Option.getWithDefault("Unknown")
            [EmailSendingFailed({payer_id: payerId, reason})]
          }
        | _ => [EmailSendingFailed({payer_id: payerId, reason: "unknown"})]
        }
      }
    }
  }
}

module Service = {
  type t = {
    payerService: Payer.Service.t,
    mailer: EmailSender.t,
    resolve: InvoiceId.t => Decider.t<event, Fold.state>,
  }

  let sendEmail = (service, invoiceId, payerId, amount) => {
    let decider = service.resolve(invoiceId)
    decider->Decider.transactAsync(
      Decide.sendEmail(service.mailer, service.payerService, payerId, amount),
    )
  }
}

module Config = {
  open StoreConfig
  let (fold, initial) = (Fold.fold, Fold.initial)
  let resolveCategory = config => {
    switch config {
    | Memory(store) => Memory.create(category, codec, fold, initial, store)
    | MessageDb(store, cache) =>
      MessageDb.createLatestKnown(category, codec, fold, initial, (store, cache))
    }
  }

  let create = (config): Service.t => {
    let payerService = Payer.Config.create(config)
    let mailer = EmailSender.create()
    let category = resolveCategory(config)
    let resolve = id => Decider.resolve(category, streamId(id))
    {Service.resolve, payerService, mailer}
  }
}
