import { redirect } from "next/navigation";

import { TenantAdminGuard } from "@/components/tenant-admin/tenant-admin-guard";
import { TenantAdminShell } from "@/components/tenant-admin/tenant-admin-shell";
import { getSession } from "@/core/auth/server-session";

export default async function TenantAdminLayout({
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

  return (
    <TenantAdminGuard>
      <TenantAdminShell>{children}</TenantAdminShell>
    </TenantAdminGuard>
  );
}
