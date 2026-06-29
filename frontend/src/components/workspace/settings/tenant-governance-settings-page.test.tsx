import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TenantGovernanceSettingsPage } from "./tenant-governance-settings-page";

const mocks = vi.hoisted(() => ({
  useCurrentTenant: vi.fn(),
  useTenantMembers: vi.fn(),
  useAddTenantMember: vi.fn(),
  useUpdateTenantMemberRole: vi.fn(),
  useUpdateTenantMemberStatus: vi.fn(),
  useRemoveTenantMember: vi.fn(),
}));

vi.mock("@/core/tenants/hooks", () => ({
  useCurrentTenant: mocks.useCurrentTenant,
  useTenantMembers: mocks.useTenantMembers,
  useAddTenantMember: mocks.useAddTenantMember,
  useUpdateTenantMemberRole: mocks.useUpdateTenantMemberRole,
  useUpdateTenantMemberStatus: mocks.useUpdateTenantMemberStatus,
  useRemoveTenantMember: mocks.useRemoveTenantMember,
}));

describe("TenantGovernanceSettingsPage", () => {
  beforeEach(() => {
    mocks.useAddTenantMember.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mocks.useUpdateTenantMemberRole.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.useUpdateTenantMemberStatus.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.useRemoveTenantMember.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.useTenantMembers.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
  });

  it("hides management table for tenant_member", () => {
    mocks.useCurrentTenant.mockReturnValue({
      data: { tenant_id: "tenant-a", role: "tenant_member" },
    });

    render(<TenantGovernanceSettingsPage />);

    expect(screen.getByText("仅工作空间管理员可访问该页面。")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "添加成员" })).not.toBeInTheDocument();
  });

  it("shows management table for tenant_admin", () => {
    mocks.useCurrentTenant.mockReturnValue({
      data: { tenant_id: "tenant-a", role: "tenant_admin" },
    });
    mocks.useTenantMembers.mockReturnValue({
      data: [
        {
          user_id: "u-1",
          email: "u1@example.com",
          name: "User 1",
          role: "tenant_member",
          status: "active",
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<TenantGovernanceSettingsPage />);

    expect(screen.getByRole("button", { name: "添加成员" })).toBeInTheDocument();
    expect(screen.getByText("成员")).toBeInTheDocument();
    expect(screen.getByText("角色")).toBeInTheDocument();
    expect(screen.getByText("User 1")).toBeInTheDocument();
  });
});
