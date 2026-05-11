"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Building2Icon,
  UsersIcon,
  DatabaseIcon,
  HardDriveIcon,
  MessageSquareIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  KeyRoundIcon,
  BotIcon,
  AlertTriangleIcon,
} from "lucide-react";
import Link from "next/link";

import {
  OverviewEmptyState,
  OverviewPageHeader,
  OverviewSectionCard,
} from "@/components/backoffice/overview-primitives";
import { Button } from "@/components/ui/button";
import { fetchAuthApi } from "@/core/api/auth-client";
import { useI18n } from "@/core/i18n/hooks";

interface BootstrapStatusResponse {
  is_bootstrap_admin: boolean;
  must_change_password: boolean;
}

interface OverviewResponse {
  total_users: number;
  active_users: number;
  suspended_users: number;
  total_threads: number;
  total_files: number;
  total_bytes: number;
  total_tenants: number;
  active_tenants: number;
  platform_model_template_count: number;
  assigned_model_count: number;
  bootstrap_admin_users: number;
  must_change_password_users: number;
  recent_new_users_7d: number;
}

interface AuditEvent {
  id?: string;
  ts: string;
  event_type: string;
  actor_id?: string;
  severity?: string;
}

interface AuditResponse {
  events?: AuditEvent[];
}

function fetchOverview() {
  return fetchAuthApi("/api/admin/overview").then((res) => {
    if (!res.ok) throw new Error("Failed to fetch overview");
    return res.json();
  });
}

function fetchAuditLogs() {
  return fetchAuthApi("/api/admin/audit/logs?limit=5").then((res) => {
    if (!res.ok) throw new Error("Failed to fetch audit logs");
    return res.json();
  });
}

function fetchBootstrapStatus(): Promise<BootstrapStatusResponse> {
  return fetchAuthApi("/api/admin/bootstrap-status").then((res) => {
    if (!res.ok) throw new Error("Failed to fetch bootstrap status");
    return res.json();
  });
}

function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatAuditTime(ts: string) {
  const parsed = new Date(ts);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return format(parsed, "MM-dd HH:mm:ss");
}

export default function AdminDashboardPage() {
  const { t } = useI18n();

  const { data: overviewData } = useQuery<OverviewResponse>({
    queryKey: ["admin_overview"],
    queryFn: fetchOverview,
  });

  const { data: auditData } = useQuery<AuditResponse>({
    queryKey: ["admin_dashboard_audit"],
    queryFn: fetchAuditLogs,
  });

  const { data: bootstrapStatus } = useQuery<BootstrapStatusResponse>({
    queryKey: ["admin_bootstrap_status"],
    queryFn: fetchBootstrapStatus,
  });

  const totalUsers = overviewData?.total_users ?? 0;
  const activeUsers = overviewData?.active_users ?? 0;
  const suspendedUsers = overviewData?.suspended_users ?? 0;
  const totalThreads = overviewData?.total_threads ?? 0;
  const totalFiles = overviewData?.total_files ?? 0;
  const totalBytes = overviewData?.total_bytes ?? 0;
  const totalTenants = overviewData?.total_tenants ?? 0;
  const activeTenants = overviewData?.active_tenants ?? 0;
  const modelTemplateCount = overviewData?.platform_model_template_count ?? 0;
  const assignedModelCount = overviewData?.assigned_model_count ?? 0;
  const bootstrapAdminUsers = overviewData?.bootstrap_admin_users ?? 0;
  const mustChangePasswordUsers = overviewData?.must_change_password_users ?? 0;
  const recentNewUsers = overviewData?.recent_new_users_7d ?? 0;

  const showBootstrapWarning = bootstrapStatus?.is_bootstrap_admin && bootstrapStatus?.must_change_password;

  return (
    <div className="space-y-6">
      {showBootstrapWarning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <AlertTriangleIcon className="size-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-900 dark:text-amber-400">
                {t.admin.dashboard.bootstrapWarning.title}
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {t.admin.dashboard.bootstrapWarning.description}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                const event = new CustomEvent('openChangePasswordDialog');
                window.dispatchEvent(event);
              }}
            >
              {t.admin.dashboard.bootstrapWarning.changeNow}
            </Button>
          </div>
        </div>
      )}

      <OverviewPageHeader
        title={t.admin.dashboard.title}
        description={t.admin.dashboard.description}
        actions={
          <Link href="/admin/audit" className="text-sm text-indigo-600 hover:underline">
            {t.admin.dashboard.viewAuditLogs}
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">{t.admin.dashboard.metricCards.totalUsers}</h3>
            <UsersIcon className="size-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-semibold">{totalUsers}</p>
          <div className="mt-2 text-xs text-muted-foreground">
            <span className="text-emerald-600 font-medium">{activeUsers} {t.admin.dashboard.activeUsers}</span> · <span className="text-red-500">{suspendedUsers} {t.admin.dashboard.suspendedUsers}</span>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">{t.admin.dashboard.metricCards.totalThreads}</h3>
            <MessageSquareIcon className="size-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-semibold">{totalThreads}</p>
          <div className="mt-2 text-xs text-muted-foreground">{t.admin.dashboard.allTimeTotal}</div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">{t.admin.dashboard.metricCards.totalFiles}</h3>
            <DatabaseIcon className="size-5 text-amber-500" />
          </div>
          <p className="text-3xl font-semibold">{totalFiles}</p>
          <div className="mt-2 text-xs text-muted-foreground">{t.admin.dashboard.processedUploads}</div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">{t.admin.dashboard.metricCards.storageCapacity}</h3>
            <HardDriveIcon className="size-5 text-blue-500" />
          </div>
          <p className="text-3xl font-semibold">{formatBytes(totalBytes)}</p>
          <div className="mt-2 text-xs text-muted-foreground">{t.admin.dashboard.diskUsage}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">{t.admin.dashboard.metricCards.totalTenants}</h3>
            <Building2Icon className="size-5 text-cyan-500" />
          </div>
          <p className="text-3xl font-semibold">{totalTenants}</p>
          <div className="mt-2 text-xs text-muted-foreground">
            <span className="text-emerald-600 font-medium">{activeTenants} {t.admin.dashboard.activeTenants}</span>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">{t.admin.dashboard.metricCards.platformModelTemplates}</h3>
            <BotIcon className="size-5 text-sky-500" />
          </div>
          <p className="text-3xl font-semibold">{modelTemplateCount}</p>
          <div className="mt-2 text-xs text-muted-foreground">{t.admin.dashboard.globalModels}</div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">{t.admin.dashboard.metricCards.assignedModels}</h3>
            <DatabaseIcon className="size-5 text-violet-500" />
          </div>
          <p className="text-3xl font-semibold">{assignedModelCount}</p>
          <div className="mt-2 text-xs text-muted-foreground">{t.admin.dashboard.assignedToTenants}</div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">{t.admin.dashboard.metricCards.newUsers7d}</h3>
            <UserPlusIcon className="size-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-semibold">{recentNewUsers}</p>
          <div className="mt-2 text-xs text-muted-foreground">{t.admin.dashboard.rollingWindow}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">{t.admin.dashboard.metricCards.bootstrapAdminCount}</h3>
            <ShieldCheckIcon className="size-5 text-orange-500" />
          </div>
          <p className="text-3xl font-semibold">{bootstrapAdminUsers}</p>
          <div className="mt-2 text-xs text-muted-foreground">{t.admin.dashboard.minimizeAndAudit}</div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">{t.admin.dashboard.metricCards.mustChangePasswordCount}</h3>
            <KeyRoundIcon className="size-5 text-rose-500" />
          </div>
          <p className="text-3xl font-semibold">{mustChangePasswordUsers}</p>
          <div className="mt-2 text-xs text-muted-foreground">{t.admin.dashboard.trackSecurity}</div>
        </div>
      </div>

      <OverviewSectionCard
        title={t.admin.dashboard.recentAuditSection.title}
        description={t.admin.dashboard.recentAuditSection.description}
        actions={
          <Link href="/admin/audit" className="text-sm text-indigo-600 hover:underline">
            {t.admin.dashboard.recentAuditSection.viewAll} &rarr;
          </Link>
        }
      >
        {auditData?.events && auditData.events.length > 0 ? (
          <div className="space-y-4">
            {auditData.events.map((log, index: number) => {
              const key = log.id ?? `${log.ts}-${log.event_type}-${log.actor_id ?? "system"}-${index}`;
              return (
                <div key={key} className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <ShieldCheckIcon className="size-4 text-zinc-600 dark:text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{log.event_type}</p>
                      <p className="text-xs text-zinc-500">{log.actor_id ?? 'System'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-zinc-500">{formatAuditTime(log.ts)}</p>
                    <p className="text-xs text-zinc-400">{log.severity}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <OverviewEmptyState text={t.admin.dashboard.recentAuditSection.noRecords} />
        )}
      </OverviewSectionCard>
    </div>
  );
}
