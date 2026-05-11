"use client";

import { BotIcon, CheckCircle2Icon, Clock3Icon, PlusIcon, ShieldCheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { useAgents } from "@/core/agents";
import { useI18n } from "@/core/i18n/hooks";
import { useThreads } from "@/core/threads/hooks";

import { AgentCard } from "./agent-card";

export function AgentGallery() {
  const { t } = useI18n();
  const { agents, isLoading } = useAgents();
  const { data: recentThreads = [] } = useThreads({
    limit: 200,
    sortBy: "updated_at",
    sortOrder: "desc",
    select: ["thread_id", "updated_at", "values"],
  });
  const router = useRouter();

  const summary = useMemo(() => {
    const total = agents.length;
    const withModel = agents.filter((agent) => Boolean(agent.model)).length;
    const withTools = agents.filter(
      (agent) => (agent.tool_groups?.length ?? 0) > 0,
    ).length;
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const activeIn24h = recentThreads.filter((thread) => {
      if (!thread.updated_at) return false;
      const ts = new Date(thread.updated_at).getTime();
      return Number.isFinite(ts) && ts >= dayAgo;
    }).length;
    return { total, withModel, withTools, activeIn24h };
  }, [agents, recentThreads]);

  const handleNewAgent = () => {
    router.push("/workspace/agents/new");
  };

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950 flex size-full flex-col">
      <div className="border-b bg-white/80 px-6 py-4 backdrop-blur dark:bg-zinc-900/60">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{t.agentGallery.title}</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {t.agentGallery.description}
            </p>
          </div>
          <Button onClick={handleNewAgent}>
            <PlusIcon className="mr-1.5 h-4 w-4" />
            {t.agents.newAgent}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-6 pt-6 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 dark:bg-zinc-900">
          <div className="text-xs text-muted-foreground">{t.agentGallery.registeredAgents}</div>
          <div className="mt-2 text-2xl font-semibold">{summary.total}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 dark:bg-zinc-900">
          <div className="text-xs text-muted-foreground">{t.agentGallery.modelStrategyConfigured}</div>
          <div className="mt-2 flex items-center gap-2 text-2xl font-semibold">
            {summary.withModel}
            <CheckCircle2Icon className="size-4 text-emerald-600" />
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 dark:bg-zinc-900">
          <div className="text-xs text-muted-foreground">{t.agentGallery.toolPermissionBound}</div>
          <div className="mt-2 flex items-center gap-2 text-2xl font-semibold">
            {summary.withTools}
            <ShieldCheckIcon className="size-4 text-blue-600" />
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 dark:bg-zinc-900">
          <div className="text-xs text-muted-foreground">{t.agentGallery.recentlyRun}</div>
          <div className="mt-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock3Icon className="size-4" />
            {t.agentGallery.recent24h(summary.activeIn24h)}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pt-4">
        {isLoading ? (
          <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
            {t.common.loading}
          </div>
        ) : agents.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-full">
              <BotIcon className="text-muted-foreground h-7 w-7" />
            </div>
            <div>
                <p className="font-medium">{t.agentGallery.noAgents}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                  {t.agentGallery.noAgentsHint}
              </p>
            </div>
            <Button variant="outline" className="mt-2" onClick={handleNewAgent}>
              <PlusIcon className="mr-1.5 h-4 w-4" />
              {t.agents.newAgent}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {agents.map((agent) => (
              <AgentCard key={agent.name} agent={agent} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
