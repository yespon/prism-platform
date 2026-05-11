import { render, screen } from "@testing-library/react";
import { ShieldCheck } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { BackofficeShellLayout } from "./backoffice-shell-layout";

const mocks = vi.hoisted(() => ({
  usePathname: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: mocks.usePathname,
}));

describe("BackofficeShellLayout", () => {
  it("renders unified sidebar width and main container classes", () => {
    mocks.usePathname.mockReturnValue("/admin");

    const navItems = [
      { href: "/admin", label: "总览", icon: ShieldCheck },
      { href: "/admin/users", label: "用户管理", icon: ShieldCheck },
    ];

    render(
      <BackofficeShellLayout
        moduleTitle="平台管理"
        moduleDescription="平台级治理"
        moduleIcon={ShieldCheck}
        navItems={navItems}
        bottomItems={[{ href: "/admin/security", label: "安全与设置", icon: ShieldCheck }]}
      >
        <div>content</div>
      </BackofficeShellLayout>,
    );

    expect(screen.getByText("系统治理中心")).toBeInTheDocument();
    expect(screen.getByText("平台级治理")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "总览" })).toBeInTheDocument();

    const sidebar = screen.getByText("系统治理中心").closest("aside");
    expect(sidebar).toHaveClass("w-[240px]");

    const content = screen.getByText("content");
    const maxWidthContainer = content.closest("div.max-w-7xl");
    expect(maxWidthContainer).toBeTruthy();
  });
});
