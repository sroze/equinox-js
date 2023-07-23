@scope("process") @val external env: Js.Dict.t<string> = "env"

let tryGet = (name) => Js.Dict.get(env, name)
let get = (name) => 
  switch Js.Dict.get(env, name) {
    | Some(value) => value
    | None => failwith(`Environment variable ${name} not found`)
  }
