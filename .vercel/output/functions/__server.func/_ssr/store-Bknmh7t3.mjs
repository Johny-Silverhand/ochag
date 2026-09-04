import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { M as shiftTotals, b as openShiftFor, g as deductSaleFromStock, m as createSeed, s as TODAY, u as applyMovement, x as payrollForShift, y as needToBuy } from "./seed-C4rObjht.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { C as uid } from "./router-DjPwU5Qt.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/store-Bknmh7t3.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function asSnapshot(value) {
	if (!value || typeof value !== "object") throw new Error("Пустой снимок операций");
	return value;
}
var getOpsStatus = createServerFn({ method: "GET" }).handler(createSsrRpc("2898c98d0ea59d49dc84dd87aea487b8880a5577c10ac877b53332a3c34fab56"));
var loadOpsSnapshot = createServerFn({ method: "GET" }).handler(createSsrRpc("af9235ab17390a7e942c3a53ff84be2703e6aa56593e272fe15dfcda4698df63"));
var saveOpsSnapshot = createServerFn({ method: "POST" }).validator((input) => asSnapshot(input)).handler(createSsrRpc("83392b05222cfb092da4ca48f939f62ed42b9d0cde81a752fce41669b75340c9"));
var resetOpsSnapshot = createServerFn({ method: "POST" }).handler(createSsrRpc("e2453859e9d2be9576663f41de4f95bb9ebda0338ae13171444d6a23b6762ed8"));
var dbAdapter = {
	load: () => loadOpsSnapshot(),
	save: async (snapshot) => {
		await saveOpsSnapshot({ data: snapshot });
	},
	reset: () => resetOpsSnapshot()
};
var useSync = create((set) => ({
	status: "loading",
	source: null,
	updatedAt: null,
	sales: 0,
	error: null,
	setStatus: (status) => set({
		status,
		error: null
	}),
	setMeta: (meta) => set({
		...meta,
		status: "ok",
		error: null
	}),
	setError: (error) => set({
		status: "error",
		error
	})
}));
function writeBranch(s) {
	const id = s.session?.branchId;
	if (!id || id === "all") return s.branches[0]?.id ?? "br-pushkin";
	return id;
}
function snapshotOf(s) {
	return {
		branches: s.branches,
		users: s.users,
		products: s.products,
		recipes: s.recipes,
		stock: s.stock,
		movements: s.movements,
		invoices: s.invoices,
		sales: s.sales,
		shifts: s.shifts,
		requests: s.requests,
		banquets: s.banquets,
		expenses: s.expenses,
		payroll: s.payroll,
		revisions: s.revisions
	};
}
function withSeed() {
	return {
		...createSeed(),
		session: null,
		period: "7d"
	};
}
var applyingRemote = false;
var bootDone = false;
var saveTimer;
var useOps = create()(persist((set, get) => ({
	...withSeed(),
	login: (email, password) => {
		const user = get().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
		if (!user) return false;
		const branchId = user.branchId ?? "all";
		set({ session: {
			userId: user.id,
			branchId
		} });
		return true;
	},
	loginAs: (email) => {
		const user = get().users.find((u) => u.email === email);
		if (!user) return false;
		const branchId = user.branchId ?? "all";
		set({ session: {
			userId: user.id,
			branchId
		} });
		return true;
	},
	logout: () => set({ session: null }),
	setBranch: (branchId) => {
		const session = get().session;
		if (!session) return;
		set({ session: {
			...session,
			branchId
		} });
	},
	setPeriod: (period) => set({ period }),
	resetDemo: async () => {
		useSync.getState().setStatus("saving");
		const session = get().session;
		const snap = await dbAdapter.reset();
		applyingRemote = true;
		set({
			...snap,
			session
		});
		applyingRemote = false;
		useSync.getState().setMeta({
			source: useSync.getState().source ?? "pglite",
			updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
			sales: snap.sales.length
		});
	},
	updateProfile: (patch) => {
		const session = get().session;
		if (!session) return;
		set((s) => ({ users: s.users.map((u) => u.id === session.userId ? {
			...u,
			...patch
		} : u) }));
	},
	addWriteoff: ({ productId, qty, reason, note }) => {
		const { session, products } = get();
		if (!session) return;
		const branchId = writeBranch(get());
		const product = products.find((p) => p.id === productId);
		const q = -Math.abs(qty);
		const mov = {
			id: uid("wo"),
			at: (/* @__PURE__ */ new Date()).toISOString(),
			branchId,
			productId,
			type: "writeoff",
			qty: q,
			cost: Math.abs(q) * (product?.avgCost ?? 0),
			reason,
			note,
			userId: session.userId
		};
		set((s) => ({
			movements: [mov, ...s.movements],
			stock: applyMovement(s.stock, mov)
		}));
	},
	addInvoice: ({ supplier, number, date, lines }) => {
		const { session } = get();
		if (!session) return;
		const branchId = writeBranch(get());
		const total = lines.reduce((sum, l) => sum + l.qty * l.price, 0);
		const inv = {
			id: uid("inv"),
			number,
			branchId,
			supplier,
			date,
			lines,
			total,
			userId: session.userId
		};
		const movs = lines.map((l) => ({
			id: uid("m"),
			at: `${date}T10:00:00.000Z`,
			branchId,
			productId: l.productId,
			type: "receipt",
			qty: l.qty,
			cost: l.qty * l.price,
			refId: inv.id,
			userId: session.userId,
			note: supplier
		}));
		set((s) => {
			let stock = s.stock;
			for (const m of movs) stock = applyMovement(stock, m);
			const productsNext = s.products.map((p) => {
				const line = lines.find((l) => l.productId === p.id);
				if (!line) return p;
				return {
					...p,
					avgCost: Math.round((p.avgCost * .6 + line.price * .4) * 100) / 100
				};
			});
			return {
				invoices: [inv, ...s.invoices],
				movements: [...movs, ...s.movements],
				stock,
				products: productsNext
			};
		});
	},
	createRequestFromNeed: () => {
		const { session } = get();
		if (!session) return;
		const branchId = writeBranch(get());
		const need = needToBuy(snapshotOf(get()), branchId);
		if (need.length === 0) return;
		const lines = need.map((n) => ({
			productId: n.product.id,
			qty: Math.ceil(n.deficit * 10) / 10
		}));
		set((s) => ({ requests: [{
			id: uid("pr"),
			number: `ЗК-${100 + s.requests.length + 1}`,
			branchId,
			date: TODAY,
			status: "draft",
			lines,
			userId: session.userId
		}, ...s.requests] }));
	},
	setRequestStatus: (id, status) => {
		set((s) => ({ requests: s.requests.map((r) => r.id === id ? {
			...r,
			status
		} : r) }));
	},
	openShift: ({ openCash, staffIds }) => {
		const { session, shifts } = get();
		if (!session) return;
		const branchId = writeBranch(get());
		if (openShiftFor(shifts, branchId)) return;
		set((s) => ({ shifts: [{
			id: uid("sh"),
			branchId,
			date: TODAY,
			status: "open",
			openedAt: (/* @__PURE__ */ new Date()).toISOString(),
			openedBy: session.userId,
			openCash,
			cashTotal: 0,
			cardTotal: 0,
			qrTotal: 0,
			staffIds
		}, ...s.shifts] }));
	},
	closeShift: ({ closeCash, note }) => {
		const { session } = get();
		if (!session) return;
		const branchId = writeBranch(get());
		const shift = openShiftFor(get().shifts, branchId);
		if (!shift) return;
		const totals = shiftTotals(shift, get().sales);
		const discrepancy = Math.round(closeCash - totals.expected);
		const pays = payrollForShift(shift, get().sales, get().users);
		set((s) => ({
			shifts: s.shifts.map((sh) => sh.id === shift.id ? {
				...sh,
				status: "closed",
				closedAt: (/* @__PURE__ */ new Date()).toISOString(),
				closedBy: session.userId,
				closeCash,
				expectedCash: totals.expected,
				discrepancy,
				cashTotal: totals.cash,
				cardTotal: totals.card,
				qrTotal: totals.qr,
				note
			} : sh),
			payroll: [...pays.map((p) => ({
				id: uid("pay"),
				userId: p.userId,
				branchId,
				date: TODAY,
				shiftId: shift.id,
				hours: p.hours,
				base: p.base,
				bonus: p.bonus,
				total: p.total
			})), ...s.payroll]
		}));
	},
	addManualSale: (items, payment) => {
		const { session, shifts, sales, recipes, products, stock } = get();
		if (!session) return;
		const branchId = writeBranch(get());
		const shift = openShiftFor(shifts, branchId);
		if (!shift) return;
		const total = items.reduce((sum, i) => sum + i.sum, 0);
		const sale = {
			id: uid("sale"),
			number: `ЧК-${String(1e4 + sales.length + 1).padStart(4, "0")}`,
			branchId,
			shiftId: shift.id,
			at: (/* @__PURE__ */ new Date()).toISOString(),
			items,
			payments: [{
				type: payment,
				amount: total
			}],
			total,
			waiterId: session.userId,
			source: "manual"
		};
		const deducted = deductSaleFromStock(stock, sale, recipes, products, session.userId);
		set((s) => ({
			sales: [sale, ...s.sales],
			stock: deducted.stock,
			movements: [...deducted.movements, ...s.movements]
		}));
	},
	importKeeperSales: (incoming) => {
		const { session, shifts, recipes, products } = get();
		if (!session) return 0;
		const branchId = writeBranch(get());
		const shift = openShiftFor(shifts, branchId);
		if (!shift) return 0;
		let added = 0;
		set((s) => {
			let stock = s.stock;
			const movs = [];
			const newSales = [];
			for (const row of incoming) {
				const sale = {
					...row,
					id: uid("sale"),
					number: `КПР-${String(s.sales.length + added + 1).padStart(4, "0")}`,
					shiftId: shift.id,
					branchId,
					source: "keeper"
				};
				const d = deductSaleFromStock(stock, sale, recipes, products, session.userId);
				stock = d.stock;
				movs.push(...d.movements);
				newSales.push(sale);
				added += 1;
			}
			return {
				sales: [...newSales, ...s.sales],
				stock,
				movements: [...movs, ...s.movements]
			};
		});
		return added;
	},
	upsertBanquet: (b) => {
		set((s) => {
			const i = s.banquets.findIndex((x) => x.id === b.id);
			if (i < 0) return { banquets: [b, ...s.banquets] };
			const next = s.banquets.slice();
			next[i] = b;
			return { banquets: next };
		});
	},
	setBanquetStatus: (id, status) => {
		set((s) => ({ banquets: s.banquets.map((b) => b.id === id ? {
			...b,
			status
		} : b) }));
	},
	completeRevision: (lines, note) => {
		const { session, products } = get();
		if (!session) return;
		const branchId = writeBranch(get());
		const movs = lines.filter((l) => l.factQty !== l.bookQty).map((l) => {
			const p = products.find((x) => x.id === l.productId);
			const qty = l.factQty - l.bookQty;
			return {
				id: uid("rev"),
				at: (/* @__PURE__ */ new Date()).toISOString(),
				branchId,
				productId: l.productId,
				type: "revision",
				qty,
				cost: Math.abs(qty) * (p?.avgCost ?? 0),
				reason: "revision",
				note,
				userId: session.userId
			};
		});
		set((s) => {
			let stock = s.stock;
			for (const m of movs) stock = applyMovement(stock, m);
			return {
				stock,
				movements: [...movs, ...s.movements],
				revisions: [{
					id: uid("r"),
					branchId,
					date: TODAY,
					status: "done",
					lines,
					userId: session.userId,
					note
				}, ...s.revisions]
			};
		});
	}
}), {
	name: "ochag-session-v2",
	version: 2,
	partialize: (s) => ({
		session: s.session,
		period: s.period
	})
}));
if (typeof window !== "undefined") useOps.subscribe((state) => {
	if (!bootDone || applyingRemote || !state.branches.length) return;
	useSync.getState().setStatus("saving");
	window.clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		dbAdapter.save(snapshotOf(state)).then(() => {
			useSync.getState().setMeta({
				source: useSync.getState().source ?? "pglite",
				updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
				sales: state.sales.length
			});
		}).catch((err) => {
			useSync.getState().setError(err instanceof Error ? err.message : "Не удалось записать");
		});
	}, 500);
});
function useHydrated() {
	const [ok, setOk] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		async function boot() {
			const api = useOps.persist;
			if (api && !api.hasHydrated()) await new Promise((resolve) => {
				const unsub = api.onFinishHydration(() => {
					unsub();
					resolve();
				});
			});
			try {
				const snap = await dbAdapter.load();
				if (cancelled) return;
				applyingRemote = true;
				useOps.setState((s) => ({
					...s,
					...snap
				}));
				applyingRemote = false;
				try {
					const meta = await getOpsStatus();
					if (!cancelled) useSync.getState().setMeta({
						source: meta.source,
						updatedAt: meta.updatedAt,
						sales: meta.sales || snap.sales.length
					});
				} catch {
					useSync.getState().setMeta({
						source: "pglite",
						updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
						sales: snap.sales.length
					});
				}
			} catch (err) {
				applyingRemote = false;
				useSync.getState().setError(err instanceof Error ? err.message : "База недоступна");
			} finally {
				bootDone = true;
				if (!cancelled) setOk(true);
			}
		}
		boot();
		return () => {
			cancelled = true;
		};
	}, []);
	return ok;
}
function useSessionUser() {
	return useOps((s) => {
		if (!s.session) return null;
		return s.users.find((u) => u.id === s.session?.userId) ?? null;
	});
}
function useActiveBranch() {
	return useOps((s) => s.branches.find((b) => b.id === s.session?.branchId) ?? s.branches[0]);
}
//#endregion
export { useSessionUser as a, useOps as i, useActiveBranch as n, useSync as o, useHydrated as r, getOpsStatus as t };
