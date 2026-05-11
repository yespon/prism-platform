import { notFound } from "next/navigation";

import {
  TenantAdminSettingsPage,
  type TenantSettingsSection,
} from "@/components/tenant-admin/tenant-admin-settings-page";

const VALID_SECTIONS: TenantSettingsSection[] = [
  "appearance",
  "user",
  "notification",
  "memory",
  "about",
];

type TenantSettingsSectionRoutePageProps = {
  params: Promise<{ section: string }>;
};

export default async function TenantSettingsSectionRoutePage({
  params,
}: TenantSettingsSectionRoutePageProps) {
  const { section } = await params;

  if (!VALID_SECTIONS.includes(section as TenantSettingsSection)) {
    notFound();
  }

  return <TenantAdminSettingsPage section={section} />;
}
