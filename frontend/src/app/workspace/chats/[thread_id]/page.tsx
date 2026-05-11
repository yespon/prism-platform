"use client";

import type { Message } from "@langchain/langgraph-sdk";
import { History, ListChecks, Loader2Icon, SquarePen, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";

import { type PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ArtifactTrigger,
} from "@/components/workspace/artifacts/artifact-trigger";
import {
  ChatBox,
  useSpecificChatMode,
  useThreadChat,
} from "@/components/workspace/chats";
import { InputBox } from "@/components/workspace/input-box";
import { MessageList } from "@/components/workspace/messages";
import { ThreadContext } from "@/components/workspace/messages/context";
import { ThreadTitle } from "@/components/workspace/thread-title";
import { TodoList } from "@/components/workspace/todo-list";
import { TokenUsageIndicator } from "@/components/workspace/token-usage-indicator";
import { useI18n } from "@/core/i18n/hooks";
import { buildRetrySubmissionFromMessage } from "@/core/messages/utils";
import { useAvailableModels } from "@/core/models/hooks";
import { useNotification } from "@/core/notification/hooks";
import { useLocalSettings } from "@/core/settings";
import {
  isRateLimitLikeError,
  useDeleteThread,
  useThreadStream,
  useThreads,
} from "@/core/threads/hooks";
import { pathOfThread, textOfMessage, titleOfThread } from "@/core/threads/utils";
import { useDeleteUploadedFile, useUploadedFiles, type UploadedFileInfo } from "@/core/uploads";
import { formatTimeAgo } from "@/core/utils/datetime";
import { env } from "@/env";
import { cn } from "@/lib/utils";

import {
  reconcileAttachmentSelection,
  removeDeletedAttachmentSelections,
  selectPreferredReferencesForAddedIds,
} from "./attachment-selection";
import { ThreadAttachmentsPanel } from "./thread-attachments-panel";

export default function ChatPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useLocalSettings();

  useEffect(() => {
    setMounted(true);
  }, []);

  const { threadId, setThreadId, isNewThread, setIsNewThread, isMock } = useThreadChat();
  useSpecificChatMode();
  const [historyOpen, setHistoryOpen] = useState(false);

  const { showNotification } = useNotification();
  const { data: threads = [] } = useThreads();
  const { mutate: deleteThread } = useDeleteThread();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetThreadId, setDeleteTargetThreadId] = useState<string | null>(null);
  const [todosHidden, setTodosHidden] = useState(false);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  const selectedCount = selectedIds.size;

  const [thread, sendMessage, isUploading] = useThreadStream({
    threadId: isNewThread ? undefined : threadId,
    context: settings.context,
    isMock,
    onStart: (createdThreadId) => {
      setThreadId(createdThreadId);
      setIsNewThread(false);
      setTodosHidden(false);
      // ! Important: Never use next.js router for navigation in this case, otherwise it will cause the thread to re-mount and lose all states. Use native history API instead.
      history.replaceState(null, "", `/workspace/chats/${createdThreadId}`);
    },
    onFinish: (state) => {
      if (document.hidden || !document.hasFocus()) {
        let body = "Conversation finished";
        const lastMessage = state.messages.at(-1);
        if (lastMessage) {
          const textContent = textOfMessage(lastMessage);
          if (textContent) {
            body =
              textContent.length > 200
                ? textContent.substring(0, 200) + "..."
                : textContent;
          }
        }
        showNotification(state.title, { body });
      }
    },
  });

  const {
    data: uploadsData,
    isSuccess: uploadsReady,
    isFetching: uploadsFetching,
  } = useUploadedFiles(threadId);
  const { mutateAsync: deleteUploadedFile } = useDeleteUploadedFile(threadId);
  const threadAttachments = useMemo(() => uploadsData?.files ?? [], [uploadsData?.files]);
  const availableAttachmentKeys = useMemo(() => {
    if (!uploadsReady || uploadsFetching) {
      return undefined;
    }
    return new Set(
      threadAttachments.map((file) => file.attachment_id || `legacy:${file.filename}`),
    );
  }, [threadAttachments, uploadsFetching, uploadsReady]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);
  const [newlyUploadedPreferredIds, setNewlyUploadedPreferredIds] = useState<string[]>([]);
  const knownAttachmentIdsRef = useRef<Set<string>>(new Set());
  const selectionInitializedRef = useRef(false);

  useEffect(() => {
    // Thread switch must reset round-level attachment references to avoid cross-thread leakage.
    setSelectedAttachmentIds([]);
    setNewlyUploadedPreferredIds([]);
    knownAttachmentIdsRef.current = new Set();
    selectionInitializedRef.current = false;
  }, [threadId]);

  useEffect(() => {
    const allIds = threadAttachments
      .map((file) => file.attachment_id || `legacy:${file.filename}`)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    const addedIds = allIds.filter((id) => !knownAttachmentIdsRef.current.has(id));
    setNewlyUploadedPreferredIds(
      selectPreferredReferencesForAddedIds(addedIds, threadAttachments),
    );

    setSelectedAttachmentIds((previous) => {
      const next = reconcileAttachmentSelection(
        {
          selectedIds: previous,
          knownIds: knownAttachmentIdsRef.current,
          initialized: selectionInitializedRef.current,
        },
        threadAttachments,
      );
      knownAttachmentIdsRef.current = next.knownIds;
      selectionInitializedRef.current = next.initialized;
      return next.selectedIds;
    });
  }, [threadAttachments]);

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      const selectedAttachments = threadAttachments.filter((file) =>
        selectedAttachmentIds.includes(file.attachment_id || `legacy:${file.filename}`),
      );
      void sendMessage(threadId, message, {
        attachments: selectedAttachments,
      }).catch((error) => {
        console.warn("Failed to send message", error);
      });
    },
    [selectedAttachmentIds, sendMessage, threadAttachments, threadId],
  );

  const handleRetryHumanMessage = useCallback(
    (message: Message) => {
      const { text, attachments } = buildRetrySubmissionFromMessage(message);
      if (!text && attachments.length === 0) {
        return;
      }
      const retryMessage: PromptInputMessage = {
        text,
        files: [],
      };
      void sendMessage(
        threadId,
        retryMessage,
        {
          attachments,
        },
      ).catch((error) => {
        console.warn("Retry send failed", error);
      });
    },
    [sendMessage, threadId],
  );

  const handleToggleAttachment = useCallback((attachmentId: string) => {
    setSelectedAttachmentIds((previous) =>
      previous.includes(attachmentId)
        ? previous.filter((id) => id !== attachmentId)
        : [...previous, attachmentId],
    );
  }, []);

  const handleClearAttachmentSelection = useCallback(() => {
    setSelectedAttachmentIds([]);
  }, []);

  const handleSelectOnlyNewUploads = useCallback(() => {
    if (newlyUploadedPreferredIds.length === 0) {
      return;
    }
    const availableIds = new Set(
      threadAttachments.map((file) => file.attachment_id || `legacy:${file.filename}`),
    );
    setSelectedAttachmentIds(
      newlyUploadedPreferredIds.filter((id) => availableIds.has(id)),
    );
  }, [newlyUploadedPreferredIds, threadAttachments]);

  const handleDeleteAttachment = useCallback(
    async (file: UploadedFileInfo) => {
      await deleteUploadedFile({
        attachmentId: file.attachment_id,
        filename: file.filename,
      });
      setSelectedAttachmentIds((previous) =>
        removeDeletedAttachmentSelections(previous, file),
      );
    },
    [deleteUploadedFile],
  );
  const handleStop = useCallback(async () => {
    await thread.stop();
  }, [thread]);

  const recentThreads = useMemo(() => threads.slice(0, 50), [threads]);
  const isAllSelected = selectedCount === recentThreads.length && recentThreads.length > 0;

  const handleDelete = useCallback(
    (targetThreadId: string) => {
      deleteThread({ threadId: targetThreadId });
      if (targetThreadId === threadId) {
        setHistoryOpen(false);
      }
    },
    [deleteThread, threadId],
  );

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, []);

  const toggleSelectOne = useCallback((tid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tid)) {
        next.delete(tid);
      } else {
        next.add(tid);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(recentThreads.map((t) => t.thread_id)));
    }
  }, [isAllSelected, recentThreads]);

  const confirmBatchDelete = useCallback(() => {
    for (const tid of selectedIds) {
      deleteThread({ threadId: tid });
    }
    if (selectedIds.has(threadId)) {
      setHistoryOpen(false);
    }
    setSelectedIds(new Set());
    setIsSelectMode(false);
    setBatchDeleteDialogOpen(false);
  }, [deleteThread, selectedIds, threadId]);

  const handleCreateNewThread = useCallback(async () => {
    // Stop current stream first to avoid route/state race when creating a new chat during generation.
    if (thread.isLoading) {
      try {
        await Promise.race([
          thread.stop(),
          new Promise<void>((resolve) => setTimeout(resolve, 800)),
        ]);
      } catch (error) {
        console.warn("Stop stream before creating new chat failed", error);
      }
    }
    // Clear skill selection when creating a new thread
    setSettings("context", {
      ...settings.context,
      skill_name: undefined,
    });
    try {
      router.push("/workspace/chats/new");
      setTimeout(() => {
        if (window.location.pathname !== "/workspace/chats/new") {
          window.location.assign("/workspace/chats/new");
        }
      }, 120);
    } catch {
      window.location.assign("/workspace/chats/new");
    }
  }, [router, thread, setSettings, settings.context]);

  const { models: availableModels } = useAvailableModels();
  const models = useMemo(() => {
    const seen = new Set<string>();
    return availableModels.filter((model) => {
      if (
        !model?.name
        || model.scope !== "tenant"
        || seen.has(model.name)
        || model.enabled === false
      ) {
        return false;
      }
      seen.add(model.name);
      return true;
    });
  }, [availableModels]);

  const resolveModelLabel = useCallback(
    (model?: { display_name?: string | null; name?: string | null }) => {
      const displayName = model?.display_name?.trim();
      if (displayName) return displayName;
      const name = model?.name?.trim();
      if (name) return name;
      return undefined;
    },
    [],
  );

  const selectedModel = useMemo(() => {
    if (models.length === 0) return undefined;
    return models.find((m) => m.name === settings.context.model_name) ?? models[0];
  }, [models, settings.context.model_name]);

  const selectedModelLabel = useMemo(() => {
    const label = resolveModelLabel(selectedModel);
    if (label) return label;
    if (typeof settings.context.model_name === "string") {
      const trimmed = settings.context.model_name.trim();
      if (trimmed) return trimmed;
    }
    return t.chatHeader.selectModel;
  }, [selectedModel, settings.context.model_name, resolveModelLabel]);

  const selectedModelName = useMemo(() => {
    if (selectedModel?.name) return selectedModel.name;
    if (typeof settings.context.model_name === "string" && settings.context.model_name.trim()) {
      return settings.context.model_name;
    }
    return undefined;
  }, [settings.context.model_name, selectedModel?.name]);

  const handleModelSelect = useCallback(
    (model_name: string) => {
      setSettings("context", {
        ...settings.context,
        model_name,
      });
    },
    [settings.context, setSettings],
  );

  const isRateLimited = isRateLimitLikeError(thread.error);

  const isThreadConnecting = thread.isLoading && thread.messages.length === 0 && !isNewThread;

  if (!mounted) {
    return <div className="flex size-full min-h-0 flex-col bg-background" />;
  }

  return (
    <ThreadContext.Provider value={{ thread, isMock }}>
      <ChatBox threadId={threadId}>
        <div className="relative flex size-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.12),transparent_32%)]">
          <header
            className={cn(
              "absolute top-0 inset-x-0 z-30 flex h-14 shrink-0 items-center justify-between px-4 sm:px-8 bg-gradient-to-b from-background/90 to-transparent backdrop-blur-sm pointer-events-none",
            )}
          >
            <div className="flex min-w-0 items-center gap-3 opacity-60 hover:opacity-100 transition-opacity pointer-events-auto">
              <div className="bg-primary/5 text-primary inline-flex h-[24px] items-center rounded-md px-2 text-[11px] font-semibold uppercase tracking-wider">
                {t.chatHeader.smartWorkbench}
              </div>
              <div className="hidden bg-border h-4 w-px lg:block" />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md hover:bg-muted/70"
                onClick={handleCreateNewThread}
                title={t.chatHeader.newSession}
              >
                <SquarePen className="size-4" />
              </Button>
              <div className="bg-border h-4 w-px" />
              <Select
                disabled={models.length === 0}
                onValueChange={handleModelSelect}
                value={selectedModelName}
              >
                <SelectTrigger className="h-7 max-w-[200px] gap-1 border-0 bg-transparent px-1 text-xs font-medium text-foreground/70 hover:text-foreground focus:ring-0 shadow-none cursor-pointer group [&>svg]:size-3 [&>svg]:text-muted-foreground/60 [&>svg]:group-hover:text-muted-foreground [&>svg]:transition-colors">
                  <span className="truncate max-w-[140px] border-b border-dashed border-transparent group-hover:border-border/60 transition-colors pb-0.5">
                    {models.length > 0 ? selectedModelLabel : t.chatHeader.noModel}
                  </span>
                </SelectTrigger>
                <SelectContent
                  align="start"
                  className="w-[280px]"
                  position="popper"
                  side="bottom"
                >
                  {models.map((m) => (
                    <SelectItem className="rounded-lg py-2" key={m.name} value={m.name}>
                      {resolveModelLabel(m) ?? m.model ?? m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="hidden bg-border h-4 w-px lg:block" />
              <div className="min-w-0 text-[13px] font-medium tracking-tight overflow-hidden text-ellipsis whitespace-nowrap pt-0.5 max-w-[200px] sm:max-w-[400px]">
                <ThreadTitle threadId={threadId} thread={thread} />
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 pl-3 pointer-events-auto opacity-70 hover:opacity-100 transition-opacity">
              <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-md gap-1.5 px-2.5 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  >
                    <History className="size-4" />
                    <span className="hidden md:inline">
                      {t.chatHeader.executionRecords}
                    </span>
                  </Button>
                </SheetTrigger>
                  <SheetContent side="right" className="w-[460px] sm:max-w-[460px] flex flex-col">
                    <SheetHeader className="shrink-0 border-b pb-3 px-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <SheetTitle>{t.chatHeader.executionRecords}</SheetTitle>
                          <SheetDescription>{t.chatHeader.executionRecordsDesc}</SheetDescription>
                        </div>
                        {!isSelectMode && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 px-3 text-xs font-normal mr-10"
                            onClick={toggleSelectMode}
                          >
                            <ListChecks className="size-3.5" />
                            {t.common.manage}
                          </Button>
                        )}
                      </div>
                    </SheetHeader>

                    {isSelectMode && (
                      <div className="shrink-0 mx-4 mt-3 flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/10 px-4 py-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          onClick={toggleSelectMode}
                        >
                          {t.common.cancelSelection}
                        </button>
                        <div className="h-4 w-px bg-border" />
                        <span className="text-sm font-medium text-foreground">
                          {t.common.selectedCount(selectedCount)}
                        </span>
                        <div className="flex-1" />
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          onClick={toggleSelectAll}
                        >
                          {isAllSelected ? t.common.deselectAll : t.common.selectAll}
                        </button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 gap-1.5 px-3 text-xs"
                          disabled={selectedCount === 0}
                          onClick={() => setBatchDeleteDialogOpen(true)}
                        >
                          <Trash2 className="size-3.5" />
                          {t.common.delete}
                        </Button>
                      </div>
                    )}

                    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                      {recentThreads.length === 0 ? (
                        <div className="text-muted-foreground py-10 text-center text-sm">{t.chatHeader.noExecutionRecords}</div>
                      ) : (
                        <div className={cn("space-y-1 pt-3", isSelectMode && "pb-2")}>
                          {recentThreads.map((item) => {
                            const active = item.thread_id === threadId;
                            const isSelected = selectedIds.has(item.thread_id);
                            return (
                              <div
                                key={item.thread_id}
                                className={cn(
                                  "group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all duration-150",
                                  active && !isSelectMode && "border-primary/35 bg-primary/5",
                                  isSelectMode && isSelected && "border-primary/30 bg-primary/5",
                                  isSelectMode && !isSelected && "opacity-60",
                                )}
                              >
                                {isSelectMode && (
                                  <button
                                    type="button"
                                    className="shrink-0 rounded-md border p-0.5 transition-all duration-150"
                                    style={{
                                      borderColor: isSelected ? "hsl(var(--primary))" : "hsl(var(--border))",
                                      background: isSelected ? "hsl(var(--primary) / 0.1)" : "transparent",
                                    }}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      toggleSelectOne(item.thread_id);
                                    }}
                                  >
                                    {isSelected ? (
                                      <svg className="size-3.5 text-primary" viewBox="0 0 16 16" fill="none">
                                        <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    ) : (
                                      <div className="size-3.5" />
                                    )}
                                  </button>
                                )}
                                <div
                                  role="link"
                                  tabIndex={0}
                                  className="min-w-0 flex-1 cursor-pointer"
                                  onClick={() => {
                                    if (isSelectMode) {
                                      toggleSelectOne(item.thread_id);
                                    } else {
                                      setHistoryOpen(false);
                                      startTransition(() => {
                                        router.push(pathOfThread(item.thread_id));
                                      });
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !isSelectMode) {
                                      setHistoryOpen(false);
                                      startTransition(() => {
                                        router.push(pathOfThread(item.thread_id));
                                      });
                                    }
                                  }}
                                  onMouseEnter={() => {
                                    router.prefetch(pathOfThread(item.thread_id));
                                  }}
                                >
                                  <div className="truncate text-sm font-medium">{titleOfThread(item)}</div>
                                  {item.updated_at && (
                                    <div className="text-muted-foreground mt-0.5 text-xs">
                                      {formatTimeAgo(item.updated_at)}
                                    </div>
                                  )}
                                </div>
                                {!isSelectMode && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDeleteTargetThreadId(item.thread_id);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
                <TokenUsageIndicator messages={thread.messages} />
                <ArtifactTrigger threadId={threadId} />
              </div>
          </header>
          <main className="flex min-h-0 max-w-full grow flex-col">
            <div className="mx-auto flex size-full max-w-5xl min-w-0 flex-col px-4 pb-4 pt-5 sm:px-8">
              <div className="relative flex min-h-0 flex-1 flex-col">
                {isNewThread && thread.messages.length === 0 && (
                  <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center">
                    <div className="mx-auto flex w-full max-w-(--container-width-md) flex-col items-center justify-center rounded-3xl p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
                      <h2 className="text-xl font-semibold tracking-tight text-foreground">{t.chatHeader.startNewTask}</h2>
                      <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                        {t.chatHeader.startNewTaskDesc.split("<br />").map((line, i) => (
                          <span key={i}>
                            {i > 0 && <br />}
                            {line}
                          </span>
                        ))}
                      </p>
                    </div>
                  </div>
                )}
                {isThreadConnecting && (
                  <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center">
                    <div className="mx-auto flex flex-col items-center justify-center gap-3 rounded-3xl p-8 text-center animate-in fade-in duration-300">
                      <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{t.chatHeader.loadingThread}</p>
                    </div>
                  </div>
                )}
                <MessageList
                  className={cn("size-full min-h-0 flex-1 bg-transparent")}
                  threadId={threadId}
                  thread={thread}
                  paddingBottom={180}
                  availableAttachmentKeys={availableAttachmentKeys}
                  onRetryHumanMessage={handleRetryHumanMessage}
                  onSubmitClarification={(text) => handleSubmit({ text, files: [] })}
                />
              </div>

              <div className="sticky bottom-0 z-20 flex justify-center pb-2 pt-3">
                <div className="relative w-full max-w-5xl">
                  <div className="pointer-events-none absolute inset-x-0 -top-6 h-8 bg-linear-to-t from-background via-background/70 to-transparent" />
                  <div
                    className={cn(
                      "relative z-10 transition-all duration-300",
                      (todosHidden || !thread.values.todos || thread.values.todos.length === 0)
                        ? "hidden"
                        : "mb-4",
                    )}
                  >
                    <TodoList
                      className="rounded-2xl"
                      todos={thread.values.todos ?? []}
                      hidden={
                        todosHidden ||
                        !thread.values.todos ||
                        thread.values.todos.length === 0
                      }
                      onClose={() => setTodosHidden(true)}
                    />
                  </div>
                  <ThreadAttachmentsPanel
                    attachments={threadAttachments}
                    selectedAttachmentIds={selectedAttachmentIds}
                    newlyUploadedPreferredIds={newlyUploadedPreferredIds}
                    onToggleAttachment={handleToggleAttachment}
                    onDeleteAttachment={handleDeleteAttachment}
                    onClearSelection={handleClearAttachmentSelection}
                    onSelectOnlyNewUploads={handleSelectOnlyNewUploads}
                  />
                  <InputBox
                    className={cn("w-full")}
                    isNewThread={isNewThread}
                    threadId={threadId}
                    autoFocus={false}
                    status={
                      thread.error && !isRateLimited
                        ? "error"
                        : thread.isLoading
                          ? "streaming"
                          : "ready"
                    }
                    context={settings.context}
                    disabled={env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true" || isUploading}
                    onContextChange={(context) => setSettings("context", context)}
                    onSubmit={handleSubmit}
                    onStop={handleStop}
                    onNewChat={handleCreateNewThread}
                  />
                  {env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true" && (
                    <div className="text-muted-foreground/67 pt-3 text-center text-xs">
                      {t.common.notAvailableInDemoMode}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </ChatBox>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t.common.deleteThreadConfirmTitle}</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            {t.common.deleteThreadConfirmDesc}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteTargetThreadId(null);
              }}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTargetThreadId) {
                  handleDelete(deleteTargetThreadId);
                }
                setDeleteDialogOpen(false);
                setDeleteTargetThreadId(null);
              }}
            >
              {t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t.common.batchDeleteConfirmTitle}</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            {t.common.batchDeleteConfirmDesc(selectedCount)}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBatchDeleteDialogOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBatchDelete}
            >
              {t.common.batchDelete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ThreadContext.Provider>
  );
}

