import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptySnapshot } from "./empty.ts";
import { preserveTechAdmins, protectStoredUsers } from "./preserve-users.ts";

function tech() {
  return {
    id: "u-tech",
    name: "Виктор",
    email: "admin",
    password: "secret",
    pin: "0001",
    role: "tech_admin" as const,
    position: "Администратор-техник",
    branchId: null,
    shiftPay: 0,
    salesPercent: 0,
    phone: "",
  };
}

function owner(id: string, email: string) {
  return {
    id,
    name: email,
    email,
    password: "cafe",
    pin: "2002",
    role: "owner" as const,
    position: "Собственник",
    branchId: null,
    shiftPay: 0,
    salesPercent: 0,
    phone: "",
  };
}

describe("preserveTechAdmins", () => {
  it("puts dropped technicians back, including secrets", () => {
    const prev = emptySnapshot();
    prev.users = [tech(), owner("u-1", "maria")];
    const next = emptySnapshot();
    next.users = [owner("u-1", "maria")];
    const out = preserveTechAdmins(prev, next);
    assert.equal(out.users.length, 2);
    assert.equal(out.users[0]?.role, "tech_admin");
    assert.equal(out.users[0]?.password, "secret");
    assert.equal(out.users[0]?.pin, "0001");
  });
});

describe("protectStoredUsers", () => {
  it("does not let a smaller public snapshot drop an owner", () => {
    const prev = emptySnapshot();
    prev.users = [tech(), owner("u-1", "maria"), owner("u-2", "ivan")];
    const next = emptySnapshot();
    next.users = [
      { ...tech(), password: "", pin: "" },
      { ...owner("u-1", "maria"), password: "", pin: "" },
    ];
    const out = protectStoredUsers(prev, next);
    assert.equal(out.users.length, 3);
    assert.ok(out.users.some((u) => u.email === "ivan" && u.password === "cafe"));
  });

  it("on empty reset keeps only technicians", () => {
    const prev = emptySnapshot();
    prev.users = [tech(), owner("u-1", "maria")];
    const out = protectStoredUsers(prev, emptySnapshot());
    assert.equal(out.users.length, 1);
    assert.equal(out.users[0]?.role, "tech_admin");
    assert.equal(out.users[0]?.password, "secret");
  });
});
