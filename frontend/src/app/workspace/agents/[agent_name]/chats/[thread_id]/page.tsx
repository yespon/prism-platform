"use client";

import type { Message } from "@langchain/langgraph-sdk";
import { BotIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { AgentWelcome } from "@/components/workspace/agent-welcome";
import { ArtifactTrigger } from "@/components/workspace/artifacts";
import { ChatBox, useThreadChat } from "@/components/workspace/chats";
import { InputBox } from "@/components/workspace/input-box";
import { MessageList } from "@/components/workspace/messages";
import { ThreadContext } from "@/components/workspace/messages/context";
import { ThreadTitle } from "@/components/workspace/thread-title";
import { TodoList } from "@/components/workspace/todo-list";
import { TokenUsageIndicator } from "@/components/workspace/token-usage-indicator";
import { useAgent } from "@/core/agents";
import { useI18n } from "@/core/i18n/hooks";
import { buildRetrySubmissionFromMessage } from "@/core/messages/utils";
import { useNotification } from "@/core/notification/hooks";
import { useLocalSettings } from "@/core/settings";
import { isRateLimitLikeError, useThreadStream } from "@/core/threads/hooks";
import { textOfMessage } from "@/core/threads/utils";
import { useDeleteUploadedFile, useUploadedFiles, type UploadedFileInfo } from "@/core/uploads";
import { env } from "@/env";
import { cn } from "@/lib/utils";

import {
  reconcileAttachmentSelection,
  removeDeletedAttachmentSelections,
  selectPreferredReferencesForAddedIds,
} from "../../../../chats/[thread_id]/attachment-selection";
import { ThreadAttachmentsPanel } from "../../../../chats/[thread_id]/thread-attachments-panel";

import { buildAgentSelectedAttachments } from "./agent-attachments";

export default function AgentChatPage() {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useLocalSettings();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const { agent_name } = useParams<{
    agent_name: string;
  }>();

  const { agent } = useAgent(agent_name);

  const { threadId, setThreadId, isNewThread, setIsNewThread } = useThreadChat();

  const { showNotification } = useNotification();
  const [thread, sendMessage] = useThreadStream({
    threadId: isNewThread ? undefined : threadId,
    context: { ...settings.context, agent_name: agent_name },
    onStart: (createdThreadId) => {
      setThreadId(createdThreadId);
      setIsNewThread(false);
      // ! Important: Never use next.js router for navigation in this case, otherwise it will cause the thread to re-mount and lose all states. Use native history API instead.
      history.replaceState(
        null,
        "",
        `/workspace/agents/${agent_name}/chats/${createdThreadId}`,
      );
    },
    onFinish: (state) => {
      if (document.hidden || !document.hasFocus()) {
        let body = "Conversation finished";
        const lastMessage = state.messages[state.messages.length - 1];
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
      const selectedAttachments = buildAgentSelectedAttachments(
        threadAttachments,
        selectedAttachmentIds,
      );
      void sendMessage(threadId, message, {
        agent_name,
        attachments: selectedAttachments,
      }).catch((error) => {
        console.warn("Failed to send message", error);
      });
    },
    [agent_name, selectedAttachmentIds, sendMessage, threadAttachments, threadId],
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
          agent_name,
          attachments,
        },
      ).catch((error) => {
        console.warn("Retry send failed", error);
      });
    },
    [agent_name, sendMessage, threadId],
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

  const handleCreateNewAgentChat = useCallback(async () => {
    if (thread.isLoading) {
      try {
        await Promise.race([
          thread.stop(),
          new Promise<void>((resolve) => setTimeout(resolve, 800)),
        ]);
      } catch (error) {
        console.warn("Stop stream before creating new agent chat failed", error);
      }
    }
    // Clear skill selection when creating a new agent chat
    setSettings("context", {
      ...settings.context,
      skill_name: undefined,
    });
    const target = `/workspace/agents/${agent_name}/chats/new`;
    try {
      router.push(target);
      setTimeout(() => {
        if (window.location.pathname !== target) {
          window.location.assign(target);
        }
      }, 120);
    } catch {
      window.location.assign(target);
    }
  }, [agent_name, router, thread, setSettings, settings.context]);

  const isRateLimited = isRateLimitLikeError(thread.error);

  if (!mounted) {
    return <div className="flex size-full min-h-0 flex-col bg-background" />;
  }

  return (
    <ThreadContext.Provider value={{ thread }}>
      <ChatBox threadId={threadId}>
        <div className="relative flex size-full min-h-0 justify-between">
          <header
            className={cn(
              "absolute top-0 right-0 left-0 z-30 flex h-12 shrink-0 items-center gap-2 px-4",
              isNewThread
                ? "bg-background/0 backdrop-blur-none"
                : "bg-background/80 shadow-xs backdrop-blur",
            )}
          >
            {/* Agent badge */}
            <div className="flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1">
              <BotIcon className="text-primary h-3.5 w-3.5" />
              <span className="text-xs font-medium">
                {agent?.name ?? agent_name}
              </span>
            </div>

            <div className="flex w-full items-center text-sm font-medium">
              <ThreadTitle threadId={threadId} thread={thread} />
            </div>
            <div className="mr-4 flex items-center">
              <TokenUsageIndicator messages={thread.messages} />
              <ArtifactTrigger threadId={threadId} />
            </div>
          </header>

          <main className="flex min-h-0 max-w-full grow flex-col">
            <div className="flex size-full justify-center">
              <MessageList
                className={cn("size-full", !isNewThread && "pt-10")}
                threadId={threadId}
                thread={thread}
                availableAttachmentKeys={availableAttachmentKeys}
                onRetryHumanMessage={handleRetryHumanMessage}
                onSubmitClarification={(text) => handleSubmit({ text, files: [] })}
              />
            </div>

            <div className="absolute right-0 bottom-0 left-0 z-30 flex justify-center px-4">
              <div
                className={cn(
                  "relative w-full",
                  isNewThread && "-translate-y-[calc(50vh-96px)]",
                  isNewThread
                    ? "max-w-(--container-width-sm)"
                    : "max-w-(--container-width-md)",
                )}
              >
                <div className="absolute -top-4 right-0 left-0 z-0">
                  <div className="absolute right-0 bottom-0 left-0 mb-4 transition-all duration-300">
                    <TodoList
                      className="rounded-2xl"
                      todos={thread.values.todos ?? []}
                      hidden={
                        !thread.values.todos || thread.values.todos.length === 0
                      }
                    />
                  </div>
                </div>

                <InputBox
                  className={cn("bg-background/5 w-full -translate-y-4")}
                  isNewThread={isNewThread}
                  threadId={threadId}
                  autoFocus={isNewThread}
                  status={
                    thread.error && !isRateLimited
                      ? "error"
                      : thread.isLoading
                        ? "streaming"
                        : "ready"
                  }
                  context={settings.context}
                  extraHeader={
                    isNewThread && (
                      <AgentWelcome agent={agent} agentName={agent_name} />
                    )
                  }
                  disabled={env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true"}
                  onContextChange={(context) => setSettings("context", context)}
                  onSubmit={handleSubmit}
                  onStop={handleStop}
                  onNewChat={handleCreateNewAgentChat}
                />
                <ThreadAttachmentsPanel
                  attachments={threadAttachments}
                  selectedAttachmentIds={selectedAttachmentIds}
                  newlyUploadedPreferredIds={newlyUploadedPreferredIds}
                  onToggleAttachment={handleToggleAttachment}
                  onDeleteAttachment={handleDeleteAttachment}
                  onClearSelection={handleClearAttachmentSelection}
                  onSelectOnlyNewUploads={handleSelectOnlyNewUploads}
                />
                {env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true" && (
                  <div className="text-muted-foreground/67 w-full translate-y-12 text-center text-xs">
                    {t.common.notAvailableInDemoMode}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </ChatBox>
    </ThreadContext.Provider>
  );
}
