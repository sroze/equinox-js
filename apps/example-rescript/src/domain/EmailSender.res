type t
let sendEmail = (_: t, _to: string, _title: string, _body: string) =>
  Js.Promise.resolve()

let create = (): t => Obj.magic(())
