import { ChargeId, GuestStayId, PaymentId } from "./types"
import { Decider, ICachingStrategy, ICodec, StreamId, StreamName } from "@equinox-js/core"
import * as Mdb from "@equinox-js/message-db"
import * as Mem from "@equinox-js/memory-store"

export namespace Stream {
  export const category = "GuestStay"
  export const streamId = StreamId.gen(GuestStayId.toString)
  export const decodeId = StreamId.dec(GuestStayId.parse)
  export const tryMatch = StreamName.tryMatch(category, decodeId)
}

export namespace Events {
  export type Event =
    /** Notes time of checkin of the guest (does not affect whether charges can be levied against the stay) */
    | { type: "CheckedIn"; data: { at: Date } }
    /** Notes addition of a charge against the stay */
    | { type: "Charged"; data: { chargeId: ChargeId; at: Date; amount: number } }
    /** Notes a payment against this stay */
    | { type: "Paid"; data: { paymentId: PaymentId; at: Date; amount: number } }
    /** Notes an ordinary checkout by the Guest (requires prior payment of all outstanding charges) */
    | { type: "CheckedOut"; data: { at: Date } }

  export const codec: ICodec<Event, string> = {
    tryDecode(ev): Event | undefined {
      const data = JSON.parse(ev.data || "{}")
      switch (ev.type) {
        case "CheckedIn":
          return { type: ev.type, data: { at: new Date(data.at) } }
        case "CheckedOut":
          return { type: ev.type, data: { at: new Date(data.at) } }
        case "Charged":
          return {
            type: ev.type,
            data: { chargeId: data.chargeId, amount: data.amount, at: new Date(data.at) },
          }
        case "Paid":
          return {
            type: ev.type,
            data: { paymentId: data.paymentId, amount: data.amount, at: new Date(data.at) },
          }
      }
    },
    encode(ev) {
      return { type: ev.type, data: JSON.stringify(ev.data) }
    },
  }
}

export namespace Fold {
  import Event = Events.Event
  type Balance = {
    balance: number
    charges: Set<ChargeId>
    payments: Set<PaymentId>
    checkedInAt?: Date
  }
  export type State = { type: "Active"; balance: Balance } | { type: "Closed" }
  export const initial: State = {
    type: "Active",
    balance: { balance: 0, charges: new Set(), payments: new Set() },
  }

  export function evolve(state: State, event: Event): State {
    switch (state.type) {
      case "Active":
        switch (event.type) {
          case "CheckedIn":
            return { type: "Active", balance: { ...state.balance, checkedInAt: event.data.at } }
          case "Charged":
            return {
              type: "Active",
              balance: {
                ...state.balance,
                charges: new Set([...state.balance.charges, event.data.chargeId]),
                balance: state.balance.balance + event.data.amount,
              },
            }
          case "Paid":
            return {
              type: "Active",
              balance: {
                ...state.balance,
                payments: new Set([...state.balance.payments, event.data.paymentId]),
                balance: state.balance.balance - event.data.amount,
              },
            }
          case "CheckedOut":
            return { type: "Closed" }
        }
        break
      case "Closed":
        throw new Error("No events allowed after CheckedOut")
    }
  }

  export const fold = (state: State, events: Event[]) => events.reduce(evolve, state)
}

export namespace Decide {
  import State = Fold.State
  import Event = Events.Event
  export const checkIn =
    (at: Date) =>
    (state: State): Event[] => {
      if (state.type === "Closed") throw new Error("Invalid checkin")
      if (!state.balance.checkedInAt) return [{ type: "CheckedIn", data: { at } }]
      if (+state.balance.checkedInAt === +at) return []
      throw new Error("Invalid checkin")
    }

  export const charge =
    (at: Date, chargeId: ChargeId, amount: number) =>
    (state: State): Event[] => {
      if (state.type === "Closed") throw new Error("Cannot record charge for Closed account")
      if (state.balance.charges.has(chargeId)) return []
      return [{ type: "Charged", data: { chargeId, amount, at } }]
    }

  export const pay =
    (at: Date, paymentId: PaymentId, amount: number) =>
    (state: State): Event[] => {
      if (state.type === "Closed") throw new Error("Cannot record payment for not opened account")
      if (state.balance.payments.has(paymentId)) return []
      return [{ type: "Paid", data: { paymentId, amount, at } }]
    }

  export type CheckoutResult =
    | { type: "OK" }
    | { type: "AlreadyCheckedOut" }
    | { type: "BalanceOutstanding"; amount: number }
  export const checkOut =
    (at: Date) =>
    (state: State): [CheckoutResult, Event[]] => {
      if (state.type === "Closed") return [{ type: "AlreadyCheckedOut" }, []]
      if (state.balance.balance > 0)
        return [{ type: "BalanceOutstanding", amount: state.balance.balance }, []]
      return [{ type: "OK" }, [{ type: "CheckedOut", data: { at } }]]
    }
}

export class Service {
  constructor(
    private readonly resolve: (stayId: GuestStayId) => Decider<Events.Event, Fold.State>,
  ) {}
  charge(stayId: GuestStayId, chargeId: ChargeId, amount: number) {
    const decider = this.resolve(stayId)
    return decider.transact(Decide.charge(new Date(), chargeId, amount))
  }

  pay(stayId: GuestStayId, paymentId: PaymentId, amount: number) {
    const decider = this.resolve(stayId)
    return decider.transact(Decide.pay(new Date(), paymentId, amount))
  }

  checkIn(stayId: GuestStayId) {
    const decider = this.resolve(stayId)
    return decider.transact(Decide.checkIn(new Date()))
  }

  checkOut(stayId: GuestStayId) {
    const decider = this.resolve(stayId)
    return decider.transactResult(Decide.checkOut(new Date()))
  }

  static createMessageDb(context: Mdb.MessageDbContext, caching: ICachingStrategy) {
    // prettier-ignore
    const category = Mdb.MessageDbCategory.create(context, Stream.category, Events.codec, Fold.fold, Fold.initial, caching)
    const resolve = (stayId: GuestStayId) =>
      Decider.forStream(category, Stream.streamId(stayId), null)
    return new Service(resolve)
  }

  static createMem(store: Mem.VolatileStore<string>) {
    // prettier-ignore
    const category = Mem.MemoryStoreCategory.create(store, Stream.category, Events.codec, Fold.fold, Fold.initial)
    const resolve = (stayId: GuestStayId) =>
      Decider.forStream(category, Stream.streamId(stayId), null)
    return new Service(resolve)
  }
}
