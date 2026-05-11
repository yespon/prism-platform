"use client";

import {
  ArrowLeftRight,
  // BotIcon,
  BoxesIcon,
  Building2Icon,
  ChevronDown,
  MessageSquareIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  WrenchIcon,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";

import {
  OverviewEmptyState,
  OverviewPageHeader,
  OverviewSectionCard,
} from "@/components/backoffice/overview-primitives";
import { Button } from "@/components/ui/button";
import {
  WorkspaceBody,
  WorkspaceContainer,
} from "@/components/workspace/workspace-container";
// import { useAgents } from "@/core/agents/hooks";
import { useI18n } from "@/core/i18n/hooks";
import { useAvailableMcpConfig } from "@/core/mcp/hooks";
import { useMemory } from "@/core/memory/hooks";
import { useAvailableModels } from "@/core/models/hooks";
import { useAvailableSkills } from "@/core/skills/hooks";
import { useCurrentTenant, useSwitchTenant, useTenantAuditLogs, useTenantList } from "@/core/tenants/hooks";
import { useThreads } from "@/core/threads/hooks";
import { pathOfThread, titleOfThread } from "@/core/threads/utils";

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === "en" ? "en-US" : "zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="size-4 text-zinc-500" />
      </div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
      {hint ? <div className="mt-2 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function HeaderActions() {
  const { t, locale } = useI18n();
  const { data: currentTenant } = useCurrentTenant();
  const { data: tenants } = useTenantList();
  const { mutate: switchTenant, isPending: switching } = useSwitchTenant();
  const currentTenantId = currentTenant?.tenant_id ?? "";

  const tenantName = useMemo(() => {
    if (!currentTenant?.tenant_id) {
      return t.navMenu.unbound;
    }
    const matched = tenants?.find((item) => item.id === currentTenant.tenant_id);
    return matched?.name ?? currentTenant.tenant_id;
  }, [currentTenant?.tenant_id, tenants, t.navMenu.unbound]);

  const [shortcutHint, setShortcutHint] = useState("Ctrl+K");

  useEffect(() => {
    const isMac =
      typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");
    setShortcutHint(isMac ? "⌘K" : "Ctrl+K");
  }, []);

  const handleOpenCommandPalette = () => {
    window.dispatchEvent(new Event("workspace:open-command-palette"));
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground hidden h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm transition md:flex"
        onClick={handleOpenCommandPalette}
      >
        <SearchIcon className="h-3.5 w-3.5" />
        <span>{t.overview.globalSearch}</span>
        <span className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {shortcutHint}
        </span>
      </button>

      <div className="relative hidden items-center md:flex">
        <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-sm">
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t.overview.switchTenantLabel}</span>
          <select
            aria-label={t.overview.switchTenantLabel}
            value={currentTenantId}
            disabled={switching || !tenants || tenants.length === 0}
            onChange={(event) => {
              const tenantId = event.target.value;
              if (!tenantId || tenantId === currentTenantId) {
                return;
              }
              switchTenant(tenantId);
            }}
            className="cursor-pointer appearance-none bg-transparent pr-4 pl-1 text-sm font-medium text-foreground outline-none focus:outline-none"
          >
            {!tenants || tenants.length === 0 ? (
              <option value="">{tenantName}</option>
            ) : (
              tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))
            )}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      {currentTenant?.role === "tenant_admin" && (
        <Link
          href="/tenant-admin"
          className="hidden rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary/90 md:block"
        >
          {t.navMenu.manageWorkspace}
        </Link>
      )}
    </div>
  );
}

export default function WorkspaceOverviewPage() {
  const { t, locale } = useI18n();
  const { data: currentTenant } = useCurrentTenant();
  // const { agents = [] } = useAgents();
  const { models = [] } = useAvailableModels();
  const { rawArray: tools = [] } = useAvailableMcpConfig();
  const { skills = [] } = useAvailableSkills();
  const { memory } = useMemory();
  const { data: threads = [] } = useThreads({
    limit: 20,
    sortBy: "updated_at",
    sortOrder: "desc",
    select: ["thread_id", "updated_at", "values"],
  });

  const quickActions = [
    { label: t.overview.quickActions.newChat, href: "/workspace/chats/new" },
    // { label: t.overview.quickActions.myAgents, href: "/workspace/agents" },
    { label: t.overview.quickActions.memorySettings, href: "/workspace/chats?settings=memory" },
    { label: t.overview.quickActions.resourceConfig, href: "/workspace/chats?settings=governance" },
  ];

  const isTenantAdmin = currentTenant?.role === "tenant_admin";
  const { data: audit } = useTenantAuditLogs({ limit: 6, enabled: isTenantAdmin });

  const enabledModels = models.filter((item) => item.enabled !== false);
  const filteredTools = tools.filter((item) => item.scope !== "user");
  const uniqueTools = Array.from(new Map(filteredTools.map((item) => [item.name, item])).values());
  const enabledTools = uniqueTools.filter((item) => item.enabled !== false);
  const enabledSkills = skills.filter((item) => item.enabled !== false);
  const recentFacts = memory?.facts?.length ?? 0;
  const recentThreads = threads.slice(0, 6);
  const auditEvents = audit?.events ?? [];

  return (
    <WorkspaceContainer>
      <WorkspaceBody className="bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-7xl px-6 py-6">
          <OverviewPageHeader
            title={t.overview.title}
            description={t.overview.description}
            actions={<HeaderActions />}
          />

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={MessageSquareIcon}
              label={t.overview.mySessions}
              value={threads.length}
              hint={t.overview.mySessionsHint}
            />
            {/* <MetricCard
              icon={BotIcon}
              label={t.overview.myAgents}
              value={agents.length}
              hint={t.overview.myAgentsHint}
            /> */}
            <MetricCard
              icon={SparklesIcon}
              label={t.overview.availableModels}
              value={enabledModels.length}
              hint={t.overview.availableModelsHint(models.length, enabledModels.length)}
            />
            <MetricCard
              icon={WrenchIcon}
              label={t.overview.availableTools}
              value={enabledTools.length}
              hint={t.overview.availableToolsHint(uniqueTools.length, enabledTools.length)}
            />
            <MetricCard
              icon={BoxesIcon}
              label={t.overview.availableSkills}
              value={enabledSkills.length}
              hint={t.overview.availableSkillsHint(skills.length, enabledSkills.length)}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
            <div className="space-y-4">
              <OverviewSectionCard title={t.overview.currentResourceStatus}>
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <ShieldCheckIcon className="size-4" />
                  {t.overview.resourceSummary}
                </h3>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <div>{t.overview.currentTenant}: {currentTenant?.tenant_id ?? "-"}</div>
                  <div>{t.overview.currentRole}: {currentTenant?.role ?? "-"}</div>
                  <div>{t.overview.recordedFacts}: {recentFacts}</div>
                  <div>{t.overview.resourceCount}: {enabledModels.length} / {enabledTools.length} / {enabledSkills.length}</div>
                </div>
              </OverviewSectionCard>

              <OverviewSectionCard
                title={t.overview.quickLinks}
                description={t.overview.quickLinksDesc}
              >
                <div className="mt-4 flex flex-wrap gap-3">
                  {quickActions.map((action) => (
                    <Link key={action.label} href={action.href}>
                      <Button variant="outline">{action.label}</Button>
                    </Link>
                  ))}
                </div>
              </OverviewSectionCard>
            </div>

            <aside>
              <OverviewSectionCard
                title={t.overview.recentSessions}
                actions={
                  <Link
                    href="/workspace/chats"
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    {t.overview.viewAll}
                  </Link>
                }
              >
                <div className="rounded-lg border">
                  {recentThreads.length === 0 ? (
                    <OverviewEmptyState text={t.overview.noSessions} />
                  ) : (
                    <ul className="divide-y">
                      {recentThreads.map((thread) => (
                        <li
                          key={thread.thread_id}
                          className="flex items-center justify-between gap-3 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <Link
                              href={pathOfThread(thread.thread_id)}
                              className="block truncate text-sm font-medium hover:underline"
                            >
                              {titleOfThread(thread)}
                            </Link>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Thread ID: {thread.thread_id}
                            </div>
                          </div>
                          <div className="shrink-0 text-xs text-muted-foreground">
                            {formatDateTime(thread.updated_at, locale)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </OverviewSectionCard>
            </aside>
          </div>
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}
