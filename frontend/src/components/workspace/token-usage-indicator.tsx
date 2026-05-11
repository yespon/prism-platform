"use client";

import type { Message } from "@langchain/langgraph-sdk";
import { CoinsIcon, ScrollTextIcon } from "lucide-react";
import { useMemo } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useI18n } from "@/core/i18n/hooks";
import { accumulateUsage, formatTokenCount } from "@/core/messages/usage";
import { isSummaryMessage } from "@/core/messages/utils";
import { cn } from "@/lib/utils";

const SUMMARY_TRIGGER_THRESHOLD = 15_564;

interface TokenUsageIndicatorProps {
  messages: Message[];
  className?: string;
}

export function TokenUsageIndicator({
  messages,
  className,
}: TokenUsageIndicatorProps) {
  const { t } = useI18n();

  const usage = useMemo(() => accumulateUsage(messages), [messages]);

  const summaryCount = useMemo(
    () => messages.filter((m) => isSummaryMessage(m)).length,
    [messages],
  );

  const triggerProgress = useMemo(() => {
    if (!usage || usage.totalTokens === 0) return 0;
    return Math.min(usage.totalTokens / SUMMARY_TRIGGER_THRESHOLD, 1);
  }, [usage]);

  if (!usage) {
    return null;
  }

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "text-muted-foreground flex cursor-default items-center gap-1 text-xs",
            className,
          )}
        >
          <CoinsIcon size={14} />
          <span>{formatTokenCount(usage.totalTokens)}</span>
          {summaryCount > 0 && (
            <span className="text-primary/70 ml-0.5 flex items-center gap-0.5">
              <ScrollTextIcon size={11} />
              <span>{summaryCount}</span>
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end" className="min-w-[200px]">
        <div className="space-y-1.5 text-xs">
          <div className="font-medium">{t.tokenUsage.title}</div>
          <div className="flex justify-between gap-4">
            <span>{t.tokenUsage.input}</span>
            <span className="font-mono">
              {formatTokenCount(usage.inputTokens)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span>{t.tokenUsage.output}</span>
            <span className="font-mono">
              {formatTokenCount(usage.outputTokens)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="font-medium">{t.tokenUsage.total}</span>
            <span className="font-mono font-medium">
              {formatTokenCount(usage.totalTokens)}
            </span>
          </div>

          {summaryCount > 0 && (
            <div className="border-t pt-1.5">
              <div className="flex items-center justify-between gap-4 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ScrollTextIcon size={12} />
                  {t.summaryStatus.summarizations}
                </span>
                <span className="font-mono font-medium text-foreground">
                  {summaryCount}
                </span>
              </div>
            </div>
          )}

          <div className="border-t pt-1.5">
            <div className="flex items-center justify-between gap-4 text-muted-foreground">
              <span>{t.summaryStatus.triggerProgress}</span>
              <span className="font-mono text-foreground">
                {Math.round(triggerProgress * 100)}%
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  triggerProgress >= 1
                    ? "bg-amber-500"
                    : triggerProgress >= 0.8
                      ? "bg-amber-400"
                      : "bg-primary/60",
                )}
                style={{ width: `${triggerProgress * 100}%` }}
              />
            </div>
            <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground/60">
              <span>0</span>
              <span>{t.summaryStatus.triggerThreshold}: {formatTokenCount(SUMMARY_TRIGGER_THRESHOLD)}</span>
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
