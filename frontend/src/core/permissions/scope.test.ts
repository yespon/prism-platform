import { describe, expect, it } from "vitest";

import {
  canManageScopedResource,
  isTenantAdminRole,
  scopeLabel,
} from "./scope";

describe("scope permissions", () => {
  it("isTenantAdminRole only accepts tenant_admin", () => {
    expect(isTenantAdminRole("tenant_admin")).toBe(true);
    expect(isTenantAdminRole("tenant_member")).toBe(false);
    expect(isTenantAdminRole("admin")).toBe(false);
    expect(isTenantAdminRole(undefined)).toBe(false);
  });

  it("canManageScopedResource respects global protection and ownership", () => {
    expect(canManageScopedResource("user", true)).toBe(true);
    expect(canManageScopedResource("tenant", true)).toBe(true);
    expect(canManageScopedResource("global", true)).toBe(false);
    expect(canManageScopedResource("user", false)).toBe(false);
  });

  it("scopeLabel maps known scopes", () => {
    expect(scopeLabel("global")).toBe("平台内置");
    expect(scopeLabel("tenant")).toBe("租户共享");
    expect(scopeLabel("user")).toBe("个人私有");
  });
});
