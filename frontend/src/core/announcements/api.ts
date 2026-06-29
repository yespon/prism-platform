import { fetchAuthApi } from "@/core/api/auth-client";

import type {
  AdminTenantTarget,
  AnnouncementActionResponse,
  AnnouncementItem,
  AnnouncementListResponse,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "./types";

async function jsonOrError<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    let message = fallback;
    try {
      const payload = (await res.json()) as { detail?: string; message?: string };
      message = payload.detail ?? payload.message ?? fallback;
    } catch {
      message = fallback;
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export async function loadActiveAnnouncements(limit = 3): Promise<AnnouncementItem[]> {
  const res = await fetchAuthApi(`/api/announcements/active?limit=${limit}`);
  const payload = await jsonOrError<AnnouncementListResponse>(res, "加载活动通知失败");
  return payload.items ?? [];
}

export async function loadAnnouncements(input?: {
  includeHistory?: boolean;
  limit?: number;
}): Promise<AnnouncementItem[]> {
  const includeHistory = input?.includeHistory ?? true;
  const limit = input?.limit ?? 100;
  const params = new URLSearchParams({
    include_history: String(includeHistory),
    limit: String(limit),
  });
  const res = await fetchAuthApi(`/api/announcements?${params.toString()}`);
  const payload = await jsonOrError<AnnouncementListResponse>(res, "加载通知列表失败");
  return payload.items ?? [];
}

export async function markAnnouncementRead(announcementId: number): Promise<AnnouncementActionResponse> {
  const res = await fetchAuthApi(`/api/announcements/${announcementId}/read`, { method: "POST" });
  return jsonOrError<AnnouncementActionResponse>(res, "标记已读失败");
}

export async function dismissAnnouncement(announcementId: number): Promise<AnnouncementActionResponse> {
  const res = await fetchAuthApi(`/api/announcements/${announcementId}/dismiss`, { method: "POST" });
  return jsonOrError<AnnouncementActionResponse>(res, "忽略通知失败");
}

export async function loadAdminAnnouncements(): Promise<AnnouncementItem[]> {
  const res = await fetchAuthApi("/api/admin/announcements");
  const payload = await jsonOrError<AnnouncementListResponse>(res, "加载通知管理列表失败");
  return payload.items ?? [];
}

export async function createAdminAnnouncement(input: CreateAnnouncementInput): Promise<AnnouncementItem> {
  const res = await fetchAuthApi("/api/admin/announcements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOrError<AnnouncementItem>(res, "创建通知失败");
}

export async function loadAdminAnnouncementDetail(announcementId: number): Promise<AnnouncementItem> {
  const res = await fetchAuthApi(`/api/admin/announcements/${announcementId}`);
  return jsonOrError<AnnouncementItem>(res, "加载通知详情失败");
}

export async function updateAdminAnnouncement(
  announcementId: number,
  input: UpdateAnnouncementInput,
): Promise<AnnouncementItem> {
  const res = await fetchAuthApi(`/api/admin/announcements/${announcementId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOrError<AnnouncementItem>(res, "更新通知失败");
}

export async function deleteAdminAnnouncement(announcementId: number): Promise<AnnouncementActionResponse> {
  const res = await fetchAuthApi(`/api/admin/announcements/${announcementId}`, {
    method: "DELETE",
  });
  return jsonOrError<AnnouncementActionResponse>(res, "删除通知失败");
}

export async function publishAdminAnnouncement(announcementId: number): Promise<AnnouncementActionResponse> {
  const res = await fetchAuthApi(`/api/admin/announcements/${announcementId}/publish`, { method: "POST" });
  return jsonOrError<AnnouncementActionResponse>(res, "发布通知失败");
}

export async function archiveAdminAnnouncement(announcementId: number): Promise<AnnouncementActionResponse> {
  const res = await fetchAuthApi(`/api/admin/announcements/${announcementId}/archive`, { method: "POST" });
  return jsonOrError<AnnouncementActionResponse>(res, "归档通知失败");
}

export async function loadAdminTenantTargets(): Promise<AdminTenantTarget[]> {
  const res = await fetchAuthApi("/api/admin/tenants");
  const payload = await jsonOrError<{ tenants?: Array<{ id: string; name: string }> }>(res, "加载工作空间列表失败");
  return (payload.tenants ?? []).map((item) => ({ id: item.id, name: item.name }));
}
