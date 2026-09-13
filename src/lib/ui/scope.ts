export function isWriteScope(branchId: string | undefined | null): branchId is string {
  return Boolean(branchId && branchId !== "all");
}

export const WRITE_SCOPE_HINT = "Выберите филиал в шапке — запись по всей сети запрещена.";
