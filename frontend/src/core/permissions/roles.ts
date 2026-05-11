export function isPlatformAdminRole(role?: string | null): boolean {
  return role === "admin" || role === "platform_admin";
}

export function canAccessAdminPage(role?: string | null): boolean {
  return isPlatformAdminRole(role);
}
