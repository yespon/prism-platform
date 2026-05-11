import { redirect } from "next/navigation";

import { WorkspaceLayoutClient } from "@/components/workspace/workspace-layout-client";
import { getSession } from "@/core/auth/server-session";

export default async function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();

  if (!session?.session || !session.user) {
    redirect("/sign-in");
  }

  if (session.user.role === "admin" && session.user.mustChangePassword) {
    redirect("/change-password");
  }

  if (session.user.role === "admin") {
    redirect("/admin");
  }

  return <WorkspaceLayoutClient>{children}</WorkspaceLayoutClient>;
}
