import {
  CheckCircleIcon,
  ChevronUp,
  ClipboardListIcon,
  Loader2Icon,
  XCircleIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Streamdown } from "streamdown";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { ShineBorder } from "@/components/ui/shine-border";
import { useI18n } from "@/core/i18n/hooks";
import { useRehypeSplitWordsIntoSpans } from "@/core/rehype";
import { streamdownPluginsWithWordAnimation } from "@/core/streamdown";
import { useSubtask } from "@/core/tasks/context";
import { explainLastToolCall } from "@/core/tools/utils";
import { cn } from "@/lib/utils";

import { CitationLink } from "../citations/citation-link";
import { FlipDisplay } from "../flip-display";

import { MarkdownContent } from "./markdown-content";

export function SubtaskCard({
  className,
  taskId,
  isLoading,
}: {
  className?: string;
  taskId: string;
  isLoading: boolean;
}) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(true);
  const rehypePlugins = useRehypeSplitWordsIntoSpans(isLoading);
  const task = useSubtask(taskId);

  const icon = useMemo(() => {
    if (!task) {
      return null;
    }

    if (task.status === "completed") {
      return <CheckCircleIcon className="size-3" />;
    } else if (task.status === "failed") {
      return <XCircleIcon className="size-3 text-red-500" />;
    } else if (task.status === "in_progress") {
      return <Loader2Icon className="size-3 animate-spin" />;
    }
  }, [task?.status]);

  if (!task) {
    return null;
  }

  return (
    <ChainOfThought
      className={cn("flex w-full flex-col gap-0.5 pl-9 transition-all duration-300", className)}
      open={!collapsed}
    >
      <div className="flex w-full flex-col overflow-hidden">
        <div className="flex w-fit items-center justify-start">
          <Button
            className="w-fit flex items-center justify-start gap-3 h-auto py-1 px-2 -ml-2 rounded-[8px] text-left hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100"
            variant="ghost"
            onClick={() => setCollapsed(!collapsed)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {icon}
              <span className="text-[10px] font-medium truncate max-w-[400px]">
                {task.status === "in_progress" ? (
                  <Shimmer duration={3} spread={3}>
                    {task.description}
                  </Shimmer>
                ) : (
                  task.description
                )}
              </span>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {collapsed && (
                <div
                  className={cn(
                    "text-muted-foreground flex items-center gap-1.5 text-xs font-normal pl-2",
                    task.status === "failed" ? "text-red-500 opacity-80" : "",
                  )}
                >
                  <FlipDisplay
                    className="max-w-[12rem] md:max-w-[18rem] lg:max-w-[24rem] truncate"
                    uniqueKey={task.latestMessage?.id ?? ""}
                  >
                    {task.status === "in_progress" &&
                    task.latestMessage &&
                    task.latestMessage.tool_calls &&
                    task.latestMessage.tool_calls.length > 0
                      ? explainLastToolCall(task.latestMessage, t)
                      : t.subtasks[task.status]}
                  </FlipDisplay>
                </div>
              )}
              <ChevronUp
                className={cn(
                  "text-muted-foreground size-4 ml-1 transition-transform duration-200",
                  !collapsed ? "" : "rotate-180",
                )}
              />
            </div>
          </Button>
        </div>
        <ChainOfThoughtContent className="mt-0 pb-1">
          {task.prompt && (
            <ChainOfThoughtStep
              label={
                <Streamdown
                  {...streamdownPluginsWithWordAnimation}
                  components={{ a: CitationLink }}
                >
                  {task.prompt}
                </Streamdown>
              }
            ></ChainOfThoughtStep>
          )}
          {task.status === "in_progress" &&
            task.latestMessage &&
            task.latestMessage.tool_calls &&
            task.latestMessage.tool_calls.length > 0 && (
              <ChainOfThoughtStep
                label={t.subtasks.in_progress}
                icon={<Loader2Icon className="size-4 animate-spin" />}
              >
                {explainLastToolCall(task.latestMessage, t)}
              </ChainOfThoughtStep>
            )}
          {task.status === "completed" && (
            <>
              <ChainOfThoughtStep
                label={t.subtasks.completed}
                icon={<CheckCircleIcon className="size-4" />}
              ></ChainOfThoughtStep>
              <ChainOfThoughtStep
                label={
                  task.result ? (
                    <MarkdownContent
                      content={task.result}
                      isLoading={false}
                      rehypePlugins={rehypePlugins}
                    />
                  ) : null
                }
              ></ChainOfThoughtStep>
            </>
          )}
          {task.status === "failed" && (
            <ChainOfThoughtStep
              label={<div className="text-red-500">{task.error}</div>}
              icon={<XCircleIcon className="size-4 text-red-500" />}
            ></ChainOfThoughtStep>
          )}
        </ChainOfThoughtContent>
      </div>
    </ChainOfThought>
  );
}
