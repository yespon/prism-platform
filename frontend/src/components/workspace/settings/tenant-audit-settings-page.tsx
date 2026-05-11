"use client";

import { useMemo, useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isTenantAdminRole } from "@/core/permissions/scope";
import type { TenantAuditScope } from "@/core/tenants/api";
import { useCurrentTenant, useTenantAuditLogs } from "@/core/tenants/hooks";

import { SettingsSection } from "./settings-section";

const SCOPE_OPTIONS: Array<{ value: "all" | TenantAuditScope; label: string }> = [
  { value: "all", label: "全部" },
  { value: "tenant", label: "tenant" },
  { value: "user", label: "user" },
];

export function TenantAuditSettingsPage() {
  const { data: currentTenant } = useCurrentTenant();
  const isTenantAdmin = isTenantAdminRole(currentTenant?.role);
  const [scope, setScope] = useState<"all" | TenantAuditScope>("all");

  const selectedScope = useMemo<TenantAuditScope | undefined>(
    () => (scope === "all" ? undefined : scope),
    [scope],
  );

  const { data, isLoading, error } = useTenantAuditLogs({
    enabled: isTenantAdmin,
    limit: 100,
    scope: selectedScope,
  });

  return (
    <SettingsSection
      title="租户业务审计"
      description="仅当前租户 tenant_admin 可查看本租户审计事件；平台审计与租户业务审计严格隔离。"
    >
      {!isTenantAdmin ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          仅租户管理员可访问该页面。
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">范围过滤</span>
            <Select value={scope} onValueChange={(value: "all" | TenantAuditScope) => setScope(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCOPE_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error.message}
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">时间</th>
                  <th className="px-4 py-2 font-medium">事件</th>
                  <th className="px-4 py-2 font-medium">范围</th>
                  <th className="px-4 py-2 font-medium">操作者</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                      加载中...
                    </td>
                  </tr>
                ) : (data?.events ?? []).length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                      当前筛选条件下暂无审计事件
                    </td>
                  </tr>
                ) : (
                  (data?.events ?? []).map((event) => (
                    <tr key={`${event.ts}-${event.event_type}`} className="border-t">
                      <td className="px-4 py-3">{event.ts}</td>
                      <td className="px-4 py-3">{event.event_type}</td>
                      <td className="px-4 py-3">{event.scope ?? "unknown"}</td>
                      <td className="px-4 py-3">{event.actor_id ?? "system"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
