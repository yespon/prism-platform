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

/** Default trigger fraction matching backend SUMMARIZATION_TRIGGER_FRACTION */
const TRIGGER_FRACTION = 0.35;
/** Hard-cap fraction matching backend HARD_CAP_FRACTION */
const HARD_CAP_FRACTION = 0.80;

interface TokenUsageIndicatorProps {
  messages: Message[];
  /** Maximum input tokens for the current model (context window size). */
  modelMaxTokens?: number;
  className?: string;
}

function getProgressColor(progress: number): string {
  if (progress >= 0.8) return "text-rose-500";
  if (progress >= 0.6) return "text-amber-500";
  return "text-muted-foreground";
}

function getProgressBarColor(progress: number): string {
  if (progress >= 0.8) return "bg-rose-500";
  if (progress >= 0.6) return "bg-amber-400";
  return "bg-primary/60";
}

export function TokenUsageIndicator({
  messages,
  modelMaxTokens,
  className,
}: TokenUsageIndicatorProps) {
  const { t } = useI18n();

  const usage = useMemo(() => accumulateUsage(messages), [messages]);

  const summaryCount = useMemo(
    () => messages.filter((m) => isSummaryMessage(m)).length,
    [messages],
  );

  // Use modelMaxTokens if available, otherwise fall back to reported total
  const effectiveMaxTokens = modelMaxTokens ?? usage?.totalTokens ?? 0;

  const triggerThreshold = useMemo(() => {
    if (effectiveMaxTokens > 0) {
      return Math.round(effectiveMaxTokens * TRIGGER_FRACTION);
    }
    return 0;
  }, [effectiveMaxTokens]);

  const hardCapThreshold = useMemo(() => {
    if (effectiveMaxTokens > 0) {
      return Math.round(effectiveMaxTokens * HARD_CAP_FRACTION);
    }
    return 0;
  }, [effectiveMaxTokens]);

  const contextProgress = useMemo(() => {
    if (!usage || usage.totalTokens === 0 || effectiveMaxTokens === 0) return 0;
    return Math.min(usage.totalTokens / effectiveMaxTokens, 1);
  }, [usage, effectiveMaxTokens]);

  if (!usage) {
    return null;
  }

  const progressColor = getProgressColor(contextProgress);
  const barColor = getProgressBarColor(contextProgress);
  const isWarning = contextProgress >= 0.8;
  const isCaution = contextProgress >= 0.6 && contextProgress < 0.8;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "text-muted-foreground flex cursor-default items-center gap-1 text-xs transition-colors duration-300",
            isWarning && "text-rose-500 animate-pulse",
            isCaution && "text-amber-500",
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
      <TooltipContent side="bottom" align="end" className="min-w-[220px]">
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
              <span className={cn("font-mono", progressColor)}>
                {Math.round(contextProgress * 100)}%
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              {/* Trigger threshold marker */}
              {triggerThreshold > 0 && effectiveMaxTokens > 0 && (
                <div
                  className="absolute h-1.5 w-0.5 bg-amber-400/60 z-10"
                  style={{
                    marginLeft: `${(triggerThreshold / effectiveMaxTokens) * 100}%`,
                  }}
                />
              )}
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  barColor,
                )}
                style={{ width: `${contextProgress * 100}%` }}
              />
            </div>
            <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground/60">
              <span>0</span>
              <span>
                {t.summaryStatus.triggerThreshold}: {formatTokenCount(triggerThreshold)}
              </span>
              <span>{formatTokenCount(effectiveMaxTokens)}</span>
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
