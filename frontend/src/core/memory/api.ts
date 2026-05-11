import { fetchAuthApi } from "@/core/api/auth-client";

import type { UserMemory } from "./types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUserMemory(value: unknown): value is UserMemory {
  if (!isObject(value)) return false;
  return (
    "user" in value &&
    "history" in value &&
    "facts" in value &&
    Array.isArray(value.facts)
  );
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (isObject(payload)) {
    const detail = payload.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    const message = payload.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return fallback;
}

export async function loadMemory() {
  const response = await fetchAuthApi("/api/memory");

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(json, "加载记忆失败"));
  }

  if (!isUserMemory(json)) {
    throw new Error("记忆数据格式错误");
  }

  return json;
}
