import { getBackendBaseURL } from "../config";
import type { AgentThread } from "../threads";

function withToken(url: string, token?: string) {
  if (!token) {
    return url;
  }
  return `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
}

export function urlOfArtifact({
  filepath,
  threadId,
  download = false,
  isMock = false,
  token,
}: {
  filepath: string;
  threadId: string;
  download?: boolean;
  isMock?: boolean;
  token?: string;
}) {
  if (isMock) {
    return withToken(
      `${getBackendBaseURL()}/mock/api/threads/${threadId}/artifacts${filepath}${download ? "?download=true" : ""}`,
      token,
    );
  }
  return withToken(
    `${getBackendBaseURL()}/api/threads/${threadId}/artifacts${filepath}${download ? "?download=true" : ""}`,
    token,
  );
}

export function extractArtifactsFromThread(thread: AgentThread) {
  return thread.values.artifacts ?? [];
}

export function resolveArtifactURL(
  absolutePath: string,
  threadId: string,
  token?: string,
) {
  return withToken(
    `${getBackendBaseURL()}/api/threads/${threadId}/artifacts${absolutePath}`,
    token,
  );
}
