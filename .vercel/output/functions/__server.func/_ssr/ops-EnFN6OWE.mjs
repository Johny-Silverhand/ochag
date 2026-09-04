import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ops-EnFN6OWE.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var OPS_ID = "ochag";
function asSnapshot(value) {
	if (!value || typeof value !== "object") throw new Error("Пустой снимок операций");
	return value;
}
var getOpsStatus_createServerFn_handler = createServerRpc({
	id: "2898c98d0ea59d49dc84dd87aea487b8880a5577c10ac877b53332a3c34fab56",
	name: "getOpsStatus",
	filename: "src/lib/data/ops.ts"
}, (opts) => getOpsStatus.__executeServer(opts));
var getOpsStatus = createServerFn({ method: "GET" }).handler(getOpsStatus_createServerFn_handler, async () => {
	const { getSql, dbSource } = await import("./db-DwlwtukQ.mjs");
	const row = (await (await getSql())`
      select updated_at,
        coalesce(jsonb_array_length(payload->'sales'), 0)::int as n_sales
      from ops_state
      where id = ${OPS_ID}
    `)[0];
	return {
		source: dbSource,
		ready: Boolean(row),
		updatedAt: row?.updated_at ?? null,
		sales: row?.n_sales ?? 0
	};
});
var loadOpsSnapshot_createServerFn_handler = createServerRpc({
	id: "af9235ab17390a7e942c3a53ff84be2703e6aa56593e272fe15dfcda4698df63",
	name: "loadOpsSnapshot",
	filename: "src/lib/data/ops.ts"
}, (opts) => loadOpsSnapshot.__executeServer(opts));
var loadOpsSnapshot = createServerFn({ method: "GET" }).handler(loadOpsSnapshot_createServerFn_handler, async () => {
	const { getSql } = await import("./db-DwlwtukQ.mjs");
	const { createSeed } = await import("./seed-C4rObjht.mjs").then((n) => n.j).then((n) => n.r);
	const sql = await getSql();
	const rows = await sql`
    select payload from ops_state where id = ${OPS_ID}
  `;
	if (rows[0]?.payload) return asSnapshot(rows[0].payload);
	const seed = createSeed();
	await sql.query("insert into ops_state (id, payload, updated_at) values ($1, $2::jsonb, now())", [OPS_ID, JSON.stringify(seed)]);
	return seed;
});
var saveOpsSnapshot_createServerFn_handler = createServerRpc({
	id: "83392b05222cfb092da4ca48f939f62ed42b9d0cde81a752fce41669b75340c9",
	name: "saveOpsSnapshot",
	filename: "src/lib/data/ops.ts"
}, (opts) => saveOpsSnapshot.__executeServer(opts));
var saveOpsSnapshot = createServerFn({ method: "POST" }).validator((input) => asSnapshot(input)).handler(saveOpsSnapshot_createServerFn_handler, async ({ data }) => {
	const { getSql } = await import("./db-DwlwtukQ.mjs");
	await (await getSql()).query(`insert into ops_state (id, payload, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (id) do update set payload = excluded.payload, updated_at = now()`, [OPS_ID, JSON.stringify(data)]);
	return {
		ok: true,
		at: (/* @__PURE__ */ new Date()).toISOString()
	};
});
var resetOpsSnapshot_createServerFn_handler = createServerRpc({
	id: "e2453859e9d2be9576663f41de4f95bb9ebda0338ae13171444d6a23b6762ed8",
	name: "resetOpsSnapshot",
	filename: "src/lib/data/ops.ts"
}, (opts) => resetOpsSnapshot.__executeServer(opts));
var resetOpsSnapshot = createServerFn({ method: "POST" }).handler(resetOpsSnapshot_createServerFn_handler, async () => {
	const { getSql } = await import("./db-DwlwtukQ.mjs");
	const { createSeed } = await import("./seed-C4rObjht.mjs").then((n) => n.j).then((n) => n.r);
	const sql = await getSql();
	const seed = createSeed();
	await sql.query(`insert into ops_state (id, payload, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (id) do update set payload = excluded.payload, updated_at = now()`, [OPS_ID, JSON.stringify(seed)]);
	return seed;
});
//#endregion
export { getOpsStatus_createServerFn_handler, loadOpsSnapshot_createServerFn_handler, resetOpsSnapshot_createServerFn_handler, saveOpsSnapshot_createServerFn_handler };
