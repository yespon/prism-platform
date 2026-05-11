"use client";

import { Download, FileJson, FileText } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/core/i18n/hooks";
import {
  exportThreadAsJSON,
  exportThreadAsMarkdown,
} from "@/core/threads/export";
import type { AgentThread } from "@/core/threads/types";
import { cn } from "@/lib/utils";

import { useThread } from "./messages/context";
import { Tooltip } from "./tooltip";

type ExportTriggerProps = {
  threadId: string;
  compact?: boolean;
  className?: string;
};

export function ExportTrigger({
  threadId,
  compact = false,
  className,
}: ExportTriggerProps) {
  const { t } = useI18n();
  const { thread } = useThread();

  const messages = thread.messages;

  const handleExport = useCallback(
    (format: "markdown" | "json") => {
      if (messages.length === 0) {
        toast.error(t.conversation.noMessages);
        return;
      }
      const agentThread = {
        thread_id: threadId,
        updated_at: new Date().toISOString(),
        values: thread.values,
      } as AgentThread;

      if (format === "markdown") {
        exportThreadAsMarkdown(agentThread, messages);
      } else {
        exportThreadAsJSON(agentThread, messages);
      }
      toast.success(t.common.exportSuccess);
    },
    [messages, thread.values, threadId, t],
  );

  if (messages.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <Tooltip content={t.common.export}>
        <DropdownMenuTrigger asChild>
          <Button
            className={cn(
              "h-8 rounded-md text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              compact ? "px-2" : "gap-1.5 px-2.5",
              className,
            )}
            variant="ghost"
            size="sm"
          >
            <Download className={compact ? "size-3" : "size-4"} />
            {!compact && <span className="hidden md:inline">{t.common.export}</span>}
          </Button>
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => handleExport("markdown")}>
          <FileText className="text-muted-foreground" />
          <span>{t.common.exportAsMarkdown}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleExport("json")}>
          <FileJson className="text-muted-foreground" />
          <span>{t.common.exportAsJSON}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
