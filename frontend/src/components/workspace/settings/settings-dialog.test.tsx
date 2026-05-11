import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SettingsDialog } from "./settings-dialog";

const mocks = vi.hoisted(() => ({
  useI18n: vi.fn(),
}));

vi.mock("@/core/i18n/hooks", () => ({
  useI18n: mocks.useI18n,
}));

vi.mock("@/components/workspace/settings/about-settings-page", () => ({ AboutSettingsPage: () => <div>about</div> }));
vi.mock("@/components/workspace/settings/appearance-settings-page", () => ({ AppearanceSettingsPage: () => <div>appearance</div> }));
vi.mock("@/components/workspace/settings/memory-settings-page", () => ({ MemorySettingsPage: () => <div>memory</div> }));
vi.mock("@/components/workspace/settings/model-lifecycle-settings-page", () => ({ ModelLifecycleSettingsPage: () => <div>model-lifecycle</div> }));
vi.mock("@/components/workspace/settings/notification-settings-page", () => ({ NotificationSettingsPage: () => <div>notification</div> }));
vi.mock("@/components/workspace/settings/skill-settings-page", () => ({ SkillSettingsPage: () => <div>skills</div> }));
vi.mock("@/components/workspace/settings/tool-settings-page", () => ({ ToolSettingsPage: () => <div>tools</div> }));
vi.mock("@/components/workspace/settings/user-settings-page", () => ({ UserSettingsPage: () => <div>user</div> }));

describe("SettingsDialog sections", () => {
  const i18nPayload = {
    settings: {
      title: "设置",
      description: "desc",
      sections: {
        appearance: "外观",
        user: "用户",
        modelLifecycle: "模型",
        notification: "通知",
        memory: "记忆",
        tools: "工具",
        skills: "技能",
        about: "关于",
      },
    },
  };

  it("does not show tenant admin sections", () => {
    mocks.useI18n.mockReturnValue({ t: i18nPayload });

    render(<SettingsDialog open onOpenChange={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "租户治理" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "租户业务审计" })).not.toBeInTheDocument();
  });

  it("shows model, tools and skills in personal settings", () => {
    mocks.useI18n.mockReturnValue({ t: i18nPayload });

    render(<SettingsDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "模型" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "工具" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "技能" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "关于" })).not.toBeInTheDocument();
  });
});
