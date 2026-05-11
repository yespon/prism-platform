import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TenantAdminShell } from "./tenant-admin-shell";

const mocks = vi.hoisted(() => ({
  usePathname: vi.fn(),
  useCurrentTenant: vi.fn(),
  useTenantList: vi.fn(),
  useSwitchTenant: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: mocks.usePathname,
}));

vi.mock("@/core/tenants", () => ({
  useCurrentTenant: mocks.useCurrentTenant,
  useTenantList: mocks.useTenantList,
  useSwitchTenant: mocks.useSwitchTenant,
}));

describe("TenantAdminShell", () => {
  it("renders tenant admin navigation and content", () => {
    mocks.usePathname.mockReturnValue("/tenant-admin/members");
    mocks.useCurrentTenant.mockReturnValue({ data: { tenant_id: "tenant-a" } });
    mocks.useTenantList.mockReturnValue({
      data: [
        { id: "tenant-a", name: "Tenant A" },
        { id: "tenant-b", name: "Tenant B" },
      ],
    });
    mocks.useSwitchTenant.mockReturnValue({ mutate: vi.fn(), isPending: false });

    render(
      <TenantAdminShell>
        <div>members content</div>
      </TenantAdminShell>,
    );

    expect(screen.getByText("管理控制台")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "切换租户" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "用户管理" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "共享 Agent" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "告警规则" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "工作流" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "个人设置" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "外观" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "进入业务工作台" })).toHaveAttribute(
      "href",
      "/workspace/chats",
    );
    expect(screen.getByText("members content")).toBeInTheDocument();
  });
});
