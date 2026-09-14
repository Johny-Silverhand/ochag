import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthzError } from "../authz/error.ts";
import { emptySnapshot } from "../data/empty.ts";
import { protectStoredUsers } from "../data/preserve-users.ts";
import { retainSecrets } from "../data/secrets.ts";
import { adminVisibleUsers } from "./permissions.ts";
import { applyOnboard } from "./onboard.ts";

function techSnap() {
  const snap = emptySnapshot();
  snap.users = [
    {
      id: "u-tech",
      name: "Виктор",
      email: "admin",
      password: "secret",
      pin: "0001",
      role: "tech_admin",
      position: "Администратор-техник",
      branchId: null,
      shiftPay: 0,
      salesPercent: 0,
      phone: "",
    },
  ];
  return snap;
}

const maria = {
  ownerName: "Мария",
  login: "maria",
  password: "cafe",
  pin: "2002",
  branchName: "Центр",
  city: "Краснодар",
  address: "ул. Красная, 1",
};

const ivan = {
  ownerName: "Иван",
  login: "ivan",
  password: "bistro",
  pin: "4004",
  branchName: "Юг",
  city: "Сочи",
  address: "Набережная, 2",
};

describe("commercial onboard", () => {
  it("keeps an existing technician when the owner network is created", () => {
    const next = applyOnboard(techSnap(), maria);
    assert.equal(next.users.length, 2);
    assert.equal(next.users[0]?.email, "admin");
    assert.equal(next.users[0]?.password, "secret");
    assert.equal(next.users[0]?.pin, "0001");
    assert.equal(next.users.find((u) => u.role === "owner")?.email, "maria");
  });

  it("adds a second owner instead of replacing the store", () => {
    const first = applyOnboard(techSnap(), maria);
    const withStaff = {
      ...first,
      users: [
        ...first.users,
        {
          id: "u-wait",
          name: "Анна",
          email: "anna",
          password: "hall",
          pin: "3003",
          role: "waiter" as const,
          position: "Официант",
          branchId: first.branches.find((b) => b.name === "Центр")!.id,
          shiftPay: 0,
          salesPercent: 0,
          phone: "",
        },
      ],
    };
    const second = applyOnboard(withStaff, ivan);
    assert.equal(second.users.find((u) => u.email === "admin")?.role, "tech_admin");
    assert.equal(second.users.find((u) => u.email === "admin")?.password, "secret");
    assert.ok(second.users.some((u) => u.email === "maria"));
    assert.ok(second.users.some((u) => u.email === "ivan"));
    assert.ok(second.users.some((u) => u.email === "anna"));
    assert.equal(second.users.filter((u) => u.role === "owner").length, 2);
    assert.ok(second.branches.some((b) => b.name === "Центр"));
    assert.ok(second.branches.some((b) => b.name === "Юг"));
  });

  it("lets tech_admin see both self-registered owners", () => {
    const second = applyOnboard(applyOnboard(techSnap(), maria), ivan);
    const visible = adminVisibleUsers(
      { role: "tech_admin", userId: "u-tech", homeBranchId: null, sessionBranchId: "all" },
      second.users,
    );
    assert.deepEqual(visible.map((u) => u.email).sort(), ["admin", "ivan", "maria"]);
  });

  it("persists both owners if a smaller public snapshot is saved afterwards", () => {
    const live = applyOnboard(applyOnboard(techSnap(), maria), ivan);
    const publicDump = {
      ...live,
      users: live.users.slice(0, 1).map((u) => ({ ...u, password: "", pin: "" })),
    };
    const stored = retainSecrets(live, protectStoredUsers(live, publicDump));
    assert.equal(stored.users.find((u) => u.email === "admin")?.password, "secret");
    assert.ok(stored.users.some((u) => u.email === "maria"));
    assert.ok(stored.users.some((u) => u.email === "ivan"));
  });

  it("writes seats and halls onto the first branch", () => {
    const next = applyOnboard(emptySnapshot(), {
      ...maria,
      seats: 56,
      halls: ["Основной зал", "Веранда"],
    });
    const branch = next.branches.find((b) => b.name === "Центр");
    assert.equal(branch?.seats, 56);
    assert.deepEqual(branch?.halls, ["Основной зал", "Веранда"]);
  });
});
