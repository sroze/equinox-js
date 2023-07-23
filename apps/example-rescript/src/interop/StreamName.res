let parseCategoryAndId = (streamName) => {
  let idx = streamName->Js.String2.indexOf("-")
  let category = streamName->Js.String2.substring(~from=0, ~to_=idx)
  let id = streamName->Js.String2.substringToEnd(~from=idx + 1)
  (category, id)
}
