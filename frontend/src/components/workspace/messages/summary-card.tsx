"use client";

import type { Message } from "@langchain/langgraph-sdk";
import { ScrollTextIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";

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
  className?: string;
}

/**
 * SummaryCard displays a conversation summary message with a collapsible UI.
 *
 * Design rationale:
 * - Centered alignment: distinguishes from regular messages (left/right alignment)
 * - Dashed border + muted background: lower visual priority than user/assistant messages
 * - Collapsible by default: summary text is often long, so hide by default
 * - Small text size: summary content is secondary context, not primary conversation
 * - Icon indicator: ScrollText icon clearly signals "historical summary"
 */
export function SummaryCard({ message, className }: SummaryCardProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const content = extractTextFromMessage(message);

  // Extract the actual summary text (remove the prefix if present)
  const summaryPrefix = "Here is a summary of the conversation to date:";
  const summaryContent = content.startsWith(summaryPrefix)
    ? content.slice(summaryPrefix.length).trim()
    : content;

  if (!summaryContent) {
    return null;
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(
        "w-full flex justify-center",
        className
      )}
    >
      <div
        className={cn(
          "relative w-full max-w-[85%] rounded-xl border border-dashed",
          "border-border/50 bg-muted/30",
          "transition-all duration-200",
          isOpen && "bg-muted/50 border-border"
        )}
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full h-auto py-2.5 px-4 flex items-center justify-between gap-3",
              "hover:bg-transparent hover:text-foreground",
              "text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-2.5">
              <ScrollTextIcon className="size-4 shrink-0" />
              <span className="text-xs font-medium">
                {isOpen
                  ? t.summary.expandedLabel
                  : t.summary.collapsedLabel
                }
              </span>
            </div>
            {isOpen ? (
              <ChevronUpIcon className="size-4 shrink-0" />
            ) : (
              <ChevronDownIcon className="size-4 shrink-0" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-3 pt-0">
            <div className="border-t border-border/30 pt-2.5">
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
