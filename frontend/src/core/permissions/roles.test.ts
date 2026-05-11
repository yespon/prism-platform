import { describe, expect, it } from "vitest";

import { canAccessAdminPage, isPlatformAdminRole } from "./roles";

describe("role permissions", () => {
  it("isPlatformAdminRole accepts both admin aliases", () => {
    expect(isPlatformAdminRole("admin")).toBe(true);
    expect(isPlatformAdminRole("platform_admin")).toBe(true);
    expect(isPlatformAdminRole("user")).toBe(false);
    expect(isPlatformAdminRole(undefined)).toBe(false);
  });

  it("canAccessAdminPage follows platform admin role", () => {
    expect(canAccessAdminPage("platform_admin")).toBe(true);
    expect(canAccessAdminPage("admin")).toBe(true);
    expect(canAccessAdminPage("tenant_admin")).toBe(false);
  });
});
