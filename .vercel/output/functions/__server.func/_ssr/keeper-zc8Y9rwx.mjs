//#region node_modules/.nitro/vite/services/ssr/assets/keeper-zc8Y9rwx.js
var defaultKeeperConfig = {
	baseUrl: "https://keeper.local/api",
	terminalId: "POS-01",
	enabled: false
};
function demoKeeperZReport() {
	return [{
		number: "K-9001",
		datetime: (/* @__PURE__ */ new Date()).toISOString(),
		sum: 1380,
		payType: "card",
		items: [{
			name: "Шашлык из свинины",
			qty: 2,
			sum: 1380
		}]
	}, {
		number: "K-9002",
		datetime: (/* @__PURE__ */ new Date()).toISOString(),
		sum: 860,
		payType: "cash",
		items: [
			{
				name: "Курица на гриле",
				qty: 1,
				sum: 490
			},
			{
				name: "Салат свежий",
				qty: 1,
				sum: 250
			},
			{
				name: "Лаваш",
				qty: 1,
				sum: 70
			},
			{
				name: "Газировка 0.5",
				qty: 1,
				sum: 50
			}
		]
	}];
}
function mapKeeperReceipts(receipts, recipes, waiterId) {
	return receipts.map((r) => {
		const items = r.items.map((line) => {
			const recipe = recipes.find((x) => x.name.toLowerCase() === line.name.toLowerCase());
			return {
				recipeId: recipe?.id ?? "rcp-pork",
				name: line.name,
				qty: line.qty,
				price: recipe?.price ?? Math.round(line.sum / line.qty),
				sum: line.sum
			};
		});
		const pay = r.payType;
		return {
			at: r.datetime,
			items,
			payments: [{
				type: pay,
				amount: r.sum
			}],
			total: r.sum,
			waiterId,
			source: "keeper"
		};
	});
}
//#endregion
export { demoKeeperZReport as n, mapKeeperReceipts as r, defaultKeeperConfig as t };
