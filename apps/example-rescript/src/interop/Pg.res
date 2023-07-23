type pool

type pool_options = {
  connectionString: string,
  max: option<int>
}

@module("pg") @scope("default") @new external createPool': pool_options => pool = "Pool"

let createPool = (connectionString) => createPool'({connectionString, max: Some(10)})

