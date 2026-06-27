"use client";

import type { IncidentDetail } from "./types";

/**
 * 精简后的 Incident 上下文，用于传递给 Terminal AI 助手。
 * 核心原则：只保留排查最必要的信息，总量 ≤200 字。
 */
export interface IncidentContext {
  incident_id: string;
  title: string;
  severity: string;
  service: string | null;
  environment: string | null;
  ai_summary_truncated: string | null;
  ai_suggestion: string | null;
}

/**
 * 从 IncidentDetail 构建精简上下文
 */
export function buildIncidentContext(incident: IncidentDetail): IncidentContext {
  return {
    incident_id: incident.id,
    title: incident.title ?? "未命名告警",
    severity: incident.severity,
    service: incident.service ?? null,
    environment: incident.environment ?? null,
    ai_summary_truncated: truncateText(incident.ai_summary, 80),
    ai_suggestion: incident.ai_suggestion ?? null,
  };
}

/**
 * 将 IncidentContext 渲染为 AI 助手的注入 prompt。
 * 定位是"排查引导"而非"修复指令"。
 */
export function renderContextPrompt(ctx: IncidentContext): string {
  const parts: string[] = [];

  parts.push(`[告警上下文]`);
  parts.push(`告警：${ctx.title}`);
  parts.push(`级别：${ctx.severity}`);
  
  if (ctx.service) {
    const envStr = ctx.environment ? ` | 环境：${ctx.environment}` : "";
    parts.push(`服务：${ctx.service}${envStr}`);
  }

  if (ctx.ai_summary_truncated) {
    parts.push(`AI摘要：${ctx.ai_summary_truncated}`);
  }

  if (ctx.ai_suggestion) {
    parts.push(`排查方向：${ctx.ai_suggestion}`);
  }

  parts.push("");
  parts.push("请根据以上告警信息，帮我逐步排查此问题。先从确认服务基本状态开始。");

  return parts.join("\n");
}

/**
 * 将 IncidentContext 编码为 URL-safe 字符串（base64url）
 */
export function encodeContextForURL(ctx: IncidentContext): string {
  const json = JSON.stringify(ctx);
  // 浏览器环境使用 btoa，需要先 encodeURIComponent 处理中文
  return btoa(encodeURIComponent(json))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * 从 URL-safe 字符串解码 IncidentContext
 */
export function decodeContextFromURL(encoded: string): IncidentContext | null {
  try {
    // 还原 base64url → base64
    let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    // 补齐 padding
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    const json = decodeURIComponent(atob(base64));
    const parsed = JSON.parse(json) as IncidentContext;
    // 基本校验
    if (!parsed.incident_id || !parsed.title || !parsed.severity) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * 截断文本到指定长度，超出部分加 "..."
 */
function truncateText(text: string | null | undefined, maxLen: number): string | null {
  if (!text) return null;
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}
