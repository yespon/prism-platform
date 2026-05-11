"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { uuid } from "@/core/utils/uuid";

const NEW_THREAD_PLACEHOLDER_ID = "00000000-0000-4000-8000-000000000000";

export function useThreadChat() {
  const { thread_id: threadIdFromPath } = useParams<{ thread_id: string }>();

  const searchParams = useSearchParams();
  const [threadId, setThreadId] = useState(() => {
    return threadIdFromPath === "new"
      ? NEW_THREAD_PLACEHOLDER_ID
      : threadIdFromPath;
  });

  const [isNewThread, setIsNewThread] = useState(
    () => threadIdFromPath === "new",
  );

  useEffect(() => {
    if (threadIdFromPath === "new") {
      setIsNewThread(true);
      setThreadId(uuid());
      return;
    }

    if (threadIdFromPath) {
      setIsNewThread(false);
      setThreadId(threadIdFromPath);
    }
  }, [threadIdFromPath]);

  const isMock = searchParams.get("mock") === "true";
  return { threadId, setThreadId, isNewThread, setIsNewThread, isMock };
}
