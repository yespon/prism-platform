"use client";

import {
  BellIcon,
  BrainIcon,
  BoxesIcon,
  CpuIcon,
  WrenchIcon,
  PaletteIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppearanceSettingsPage } from "@/components/workspace/settings/appearance-settings-page";
import { MemorySettingsPage } from "@/components/workspace/settings/memory-settings-page";
import { ModelLifecycleSettingsPage } from "@/components/workspace/settings/model-lifecycle-settings-page";
import { NotificationSettingsPage } from "@/components/workspace/settings/notification-settings-page";
import { SkillSettingsPage } from "@/components/workspace/settings/skill-settings-page";
import { ToolSettingsPage } from "@/components/workspace/settings/tool-settings-page";
import { useI18n } from "@/core/i18n/hooks";
import { cn } from "@/lib/utils";

type SettingsSection =
  | "appearance"
  | "modelLifecycle"
  | "memory"
  | "notification"
  | "tools"
  | "skills";

type SettingsDialogProps = React.ComponentProps<typeof Dialog> & {
  defaultSection?: SettingsSection;
};

export function SettingsDialog(props: SettingsDialogProps) {
  const { defaultSection = "appearance", ...dialogProps } = props;
  const { t } = useI18n();
  const [activeSection, setActiveSection] =
    useState<SettingsSection>(defaultSection);

  useEffect(() => {
    // When opening the dialog, ensure the active section follows the caller's intent.
    if (dialogProps.open) {
      setActiveSection(defaultSection);
    }
  }, [defaultSection, dialogProps.open]);

  const sections = useMemo(
    () => [
      {
        id: "appearance",
        label: t.settings.sections.appearance,
        icon: PaletteIcon,
      },
      {
        id: "notification",
        label: t.settings.sections.notification,
        icon: BellIcon,
      },
      {
        id: "modelLifecycle",
        label: t.settings.sections.modelLifecycle,
        icon: CpuIcon,
      },
      {
        id: "memory",
        label: t.settings.sections.memory,
        icon: BrainIcon,
      },
      {
        id: "tools",
        label: t.settings.sections.tools,
        icon: WrenchIcon,
      },
      {
        id: "skills",
        label: t.settings.sections.skills,
        icon: BoxesIcon,
      },
    ],
    [
      t.settings.sections.appearance,
      t.settings.sections.modelLifecycle,
      t.settings.sections.memory,
      t.settings.sections.notification,
      t.settings.sections.tools,
      t.settings.sections.skills,
    ],
  );
  return (
    <Dialog
      {...dialogProps}
      onOpenChange={(open) => props.onOpenChange?.(open)}
    >
      <DialogContent
        className="flex h-[80vh] max-h-[calc(100vh-2rem)] flex-col sm:max-w-5xl md:max-w-6xl p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-2xl shadow-2xl rounded-2xl sm:rounded-3xl border-white/5"
        aria-describedby={undefined}
      >
        <DialogHeader className="gap-1 border-b px-6 py-5 bg-muted/10">
          <DialogTitle className="text-xl font-semibold tracking-tight">{t.settings.title}</DialogTitle>
          <p className="text-muted-foreground text-sm">
            {t.settings.description}
          </p>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 md:grid-cols-[240px_1fr]">
          <nav className="bg-muted/30 min-h-0 overflow-y-auto border-r p-4">
            <ul className="space-y-1.5">
              {sections.map(({ id, label, icon: Icon }) => {
                const active = activeSection === id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setActiveSection(id as SettingsSection)}
                      className={cn(
                        "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                        active
                          ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10 font-medium scale-[1.02]"
                          : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground",
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-primary rounded-r-full" />
                      )}
                      <Icon className={cn(
                        "size-4 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                        active && "text-primary scale-110"
                      )} />
                      <span>{label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <ScrollArea className="h-full min-h-0 container">
            <div className="space-y-8 p-6 md:p-10 max-w-4xl mx-auto">
              {activeSection === "appearance" && <AppearanceSettingsPage />}
              {activeSection === "modelLifecycle" && <ModelLifecycleSettingsPage readOnly />}
              {activeSection === "memory" && <MemorySettingsPage />}
              {activeSection === "notification" && <NotificationSettingsPage />}
              {activeSection === "tools" && <ToolSettingsPage readOnly />}
              {activeSection === "skills" && <SkillSettingsPage readOnly />}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
