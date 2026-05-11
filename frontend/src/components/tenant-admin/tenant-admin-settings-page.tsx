"use client";

import { AboutSettingsPage } from "@/components/workspace/settings/about-settings-page";
import { AppearanceSettingsPage } from "@/components/workspace/settings/appearance-settings-page";
import { MemorySettingsPage } from "@/components/workspace/settings/memory-settings-page";
import { NotificationSettingsPage } from "@/components/workspace/settings/notification-settings-page";
import { UserSettingsPage } from "@/components/workspace/settings/user-settings-page";
import { useI18n } from "@/core/i18n/hooks";

export type TenantSettingsSection =
  | "appearance"
  | "user"
  | "notification"
  | "memory"
  | "about";

type TenantAdminSettingsPageProps = {
  section: string;
};

export function TenantAdminSettingsPage({ section }: TenantAdminSettingsPageProps) {
  const { t } = useI18n();
  const activeSection = section as TenantSettingsSection;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{t.tenantAdmin.settings.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.tenantAdmin.settings.description}
        </p>
      </div>

      <div className="rounded-lg border p-6">
        <div className="space-y-8">
          {activeSection === "appearance" && <AppearanceSettingsPage />}
          {activeSection === "user" && <UserSettingsPage />}
          {activeSection === "memory" && <MemorySettingsPage />}
          {activeSection === "notification" && <NotificationSettingsPage />}
          {activeSection === "about" && <AboutSettingsPage />}
        </div>
      </div>
    </div>
  );
}
