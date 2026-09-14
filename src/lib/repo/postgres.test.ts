import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptySnapshot } from "../data/empty.ts";
import { applyOnboard } from "../domain/onboard.ts";
import { createPostgresRepository, OPS_STATE_ID } from "./postgres.ts";

type Sql = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  <T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
};

function fakeSql(): Sql {
  let row: { payload: string; updated_at: string } | null = null;
  const query = async <T>(text: string, params: unknown[] = []): Promise<T[]> => {
    const sql = text.toLowerCase();
    if (sql.includes("create table")) return [];
    if (sql.includes("select payload")) {
      if (!row || params[0] !== OPS_STATE_ID) return [];
      return [{ payload: JSON.parse(row.payload), updated_at: row.updated_at }] as T[];
    }
    if (sql.includes("insert into ops_state")) {
      row = { payload: String(params[1]), updated_at: String(params[2]) };
      return [];
    }
    throw new Error(`unexpected sql: ${text}`);
  };
  const tagged = (async () => []) as unknown as Sql;
  tagged.query = query;
  return tagged;
}

describe("postgres repository", () => {
  it("persists invite-like user writes across a new repository instance", async () => {
    const shared = fakeSql();
    const a = createPostgresRepository("neon", async () => shared);
    const first = emptySnapshot();
    first.users = [
      {
        id: "u-tech",
        name: "Техник",
        email: "admin",
        password: "secret",
        pin: "9999",
        role: "tech_admin",
        position: "Администратор-техник",
        branchId: null,
        shiftPay: 0,
        salesPercent: 0,
        phone: "",
      },
    ];
    first.branches = [
      {
        id: "br-1",
        name: "Филиал 1",
        short: "Филиал",
        city: "—",
        address: "—",
        seats: 40,
        phone: "",
      },
    ];
    await a.save(first);

    const b = createPostgresRepository("neon", async () => shared);
    const loaded = await b.load();
    assert.equal(loaded.users.length, 1);
    assert.equal(loaded.users[0]?.email, "admin");
    assert.equal(loaded.users[0]?.password, "secret");
    assert.equal(loaded.users[0]?.pin, "9999");

    loaded.users.push({
      id: "u-owner",
      name: "Кирилл",
      email: "owner",
      password: "ochag",
      pin: "1001",
      role: "owner",
      position: "Собственник",
      branchId: null,
      shiftPay: 0,
      salesPercent: 0,
      phone: "",
      disabled: false,
    });
    await b.save(loaded);

    const c = createPostgresRepository("neon", async () => shared);
    const again = await c.load();
    assert.equal(again.users.length, 2);
    assert.equal(again.users.find((u) => u.email === "owner")?.password, "ochag");
  });

  it("persists two commercial onboards without dropping the technician", async () => {
    const shared = fakeSql();
    const repo = createPostgresRepository("neon", async () => shared);
    const start = emptySnapshot();
    start.users = [
      {
        id: "u-tech",
        name: "Техник",
        email: "admin",
        password: "secret",
        pin: "9999",
        role: "tech_admin",
        position: "Администратор-техник",
        branchId: null,
        shiftPay: 0,
        salesPercent: 0,
        phone: "",
      },
    ];
    await repo.save(start);
    const first = applyOnboard(await repo.load(), {
      ownerName: "Мария",
      login: "maria",
      password: "cafe",
      pin: "2002",
      branchName: "Центр",
      city: "Краснодар",
      address: "ул. Красная, 1",
    });
    await repo.save(first);
    const second = applyOnboard(await repo.load(), {
      ownerName: "Иван",
      login: "ivan",
      password: "bistro",
      pin: "4004",
      branchName: "Юг",
      city: "Сочи",
      address: "Набережная, 2",
    });
    await repo.save(second);

    const other = createPostgresRepository("neon", async () => shared);
    const loaded = await other.load();
    assert.equal(loaded.users.filter((u) => u.role === "tech_admin").length, 1);
    assert.equal(loaded.users.find((u) => u.email === "admin")?.password, "secret");
    assert.ok(loaded.users.some((u) => u.email === "maria"));
    assert.ok(loaded.users.some((u) => u.email === "ivan"));

    await repo.save({
      ...loaded,
      users: loaded.users.slice(0, 1).map((u) => ({ ...u, password: "", pin: "" })),
    });
    const afterPut = await other.load();
    assert.ok(afterPut.users.some((u) => u.email === "admin" && u.role === "tech_admin"));
    assert.ok(afterPut.users.some((u) => u.email === "maria"));
    assert.ok(afterPut.users.some((u) => u.email === "ivan"));
  });

  it("reports ready:false when the database probe fails", async () => {
    const query = async () => {
      throw Object.assign(new Error("connect ETIMEDOUT"), { code: "ETIMEDOUT" });
    };
    const tagged = (async () => []) as unknown as Sql;
    tagged.query = query;
    const repo = createPostgresRepository("neon", async () => tagged);
    const status = await repo.status();
    assert.equal(status.ready, false);
    assert.equal(status.source, "neon");
  });

  it("does not let a blank public snapshot wipe stored secrets", async () => {
    const shared = fakeSql();
    const repo = createPostgresRepository("neon", async () => shared);
    const snap = emptySnapshot();
    snap.users = [
      {
        id: "u-1",
        name: "Анна",
        email: "manager",
        password: "keep-me",
        pin: "2001",
        role: "manager",
        position: "Управляющий",
        branchId: "br-1",
        shiftPay: 0,
        salesPercent: 0,
        phone: "",
      },
    ];
    await repo.save(snap);
    await repo.save({
      ...snap,
      users: [{ ...snap.users[0]!, password: "", pin: "" }],
    });
    const loaded = await repo.load();
    assert.equal(loaded.users[0]?.password, "keep-me");
    assert.equal(loaded.users[0]?.pin, "2001");
  });
});
