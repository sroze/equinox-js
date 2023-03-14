"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[95],{7522:(e,n,t)=>{t.d(n,{Zo:()=>l,kt:()=>u});var a=t(9901);function r(e,n,t){return n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function i(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);n&&(a=a.filter((function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable}))),t.push.apply(t,a)}return t}function o(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?i(Object(t),!0).forEach((function(n){r(e,n,t[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):i(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))}))}return e}function c(e,n){if(null==e)return{};var t,a,r=function(e,n){if(null==e)return{};var t,a,r={},i=Object.keys(e);for(a=0;a<i.length;a++)t=i[a],n.indexOf(t)>=0||(r[t]=e[t]);return r}(e,n);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(a=0;a<i.length;a++)t=i[a],n.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(r[t]=e[t])}return r}var s=a.createContext({}),d=function(e){var n=a.useContext(s),t=n;return e&&(t="function"==typeof e?e(n):o(o({},n),e)),t},l=function(e){var n=d(e.components);return a.createElement(s.Provider,{value:n},e.children)},p="mdxType",v={inlineCode:"code",wrapper:function(e){var n=e.children;return a.createElement(a.Fragment,{},n)}},m=a.forwardRef((function(e,n){var t=e.components,r=e.mdxType,i=e.originalType,s=e.parentName,l=c(e,["components","mdxType","originalType","parentName"]),p=d(t),m=r,u=p["".concat(s,".").concat(m)]||p[m]||v[m]||i;return t?a.createElement(u,o(o({ref:n},l),{},{components:t})):a.createElement(u,o({ref:n},l))}));function u(e,n){var t=arguments,r=n&&n.mdxType;if("string"==typeof e||r){var i=t.length,o=new Array(i);o[0]=m;var c={};for(var s in n)hasOwnProperty.call(n,s)&&(c[s]=n[s]);c.originalType=e,c[p]="string"==typeof e?e:r,o[1]=c;for(var d=2;d<i;d++)o[d]=t[d];return a.createElement.apply(null,o)}return a.createElement.apply(null,t)}m.displayName="MDXCreateElement"},5753:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>s,contentTitle:()=>o,default:()=>v,frontMatter:()=>i,metadata:()=>c,toc:()=>d});var a=t(7364),r=(t(9901),t(7522));const i={},o="Invoice",c={unversionedId:"examples/invoice",id:"examples/invoice",title:"Invoice",description:"Based on the blog post on The Equinox Programming Model",source:"@site/docs/examples/invoice.md",sourceDirName:"examples",slug:"/examples/invoice",permalink:"/equinox-js/docs/examples/invoice",draft:!1,editUrl:"https://github.com/nordfjord/equinox-js/tree/main/apps/docs/docs/examples/invoice.md",tags:[],version:"current",frontMatter:{},sidebar:"tutorialSidebar",previous:{title:"Hotel",permalink:"/equinox-js/docs/examples/hotel"},next:{title:"MessageDB",permalink:"/equinox-js/docs/stores/message-db/"}},s={},d=[],l={toc:d},p="wrapper";function v(e){let{components:n,...t}=e;return(0,r.kt)(p,(0,a.Z)({},l,t,{components:n,mdxType:"MDXLayout"}),(0,r.kt)("h1",{id:"invoice"},"Invoice"),(0,r.kt)("p",null,"Based on the blog post on ",(0,r.kt)("a",{parentName:"p",href:"https://nordfjord.io/2022/12/05/equinox.html"},"The Equinox Programming Model")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-ts"},'import { PayerId, InvoiceId } from "./types"\nimport * as Mdb from "@equinox-js/message-db"\nimport * as Ddb from "@equinox-js/dynamo-store"\nimport * as Mem from "@equinox-js/memory-store"\nimport z from "zod"\nimport { Codec, Decider } from "@equinox-js/core"\n\nexport const Category = "Invoice"\nexport const streamId = (invoiceId: InvoiceId) => invoiceId.toString()\ntype InvoiceRaised = { payer_id: PayerId; amount: number }\ntype Payment = { amount: number; reference: string }\ntype EmailReceipt = { idempotency_key: string; recipient: string; sent_at: Date }\n\ntype Event =\n  | { type: "InvoiceRaised"; data: InvoiceRaised }\n  | { type: "InvoiceEmailed"; data: EmailReceipt }\n  | { type: "PaymentReceived"; data: Payment }\n  | { type: "InvoiceFinalized" }\n\nconst RaisedSchema = z.object({\n  invoice_number: z.number().int(),\n  payer_id: z.string().transform((s) => s as PayerId),\n  amount: z.number(),\n})\nconst PaymentSchema = z.object({ reference: z.string(), amount: z.number() })\nconst EmailReceiptSchema = z.object({ idempotency_key: z.string(), recipient: z.string().email(), sent_at: z.date() })\n\nexport const codec: Codec<Event, string> = {\n  tryDecode(ev): Event | undefined {\n    switch (ev.type) {\n      case "InvoiceRaised":\n        return { type: "InvoiceRaised", data: RaisedSchema.parse(JSON.parse(ev.data!)) }\n      case "InvoiceEmailed":\n        return { type: ev.type, data: EmailReceiptSchema.parse(JSON.parse(ev.data!)) }\n      case "PaymentReceived":\n        return { type: ev.type, data: PaymentSchema.parse(JSON.parse(ev.data!)) }\n      case "InvoiceFinalized":\n        return { type: ev.type }\n    }\n  },\n  encode(ev) {\n    return { type: ev.type, data: "data" in ev ? JSON.stringify(ev.data) : undefined }\n  },\n}\n\nnamespace Fold {\n  export type InvoiceState = { amount: number; payer_id: PayerId; emailed_to: Set<string>; payments: Set<string>; amount_paid: number }\n  export type State = { type: "Initial" } | { type: "Raised"; state: InvoiceState } | { type: "Finalized"; state: InvoiceState }\n  export const initial: State = { type: "Initial" }\n\n  function evolveInitial(event: Event): State {\n    if (event.type !== "InvoiceRaised") throw new Error("Unexpected " + event.type)\n    return {\n      type: "Raised",\n      state: {\n        amount: event.data.amount,\n        payer_id: event.data.payer_id,\n        amount_paid: 0,\n        emailed_to: new Set(),\n        payments: new Set(),\n      },\n    }\n  }\n\n  function evolveRaised(state: InvoiceState, event: Event): State {\n    switch (event.type) {\n      case "InvoiceRaised":\n        throw new Error("Unexpected " + event.type)\n      case "InvoiceEmailed":\n        return {\n          type: "Raised",\n          state: { ...state, emailed_to: new Set([...state.emailed_to, event.data.recipient]) },\n        }\n      case "PaymentReceived":\n        return {\n          type: "Raised",\n          state: {\n            ...state,\n            payments: new Set([...state.payments, event.data.reference]),\n            amount_paid: state.amount_paid + event.data.amount,\n          },\n        }\n\n      case "InvoiceFinalized":\n        return { type: "Finalized", state }\n    }\n  }\n\n  function evolveFinalized(event: Event): State {\n    throw new Error("Unexpected " + event.type)\n  }\n\n  export function evolve(state: State, event: Event): State {\n    switch (state.type) {\n      case "Initial":\n        return evolveInitial(event)\n      case "Raised":\n        return evolveRaised(state.state, event)\n      case "Finalized":\n        return evolveFinalized(event)\n    }\n  }\n\n  export function fold(state: State, events: Event[]): State {\n    return events.reduce(evolve, state)\n  }\n}\n\nnamespace Decide {\n  export const raiseInvoice =\n    (data: InvoiceRaised) =>\n      (state: Fold.State): Event[] => {\n        switch (state.type) {\n          case "Initial":\n            return [{ type: "InvoiceRaised", data }]\n          case "Raised":\n            if (state.state.amount === data.amount && state.state.payer_id === data.payer_id) return []\n            throw new Error("Invoice is already raised")\n          case "Finalized":\n            throw new Error("invoice is finalized")\n        }\n      }\n\n  const hasSentEmailToRecipient = (recipient: string, state: Fold.InvoiceState) => state.emailed_to.has(recipient)\n  export const recordEmailReceipt =\n    (data: EmailReceipt) =>\n      (state: Fold.State): Event[] => {\n        switch (state.type) {\n          case "Initial":\n            throw new Error("Invoice not found")\n          case "Finalized":\n            throw new Error("Invoice is finalized")\n          case "Raised":\n            if (hasSentEmailToRecipient(data.recipient, state.state)) return []\n            return [{ type: "InvoiceEmailed", data }]\n        }\n      }\n\n  export const recordPayment =\n    (data: Payment) =>\n      (state: Fold.State): Event[] => {\n        switch (state.type) {\n          case "Initial":\n            throw new Error("Invoice not found")\n          case "Finalized":\n            throw new Error("Invoice is finalized")\n          case "Raised":\n            if (state.state.payments.has(data.reference)) return []\n            return [{ type: "PaymentReceived", data }]\n        }\n      }\n\n  export const finalize = (state: Fold.State): Event[] => {\n    switch (state.type) {\n      case "Initial":\n        throw new Error("Invoice not found")\n      case "Finalized":\n        return []\n      case "Raised":\n        return [{ type: "InvoiceFinalized" }]\n    }\n  }\n}\n\nnamespace Queries {\n  import InvoiceState = Fold.InvoiceState\n  import State = Fold.State\n  export type Model = {\n    amount: number\n    payer_id: string\n    emailed_to: string[]\n    finalized: boolean\n  }\n\n  export const fromState = (finalized: boolean, state: InvoiceState) => ({\n    amount: state.amount,\n    payer_id: state.payer_id.toString(),\n    emailed_to: Array.from(state.emailed_to),\n    finalized,\n  })\n\n  export const summary = (state: State): Model | null => {\n    switch (state.type) {\n      case "Initial":\n        return null\n      case "Raised":\n        return fromState(false, state.state)\n      case "Finalized":\n        return fromState(true, state.state)\n    }\n  }\n}\n\nexport class Service {\n  constructor(private readonly resolve: (invoiceId: InvoiceId) => Decider<Event, Fold.State>) {}\n\n  raise(id: InvoiceId, data: InvoiceRaised) {\n    const decider = this.resolve(id)\n    return decider.transact(Decide.raiseInvoice(data))\n  }\n\n  recordEmailReceipt(id: InvoiceId, data: EmailReceipt) {\n    const decider = this.resolve(id)\n    return decider.transact(Decide.recordEmailReceipt(data))\n  }\n\n  recordPayment(id: InvoiceId, data: Payment) {\n    const decider = this.resolve(id)\n    return decider.transact(Decide.recordPayment(data))\n  }\n\n  finalize(id: InvoiceId) {\n    const decider = this.resolve(id)\n    return decider.transact(Decide.finalize)\n  }\n\n  readInvoice(id: InvoiceId) {\n    const decider = this.resolve(id)\n    return decider.query(Queries.summary)\n  }\n\n  static createMessageDb(context: Mdb.MessageDbContext, caching: Mdb.CachingStrategy) {\n    const category = Mdb.MessageDbCategory.build(context, codec, Fold.fold, Fold.initial, caching)\n    const resolve = (invoiceId: InvoiceId) => Decider.resolve(category, Category, streamId(invoiceId), null)\n    return new Service(resolve)\n  }\n\n  static createDynamo(context: Ddb.DynamoStoreContext, caching: Ddb.CachingStrategy.CachingStrategy) {\n    const category = Ddb.DynamoStoreCategory.build(context, Codec.deflate(codec), Fold.fold, Fold.initial, caching, Ddb.AccessStrategy.Unoptimized())\n    const resolve = (invoiceId: InvoiceId) => Decider.resolve(category, Category, streamId(invoiceId), null)\n    return new Service(resolve)\n  }\n\n  static createMem(store: Mem.VolatileStore<string>) {\n    const category = Mem.MemoryStoreCategory.build(store, codec, Fold.fold, Fold.initial)\n    const resolve = (invoiceId: InvoiceId) => Decider.resolve(category, Category, streamId(invoiceId), null)\n    return new Service(resolve)\n  }\n}\n')))}v.isMDXComponent=!0}}]);