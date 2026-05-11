"use client";

import {
  ActivityIcon,
  BellIcon,
  BrainCircuitIcon,
  BuildingIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { BackofficeShellLayout } from "@/components/backoffice/backoffice-shell-layout";
import { useSession } from "@/core/auth/hooks";
import { useI18n } from "@/core/i18n/hooks";
import { canAccessAdminPage } from "@/core/permissions/roles";

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { t } = useI18n();
  const router = useRouter();
  const { data: session, isLoading } = useSession();
  const isPlatformAdmin = canAccessAdminPage(session?.user?.role);

  useEffect(() => {
    if (!isLoading && !isPlatformAdmin) {
      router.push("/workspace");
    }
  }, [isLoading, isPlatformAdmin, router]);

  if (isLoading || !isPlatformAdmin) {
    return null;
  }

  const navItems = [
    { label: t.admin.nav.overview, href: "/admin", icon: ShieldCheckIcon },
    { label: t.admin.nav.users, href: "/admin/users", icon: UsersIcon },
    { label: t.admin.nav.tenants, href: "/admin/tenants", icon: BuildingIcon },
    { label: t.admin.nav.models, href: "/admin/models", icon: BrainCircuitIcon },
    { label: t.admin.nav.announcements, href: "/admin/announcements", icon: BellIcon },
    { label: t.admin.nav.audit, href: "/admin/audit", icon: ActivityIcon },
  ];

  return (
    <BackofficeShellLayout
      moduleTitle={t.admin.nav.moduleTitle}
      moduleDescription={t.admin.nav.moduleDescription}
      moduleIcon={ShieldCheckIcon}
      navItems={navItems}
    >
      {children}
    </BackofficeShellLayout>
  );
}
