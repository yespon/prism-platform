"use client";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";

import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceNavChatList } from "./workspace-nav-chat-list";
import { WorkspaceNavMenu } from "./workspace-nav-menu";

export function WorkspaceSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <>
      <Sidebar variant="inset" collapsible="icon" className="w-[240px]" {...props}>
        <SidebarHeader className="px-3 py-3">
          <WorkspaceHeader />
        </SidebarHeader>
        <SidebarContent className="gap-2">
          <WorkspaceNavChatList />
        </SidebarContent>
        <SidebarFooter className="pb-4">
          <WorkspaceNavMenu />
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
