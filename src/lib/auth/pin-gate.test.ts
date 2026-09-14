import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canEnterWithPin,
  canOfferPin,
  markPasswordUnlock,
  pinGateFromState,
  pinOfferAfterPassword,
  setPinEnabled,
  type PinGateState,
} from "./pin-gate.ts";

function blank(): PinGateState {
  return { unlocked: [], enabled: [] };
}

describe("PIN after password", () => {
  it("requires a password (or registration) unlock before PIN re-entry is offered", () => {
    const fresh = blank();
    assert.equal(canOfferPin("maria", fresh), false);
    assert.equal(canEnterWithPin("maria", fresh), false);
    const unlocked = markPasswordUnlock("Maria", fresh);
    assert.equal(canOfferPin("maria", unlocked), true);
    assert.equal(canEnterWithPin("maria", unlocked), false);
  });

  it("enables PIN only after the person opts in on this device", () => {
    const unlocked = markPasswordUnlock("owner", blank());
    const enabled = setPinEnabled("owner", true, unlocked);
    assert.equal(canEnterWithPin("OWNER", enabled), true);
    const off = setPinEnabled("owner", false, enabled);
    assert.equal(canEnterWithPin("owner", off), false);
    assert.equal(canOfferPin("owner", off), true);
  });

  it("does not enable PIN for a login that never passed password on this device", () => {
    const other = setPinEnabled("waiter", true, blank());
    assert.equal(canEnterWithPin("waiter", other), false);
    const gate = pinGateFromState(other);
    assert.equal(gate.canEnterWithPin("waiter"), false);
  });

  it("offers PIN only after the first password (or registration) on the device", () => {
    const first = pinOfferAfterPassword("maria", blank());
    assert.equal(first.offer, true);
    assert.equal(canOfferPin("maria", first.state), true);
    assert.equal(canEnterWithPin("maria", first.state), false);
    const second = pinOfferAfterPassword("maria", first.state);
    assert.equal(second.offer, false);
    const enabled = setPinEnabled("maria", true, first.state);
    assert.equal(pinOfferAfterPassword("maria", enabled).offer, false);
  });
});
