"use client";

import type { Message } from "@langchain/langgraph-sdk";
import { Clock, MessageSquare, ScrollTextIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useI18n } from "@/core/i18n/hooks";
import { extractTextFromMessage } from "@/core/messages/utils";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  message: Message;
  /** Optional: total number of messages that were summarized into this card */
  messagesBeforeSummary?: number;
  className?: string;
}

/**
 * SummaryCard displays a conversation summary message with a collapsible UI.
 *
 * Design rationale:
 * - Centered alignment: distinguishes from regular messages (left/right alignment)
 * - Dashed border + amber tint: signals "compression event" distinct from regular messages
 * - Collapsible by default: summary text is often long, so hide by default
 * - Small text size: summary content is secondary context, not primary conversation
 * - Icon indicator: ScrollText icon clearly signals "historical summary"
 * - Timestamp + index: gives users context on when and how many times compression occurred
 */
export function SummaryCard({ message, messagesBeforeSummary, className }: SummaryCardProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const content = extractTextFromMessage(message);

  // Extract the actual summary text (remove the prefix if present)
  const summaryPrefix = "Here is a summary of the conversation to date:";
  const summaryContent = content.startsWith(summaryPrefix)
    ? content.slice(summaryPrefix.length).trim()
    : content;

  // Format timestamp from message metadata
  const timestamp = useMemo(() => {
    const ts = (message as Record<string, unknown>).timestamp as string | undefined
      ?? (message.additional_kwargs as Record<string, unknown> | undefined)?.summary_timestamp as string | undefined;
    if (!ts) return null;
    try {
      const date = new Date(ts);
      return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    } catch {
      return null;
    }
  }, [message]);

  // Summary sequence index from metadata
  const summaryIndex = useMemo(() => {
    const idx = (message.additional_kwargs as Record<string, unknown> | undefined)?.summary_index as number | undefined;
    return idx;
  }, [message]);

  if (!summaryContent) {
    return null;
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(
        "w-full flex justify-center group/summary",
        className
      )}
    >
      <div
        className={cn(
          "relative w-full max-w-[85%] rounded-xl border border-dashed",
          "border-amber-200/40 dark:border-amber-800/30 bg-amber-50/20 dark:bg-amber-950/10",
          "transition-all duration-300",
          isOpen && "border-amber-300/60 dark:border-amber-700/50 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm"
        )}
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full h-auto py-2.5 px-4 flex items-center justify-between gap-3",
              "hover:bg-amber-100/50 dark:hover:bg-amber-900/20 hover:text-foreground",
              "text-muted-foreground group-hover/summary:text-foreground/80 transition-colors"
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={cn(
                "flex items-center justify-center size-6 rounded-md shrink-0 transition-colors",
                "bg-amber-100/60 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
                isOpen && "bg-amber-200/80 dark:bg-amber-800/40"
              )}>
                <ScrollTextIcon className="size-3.5" />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-medium truncate">
                  {isOpen
                    ? t.summary.expandedLabel
                    : t.summary.collapsedLabel
                  }
                </span>
                {summaryIndex != null && (
                  <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">
                    #{summaryIndex + 1}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {timestamp && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                  <Clock className="size-3" />
                  {timestamp}
                </span>
              )}
              {messagesBeforeSummary != null && messagesBeforeSummary > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                  <MessageSquare className="size-3" />
                  {messagesBeforeSummary}
                </span>
              )}
              {isOpen ? (
                <ChevronUpIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
              ) : (
                <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-3 pt-0">
            <div className="border-t border-amber-200/30 dark:border-amber-800/20 pt-2.5">
              <p className="text-[11px] leading-relaxed text-muted-foreground/80 whitespace-pre-wrap">
                {summaryContent}
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
