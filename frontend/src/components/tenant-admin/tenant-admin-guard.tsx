"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useI18n } from "@/core/i18n/hooks";
import { isTenantAdminRole } from "@/core/permissions/scope";
import { useCurrentTenant } from "@/core/tenants/hooks";

export function TenantAdminGuard({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const { t } = useI18n();
  const { data, isLoading, isError } = useCurrentTenant();

  useEffect(() => {
    if (isLoading) return;
    if (isError || !isTenantAdminRole(data?.role)) {
      router.replace("/workspace/chats");
    }
  }, [data?.role, isError, isLoading, router]);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">{t.tenantAdmin.guard.loading}</div>;
  }

  if (isError || !isTenantAdminRole(data?.role)) {
    return null;
  }

  return <>{children}</>;
}
