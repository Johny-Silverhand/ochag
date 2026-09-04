//#region node_modules/.nitro/vite/services/ssr/assets/permissions-DdHKqKg8.js
var ALL = [
	"owner",
	"manager",
	"cook",
	"waiter"
];
var MODULE_ROLES = {
	dashboard: ALL,
	sales: ALL,
	inventory: [
		"owner",
		"manager",
		"cook"
	],
	recipes: [
		"owner",
		"manager",
		"cook"
	],
	shifts: ALL,
	procurement: ["owner", "manager"],
	banquets: ALL,
	staff: ["owner", "manager"],
	reports: ["owner", "manager"],
	integrations: ["owner"],
	settings: ALL
};
function can(role, module) {
	return MODULE_ROLES[module].includes(role);
}
function canWriteoff(role) {
	return role === "owner" || role === "manager" || role === "cook";
}
function canEditBanquet(role) {
	return role === "owner" || role === "manager";
}
function canSeeAllBranches(role) {
	return role === "owner";
}
function canImportKeeper(role) {
	return role === "owner" || role === "manager";
}
function canCreateSale(role) {
	return role === "owner" || role === "manager" || role === "waiter";
}
function canResetDemo(role) {
	return role === "owner" || role === "manager";
}
//#endregion
export { canResetDemo as a, canImportKeeper as i, canCreateSale as n, canSeeAllBranches as o, canEditBanquet as r, canWriteoff as s, can as t };
