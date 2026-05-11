import { ChevronUpIcon, ListTodoIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Todo } from "@/core/todos";
import { cn } from "@/lib/utils";

import {
  QueueItem,
  QueueItemContent,
  QueueItemIndicator,
  QueueList,
} from "../ai-elements/queue";

export function TodoList({
  className,
  todos,
  collapsed: controlledCollapsed,
  hidden = false,
  onToggle,
  onClose,
}: {
  className?: string;
  todos: Todo[];
  collapsed?: boolean;
  hidden?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const [internalCollapsed, setInternalCollapsed] = useState(true);
  const isControlled = controlledCollapsed !== undefined;
  const collapsed = isControlled ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (isControlled) {
      onToggle?.();
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  };

  const currentTodo = todos.find((t) => t.status === "in_progress");
  const completedCount = todos.filter((t) => t.status === "completed").length;

  return (
    <div
      className={cn(
        "flex h-fit w-full origin-bottom flex-col overflow-hidden rounded-xl border bg-background/95 shadow-sm backdrop-blur-sm transition-all duration-300 ease-out",
        hidden ? "pointer-events-none translate-y-4 opacity-0" : "translate-y-0 opacity-100",
        className,
      )}
    >
      <header
        className={cn(
          "bg-muted/30 hover:bg-muted/50 flex min-h-10 shrink-0 cursor-pointer items-center justify-between px-4 py-2 text-sm transition-all duration-300 ease-out",
        )}
        onClick={handleToggle}
      >
        <div className="text-muted-foreground font-medium">
          <div className="flex items-center justify-center gap-2">
            <ListTodoIcon className="size-4" />
            <span>To-dos</span>
            {collapsed && currentTodo && (
              <span className="ml-2 text-xs text-primary font-medium truncate max-w-[200px]">
                · {currentTodo.content}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground/70">
            {completedCount}/{todos.length}
          </span>
          <ChevronUpIcon
            className={cn(
              "text-muted-foreground size-4 transition-transform duration-300 ease-out",
              collapsed ? "" : "rotate-180",
            )}
          />
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-1 hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            >
              <XIcon className="size-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </header>
      <main
        className={cn(
          "bg-background/50 flex grow px-3 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
          collapsed ? "h-0 pb-0" : "h-56 pb-4 pt-2",
        )}
      >
        <QueueList className="bg-background mt-0 w-full rounded-xl border px-2 py-2 shadow-inner overflow-y-auto">
          {todos.map((todo, i) => (
            <QueueItem key={i + (todo.content ?? "")} className="rounded-lg transition-colors hover:bg-muted/60 my-0.5">
              <div className="flex items-center justify-start gap-3 w-full">
                <QueueItemIndicator
                  className={
                    todo.status === "in_progress" 
                      ? "border-primary bg-primary shadow-[0_0_8px_rgba(0,112,243,0.6)] animate-pulse scale-110" 
                      : todo.status === "completed" 
                        ? "border-green-500/30 bg-green-500/20 text-green-600 scale-90"
                        : "border-muted-foreground/30 bg-transparent"
                  }
                  completed={todo.status === "completed"}
                />
                <QueueItemContent
                  className={cn(
                    "transition-all duration-300",
                    todo.status === "in_progress" ? "text-foreground font-semibold" : "text-muted-foreground",
                    todo.status === "completed" && "line-through opacity-60"
                  )}
                  completed={todo.status === "completed"}
                >
                  {todo.content}
                </QueueItemContent>
              </div>
            </QueueItem>
          ))}
        </QueueList>
      </main>
    </div>
  );
}
