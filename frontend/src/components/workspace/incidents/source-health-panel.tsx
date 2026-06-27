"use client";

import {
  ActivityIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
  Loader2Icon,
  RadioIcon,
  SignalIcon,
  WifiOffIcon,
  XCircleIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useSourceHealth, useAlertSources } from "@/core/alerting";
import type { SourceHealthItem } from "@/core/alerting/api";

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "从未";
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins}分钟前`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}小时前`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}天前`;
}

const healthConfig: Record<string, { icon: typeof CheckCircle2Icon; label: string; color: string; bg: string }> = {
  healthy: { icon: CheckCircle2Icon, label: "健康", color: "text-emerald-500", bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/60" },
  warning: { icon: AlertCircleIcon, label: "警告", color: "text-amber-500", bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/60" },
  error: { icon: XCircleIcon, label: "异常", color: "text-rose-500", bg: "bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/60" },
  unknown: { icon: WifiOffIcon, label: "未知", color: "text-zinc-400", bg: "bg-zinc-50 border-zinc-200 dark:bg-zinc-900/20 dark:border-zinc-800/60" },
};

export function SourceHealthPanel() {
  const { data: healthItems = [], isLoading, isError } = useSourceHealth();
  const { data: sources = [] } = useAlertSources();

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-background p-6 shadow-sm dark:border-zinc-800/80">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <ActivityIcon className="h-4 w-4 text-blue-500" />
            告警源健康状态 (Source Health)
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            实时监控各告警源的连接状态、数据接收频率和错误率
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono">
          {sources.length} 个告警源
        </Badge>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-8 text-center rounded-lg border border-dashed border-rose-200 dark:border-rose-800">
            <XCircleIcon className="h-8 w-8 mx-auto text-rose-400" />
            <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">健康数据加载失败</p>
          </div>
        ) : healthItems.length === 0 ? (
          <div className="py-8 text-center rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
            <RadioIcon className="h-8 w-8 mx-auto text-zinc-300 dark:text-zinc-600" />
            <p className="mt-2 text-sm text-muted-foreground">暂未配置告警源</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {healthItems.map(item => {
              const cfg = healthConfig[item.health] ?? healthConfig.unknown!;
              const { icon: Icon, label, color, bg } = cfg;
              const errorRate = item.total_received_24h > 0
                ? ((item.total_errors_24h / item.total_received_24h) * 100).toFixed(0)
                : null;

              return (
                <div
                  key={item.source_id}
                  className={`rounded-xl border p-4 transition-all duration-200 hover:shadow-sm ${bg}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                          {item.source_name}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <SignalIcon className="h-3 w-3" />
                          {item.source_type}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 rounded ${
                            item.status === "active"
                              ? "text-emerald-600 border-emerald-300 bg-emerald-50"
                              : "text-zinc-400"
                          }`}
                        >
                          {item.status === "active" ? "活跃" : "停用"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 rounded ${color} border-current/30`}
                        >
                          {label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-background/60 px-2 py-1.5">
                      <div className="text-lg font-bold text-zinc-700 dark:text-zinc-300">
                        {item.total_received_24h}
                      </div>
                      <div className="text-[9px] text-muted-foreground">24h 接收</div>
                    </div>
                    <div className="rounded-md bg-background/60 px-2 py-1.5">
                      <div className={`text-lg font-bold ${item.total_errors_24h > 0 ? "text-rose-500" : "text-zinc-400"}`}>
                        {item.total_errors_24h}
                      </div>
                      <div className="text-[9px] text-muted-foreground">24h 错误</div>
                    </div>
                    <div className="rounded-md bg-background/60 px-2 py-1.5">
                      <div className="text-lg font-bold text-zinc-700 dark:text-zinc-300">
                        {errorRate ? `${errorRate}%` : "--"}
                      </div>
                      <div className="text-[9px] text-muted-foreground">错误率</div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <ClockIcon className="h-3 w-3" />
                    最近接收: {formatTimeAgo(item.last_received_at)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
