type event_data = {
  @as("type") type_: string,
  data: option<string>,
  meta: option<string>,
}

type timeline_event = {
  @as("type") type_: string,
  data: option<string>,
  meta: option<string>,
  id: string,
  time: Js.Date.t,
  index: int
}
type t<'ev, 'ctx> = {encode: ('ev, 'ctx) => event_data, tryDecode: timeline_event => option<'ev>}

let create = (encode, tryDecode) => {encode, tryDecode}
