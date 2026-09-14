import { AuthzError } from "../authz/error.ts";
import type { Snapshot } from "./types.ts";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export type OnboardInput = {
  ownerName: string;
  login: string;
  password: string;
  pin: string;
  branchName: string;
  city: string;
  address: string;
};

/**
 * First owner on an empty store, or another owner when technicians exist.
 * Never deletes tech_admin, other owners, or staff. Appends the first branch.
 * Billing flags stay on the single snapshot (global for now).
 */
export function applyOnboard(snap: Snapshot, input: OnboardInput): Snapshot {
  const techs = snap.users.filter((u) => u.role === "tech_admin");
  const others = snap.users.filter((u) => u.role !== "tech_admin");
  // Without a technician the single store already belongs to the first owner.
  // With technicians, each «Создать сеть» adds another owner + first branch.
  if (others.length > 0 && techs.length === 0) throw new AuthzError("Сеть уже создана", 400);
  const login = input.login.trim().toLowerCase();
  if (snap.users.some((u) => u.email.trim().toLowerCase() === login)) {
    throw new AuthzError("Этот логин уже занят", 400);
  }
  if (!login || input.password.length < 4 || !/^\d{4}$/.test(input.pin)) {
    throw new AuthzError("Логин, пароль (от 4 знаков) и PIN из 4 цифр обязательны", 400);
  }
  const branchId = uid("br");
  const userId = uid("u");
  const branchName = input.branchName.trim() || "Филиал 1";
  return {
    ...snap,
    branches: [
      ...snap.branches,
      {
        id: branchId,
        name: branchName,
        short: branchName.slice(0, 16),
        city: input.city.trim() || "—",
        address: input.address.trim() || "—",
        seats: 40,
        phone: "",
      },
    ],
    users: [
      ...snap.users,
      {
        id: userId,
        name: input.ownerName.trim() || "Владелец",
        email: login,
        password: input.password,
        pin: input.pin,
        role: "owner",
        position: "Собственник",
        branchId,
        shiftPay: 0,
        salesPercent: 0,
        phone: "",
        disabled: false,
      },
    ],
  };
}
