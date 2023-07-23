module Make = () => {
  type t
  external toString : t => string = "%identity"
  external ofString : string => t = "%identity"
  let parse = (s: string) =>
    s->Js.String2.toLowerCase->ofString
}

module PayerId = Make()
module InvoiceId = Make()
