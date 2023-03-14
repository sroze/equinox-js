"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[574],{7522:(e,t,n)=>{n.d(t,{Zo:()=>d,kt:()=>f});var r=n(9901);function o(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function a(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function c(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?a(Object(n),!0).forEach((function(t){o(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):a(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function s(e,t){if(null==e)return{};var n,r,o=function(e,t){if(null==e)return{};var n,r,o={},a=Object.keys(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||(o[n]=e[n]);return o}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(o[n]=e[n])}return o}var i=r.createContext({}),l=function(e){var t=r.useContext(i),n=t;return e&&(n="function"==typeof e?e(t):c(c({},t),e)),n},d=function(e){var t=l(e.components);return r.createElement(i.Provider,{value:t},e.children)},p="mdxType",u={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},m=r.forwardRef((function(e,t){var n=e.components,o=e.mdxType,a=e.originalType,i=e.parentName,d=s(e,["components","mdxType","originalType","parentName"]),p=l(n),m=o,f=p["".concat(i,".").concat(m)]||p[m]||u[m]||a;return n?r.createElement(f,c(c({ref:t},d),{},{components:n})):r.createElement(f,c({ref:t},d))}));function f(e,t){var n=arguments,o=t&&t.mdxType;if("string"==typeof e||o){var a=n.length,c=new Array(a);c[0]=m;var s={};for(var i in t)hasOwnProperty.call(t,i)&&(s[i]=t[i]);s.originalType=e,s[p]="string"==typeof e?e:o,c[1]=s;for(var l=2;l<a;l++)c[l]=n[l];return r.createElement.apply(null,c)}return r.createElement.apply(null,n)}m.displayName="MDXCreateElement"},9302:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>i,contentTitle:()=>c,default:()=>u,frontMatter:()=>a,metadata:()=>s,toc:()=>l});var r=n(7364),o=(n(9901),n(7522));const a={},c="Contact preferences",s={unversionedId:"examples/contact-preferences",id:"examples/contact-preferences",title:"Contact preferences",description:"This decider is used in integration tests for MessageDb and DynamoStore",source:"@site/docs/examples/contact-preferences.md",sourceDirName:"examples",slug:"/examples/contact-preferences",permalink:"/equinox-js/docs/examples/contact-preferences",draft:!1,editUrl:"https://github.com/nordfjord/equinox-js/tree/main/apps/docs/docs/examples/contact-preferences.md",tags:[],version:"current",frontMatter:{},sidebar:"tutorialSidebar",previous:{title:"Bank Account",permalink:"/equinox-js/docs/examples/bank-account"},next:{title:"Hotel",permalink:"/equinox-js/docs/examples/hotel"}},i={},l=[],d={toc:l},p="wrapper";function u(e){let{components:t,...n}=e;return(0,o.kt)(p,(0,r.Z)({},d,n,{components:t,mdxType:"MDXLayout"}),(0,o.kt)("h1",{id:"contact-preferences"},"Contact preferences"),(0,o.kt)("p",null,"This decider is used in integration tests for MessageDb and DynamoStore"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-ts"},'import * as Mdb from "@equinox-js/message-db"\nimport * as Ddb from "@equinox-js/dynamo-store"\nimport * as Mem from "@equinox-js/memory-store"\nimport { createHash } from "crypto"\nimport { Codec, Decider, LoadOption } from "@equinox-js/core"\nimport { equals } from "ramda"\n\n\nexport type ClientId = string & { __brand: "ClientId" }\nexport const ClientId = {\n  ofString: (x: string) => x as ClientId,\n  toString: (x: ClientId) => x as string\n}\n\nexport const Category = "ContactPreferences"\nconst streamId = (id: ClientId) => createHash("sha256").update(ClientId.toString(id)).digest("hex")\n\nexport type Preferences = { manyPromotions: boolean; littlePromotions: boolean; productReview: boolean; quickSurveys: boolean }\nexport type Value = { email: string; preferences: Preferences }\n\nexport type Event = { type: "ContactPreferencesChanged"; data: Value }\nexport const codec = Codec.json<Event>()\n\nexport type State = Events.Preferences\nexport const initial: State = {\n  manyPromotions: false,\n  littlePromotions: false,\n  productReview: false,\n  quickSurveys: false\n}\nconst evolve = (_s: State, e: Events.Event) => {\n  switch (e.type) {\n    case "ContactPreferencesChanged":\n      return e.data.preferences\n  }\n}\nexport const fold = (s: State, e: Events.Event[]) => (e.length ? evolve(s, e[e.length - 1]) : s)\n\nnamespace Decide {\n  export const update = (value: Events.Value) => (state: Fold.State): Events.Event[] => {\n    if (equals(value.preferences, state)) return []\n    return [{ type: "ContactPreferencesChanged", data: value }]\n  }\n}\n\nexport class Service {\n  constructor(private readonly resolve: (id: ClientId) => Decider<Events.Event, Fold.State>) {\n  }\n\n  update(email: ClientId, value: Events.Preferences) {\n    const decider = this.resolve(email)\n    return decider.transact(Decide.update({ email: email, preferences: value }))\n  }\n\n  read(email: ClientId) {\n    const decider = this.resolve(email)\n    return decider.query((x) => x)\n  }\n\n  readStale(email: ClientId) {\n    const decider = this.resolve(email)\n    return decider.query((x) => x, LoadOption.AllowStale)\n  }\n\n  static createMessageDb(context: Mdb.MessageDbContext, caching: Mdb.CachingStrategy) {\n    const access = Mdb.AccessStrategy.LatestKnownEvent<Event, State>()\n    const category = Mdb.MessageDbCategory.build(context, codec, fold, initial, caching, access)\n    const resolve = (clientId: ClientId) => Decider.resolve(category, Category, streamId(clientId), null)\n    return new Service(resolve)\n  }\n\n  static createDynamo(context: Ddb.DynamoStoreContext, caching: Ddb.CachingStrategy.CachingStrategy) {\n    const access = Ddb.AccessStrategy.LatestKnownEvent<Event, State>()\n    const category = Ddb.DynamoStoreCategory.build(context, Codec.deflate(codec), fold, initial, caching, access)\n    const resolve = (clientId: ClientId) => Decider.resolve(category, Category, streamId(clientId), null)\n    return new Service(resolve)\n  }\n\n  static createMem(store: Mem.VolatileStore<Record<string, any>>) {\n    const category = Mem.MemoryStoreCategory.build(store, codec, fold, initial)\n    const resolve = (clientId: ClientId) => Decider.resolve(category, Category, streamId(clientId), null)\n    return new Service(resolve)\n  }\n}\n')))}u.isMDXComponent=!0}}]);