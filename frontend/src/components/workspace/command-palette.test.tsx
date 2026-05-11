import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CommandPalette } from "./command-palette";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/core/i18n/hooks", () => ({
  useI18n: () => ({
    t: {
      shortcuts: {
        searchActions: "搜索动作",
        noResults: "无结果",
        actions: "动作",
        keyboardShortcuts: "快捷键",
        keyboardShortcutsDescription: "desc",
        openCommandPalette: "打开命令面板",
        toggleSidebar: "切换侧边栏",
      },
      sidebar: {
        newChat: "新建对话",
      },
      common: {
        settings: "设置",
      },
    },
  }),
}));

vi.mock("@/hooks/use-global-shortcuts", () => ({
  useGlobalShortcuts: vi.fn(),
}));

vi.mock("./settings", () => ({
  SettingsDialog: () => null,
}));

vi.mock("@/components/ui/command", () => ({
  CommandDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandInput: () => <input aria-label="command-input" />,
  CommandList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandItem: ({ children, onSelect }: { children: React.ReactNode; onSelect?: () => void }) => (
    <button type="button" onClick={() => onSelect?.()}>
      {children}
    </button>
  ),
  CommandShortcut: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("CommandPalette", () => {
  it("navigates to valid chats route when creating new chat", async () => {
    render(<CommandPalette />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /新建对话/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /新建对话/i }));
    expect(mocks.push).toHaveBeenCalledWith("/workspace/chats/new");
  });
});
