open Identifiers

let category = "Payer"
let streamId = StreamId.gen(PayerId.toString)

type payer_profile = {name: string, email: string}

type event =
  | PayerProfileUpdated(payer_profile)
  | PayerDeleted

let encode = (event, ()): Codec.event_data =>
  switch event {
  | PayerProfileUpdated(profile) => {
      type_: "PayerProfileUpdated",
      data: Js.Json.stringifyAny(profile),
      meta: None,
    }
  | PayerDeleted => {type_: "PayerDeleted", data: None, meta: None}
  }

@scope("JSON") @val
external parseJson: option<string> => 'a = "parse"
let tryDecode = (ev: Codec.timeline_event) =>
  switch ev.type_ {
  | "PayerProfileUpdated" => Some(PayerProfileUpdated(parseJson(ev.data)))
  | "PayerDeleted" => Some(PayerDeleted)
  | _ => None
  }

let codec = Codec.create(encode, tryDecode)

type state = option<payer_profile>
let initial = None

let last = arr =>
  switch arr {
  | [] => None
  | arr => Some(arr[Js.Array.length(arr) - 1])
  }

let fold = (state, events) =>
  switch last(events) {
  | None => state
  | Some(PayerProfileUpdated(profile)) => Some(profile)
  | Some(PayerDeleted) => None
  }

let updateProfile = (data, state) =>
  switch state {
  | Some(state) if state == data => []
  | None
  | Some(_) => [PayerProfileUpdated(data)]
  }

let deletePayer = state =>
  switch state {
  | None => []
  | Some(_) => [PayerDeleted]
  }

module Service = {
  type t = {resolve: PayerId.t => Decider.t<event, state>}

  let updateProfile = (service, id, profile) => {
    let decider = service.resolve(id)
    decider->Decider.transact(updateProfile(profile))
  }

  let deletePayer = (service, id) => {
    let decider = service.resolve(id)
    decider->Decider.transact(deletePayer)
  }

  let readProfile = (service, id) => {
    let decider = service.resolve(id)
    decider->Decider.query(x => x)
  }
}

module Config = {
  open StoreConfig
  let resolveCategory = config => {
    switch config {
    | Memory(store) => Memory.create(category, codec, fold, initial, store)
    | MessageDb(store, cache) =>
      MessageDb.createLatestKnown(category, codec, fold, initial, (store, cache))
    }
  }

  let create = (config) : Service.t => {
    let category = resolveCategory(config)
    let resolve = id => Decider.resolve(category, streamId(id))
    {Service.resolve: resolve}
  }
}
