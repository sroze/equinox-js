let compose = (ids) => ids->Js.Array2.joinWith("_")
let gen = f => a => f(a)
let gen2 = (f, g) => (a, b) => compose([f(a), g(b)])
