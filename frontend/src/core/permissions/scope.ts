export function isTenantAdminRole(role?: string | null): boolean {
  return (role ?? "").toLowerCase() === "tenant_admin";
}

export function canManageScopedResource(
  scope: string | undefined,
  managedByCurrentUser: boolean | undefined,
): boolean {
  return scope !== "global" && managedByCurrentUser === true;
}

export function scopeLabel(scope: string | undefined): string {
  if (scope === "global") return "平台内置";
  if (scope === "tenant") return "工作空间共享";
  if (scope === "user") return "个人私有";
  return scope ?? "未知";
}
