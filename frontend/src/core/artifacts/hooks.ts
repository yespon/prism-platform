import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { useThread } from "@/components/workspace/messages/context";
import { getAuthToken } from "@/core/auth/auth-api";

import { loadArtifactContent, loadArtifactContentFromToolCall } from "./loader";

export function useArtifactAccessToken() {
  const [token, setToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const loadToken = async () => {
      try {
        const token = getAuthToken();
        if (!cancelled) {
          setToken(token ?? undefined);
        }
      } catch {
        if (!cancelled) {
          setToken(undefined);
        }
      }
    };

    void loadToken();

    return () => {
      cancelled = true;
    };
  }, []);

  return token;
}

export function useArtifactContent({
  filepath,
  threadId,
  enabled,
}: {
  filepath: string;
  threadId: string;
  enabled?: boolean;
}) {
  const isWriteFile = useMemo(() => {
    return filepath.startsWith("write-file:");
  }, [filepath]);
  const isMCPResult = useMemo(() => {
    return filepath.startsWith("mcp-result:");
  }, [filepath]);
  const { thread, isMock } = useThread();
  const content = useMemo(() => {
    if (isWriteFile || isMCPResult) {
      return loadArtifactContentFromToolCall({ url: filepath, thread });
    }
    return null;
  }, [filepath, isWriteFile, isMCPResult, thread]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["artifact", filepath, threadId, isMock],
    queryFn: () => {
      return loadArtifactContent({ filepath, threadId, isMock });
    },
    enabled: enabled && !isWriteFile && !isMCPResult,
    // Cache artifact content for 5 minutes to avoid repeated fetches (especially for .skill ZIP extraction)
    staleTime: 5 * 60 * 1000,
  });
  return { content: isWriteFile || isMCPResult ? content : data, isLoading, error };
}
