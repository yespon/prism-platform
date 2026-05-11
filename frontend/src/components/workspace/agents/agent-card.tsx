"use client";

import {
  BotIcon,
  CheckCircle2Icon,
  LockIcon,
  MessageSquareIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteAgent } from "@/core/agents";
import type { Agent } from "@/core/agents";
import { useI18n } from "@/core/i18n/hooks";

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const { t } = useI18n();
  const router = useRouter();
  const deleteAgent = useDeleteAgent();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const hasTools = (agent.tool_groups?.length ?? 0) > 0;
  const hasModel = Boolean(agent.model);
  const releaseState = hasModel ? t.agentGallery.published : t.agentGallery.needsImprovement;
  const scope = hasTools ? t.agentGallery.controlledToolDomain : t.agentGallery.basicCapabilityOnly;

  function handleChat() {
    router.push(`/workspace/agents/${agent.name}/chats/new`);
  }

  async function handleDelete() {
    try {
      await deleteAgent.mutateAsync(agent.name);
      toast.success(t.agents.deleteSuccess);
      setDeleteOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <Card className="group flex flex-col border-border/70 bg-card/80 transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                <BotIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="truncate text-base">
                  {agent.name}
                </CardTitle>
                {agent.model && (
                  <Badge variant="secondary" className="mt-0.5 text-xs">
                    {agent.model}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {agent.description && (
            <CardDescription className="mt-2 line-clamp-2 text-sm">
              {agent.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-3 pt-0 pb-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border bg-muted/40 p-2">
              <div className="text-muted-foreground">{t.agentGallery.releaseState}</div>
              <div className="mt-1 flex items-center gap-1 font-medium">
                <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-600" />
                {releaseState}
              </div>
            </div>
            <div className="rounded-md border bg-muted/40 p-2">
              <div className="text-muted-foreground">{t.agentGallery.permissionScope}</div>
              <div className="mt-1 flex items-center gap-1 font-medium">
                {hasTools ? (
                  <ShieldCheckIcon className="h-3.5 w-3.5 text-blue-600" />
                ) : (
                  <LockIcon className="h-3.5 w-3.5 text-amber-600" />
                )}
                {scope}
              </div>
            </div>
          </div>

          {agent.tool_groups && agent.tool_groups.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {agent.tool_groups.map((group) => (
                <Badge key={group} variant="outline" className="text-xs">
                  {group}
                </Badge>
              ))}
            </div>
          )}

          <div className="text-muted-foreground grid grid-cols-2 gap-2 text-[11px]">
            <div>{t.agentGallery.modelStrategyLabel}: {agent.model ?? t.agentGallery.defaultStrategy}</div>
            <div>{t.agentGallery.capabilityOrchestration(agent.tool_groups?.length ?? 0)}</div>
          </div>
        </CardContent>

        <CardFooter className="mt-auto flex items-center justify-between gap-2 pt-3">
          <Button size="sm" className="flex-1" onClick={handleChat}>
            <MessageSquareIcon className="mr-1.5 h-3.5 w-3.5" />
            {t.agents.chat}
          </Button>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive hover:text-destructive h-8 w-8 shrink-0"
              onClick={() => setDeleteOpen(true)}
              title={t.agents.delete}
            >
              <Trash2Icon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Delete Confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.agents.delete}</DialogTitle>
            <DialogDescription>{t.agents.deleteConfirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteAgent.isPending}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteAgent.isPending}
            >
              {deleteAgent.isPending ? t.common.loading : t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
