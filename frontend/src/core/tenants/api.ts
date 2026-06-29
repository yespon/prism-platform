"use client";

import { fetchAuthApi } from "@/core/api/auth-client";

import { setCurrentTenantId } from "./store";

export type TenantItem = {
  id: string;
  name: string;
  slug: string;
  role: string;
  tenant_type?: string;
};

export type CurrentTenant = {
  tenant_id: string;
  role: string;
  tenant_type?: string;
};

export type TenantMemberRole = "tenant_admin" | "tenant_member";

export type TenantMember = {
  user_id: string;
  email?: string | null;
  name?: string | null;
  role: string;
  status: "active" | "inactive";
};

export type TenantSelectableUser = {
  user_id: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  status?: string | null;
  already_member: boolean;
};

export type TenantAuditScope = "tenant" | "user";

export type TenantAuditEvent = {
  ts: string;
  event_type: string;
  severity: string;
  actor_id?: string | null;
  target_user_id?: string | null;
  tenant_id?: string | null;
  scope?: string | null;
  metadata?: Record<string, unknown>;
};

export async function loadTenants(): Promise<TenantItem[]> {
  const response = await fetchAuthApi("/api/tenants");
  if (!response.ok) {
    throw new Error(`Failed to load tenants: ${response.status}`);
  }
  const payload = (await response.json()) as { tenants?: TenantItem[] };
  return payload.tenants ?? [];
}

export async function loadCurrentTenant(): Promise<CurrentTenant> {
  const response = await fetchAuthApi("/api/tenants/current");
  if (!response.ok) {
    throw new Error(`Failed to load current tenant: ${response.status}`);
  }
  return (await response.json()) as CurrentTenant;
}

export async function switchTenant(tenantId: string): Promise<CurrentTenant> {
  const response = await fetchAuthApi("/api/tenants/switch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tenant_id: tenantId }),
  });
  if (!response.ok) {
    throw new Error(`Failed to switch tenant: ${response.status}`);
  }
  return (await response.json()) as CurrentTenant;
}

export async function bootstrapTenantContext() {
  try {
    const current = await loadCurrentTenant();
    setCurrentTenantId(current.tenant_id);
    return current;
  } catch {
    return null;
  }
}

export async function loadTenantMembers(): Promise<TenantMember[]> {
  const response = await fetchAuthApi("/api/tenants/members");
  if (!response.ok) {
    throw new Error(`Failed to load tenant members: ${response.status}`);
  }
  const payload = (await response.json()) as { members?: TenantMember[] };
  return payload.members ?? [];
}

export async function searchTenantSelectableUsers(input?: {
  keyword?: string;
  limit?: number;
}): Promise<TenantSelectableUser[]> {
  const params = new URLSearchParams();
  const keyword = input?.keyword?.trim();
  if (keyword) {
    params.set("keyword", keyword);
  }
  if (input?.limit) {
    params.set("limit", String(input.limit));
  }

  const query = params.toString();
  const response = await fetchAuthApi(`/api/tenants/users${query ? `?${query}` : ""}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? data.message ?? "Failed to search tenant users");
  }
  const payload = (await response.json()) as { users?: TenantSelectableUser[] };
  return payload.users ?? [];
}

export async function addTenantMember(input: {
  user_id: string;
  role: TenantMemberRole;
}): Promise<TenantMember> {
  const response = await fetchAuthApi("/api/tenants/members", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? data.message ?? "Failed to add tenant member");
  }
  return (await response.json()) as TenantMember;
}

export async function updateTenantMemberRole(
  targetUserId: string,
  role: TenantMemberRole,
): Promise<TenantMember> {
  const response = await fetchAuthApi(`/api/tenants/members/${targetUserId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? data.message ?? "Failed to update tenant member role");
  }
  return (await response.json()) as TenantMember;
}

export async function removeTenantMember(targetUserId: string): Promise<void> {
  const response = await fetchAuthApi(`/api/tenants/members/${targetUserId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? data.message ?? "Failed to remove tenant member");
  }
}

export async function updateTenantMemberStatus(
  targetUserId: string,
  status: "active" | "inactive",
): Promise<TenantMember> {
  const response = await fetchAuthApi(`/api/tenants/members/${targetUserId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? data.message ?? "Failed to update tenant member status");
  }
  return (await response.json()) as TenantMember;
}

export async function loadTenantAuditLogs(input?: {
  limit?: number;
  scope?: TenantAuditScope;
}): Promise<{ tenant_id: string; events: TenantAuditEvent[] }> {
  const params = new URLSearchParams();
  if (input?.limit) {
    params.set("limit", String(input.limit));
  }
  if (input?.scope) {
    params.set("scope", input.scope);
  }
  const query = params.toString();
  const response = await fetchAuthApi(`/api/admin/tenant-audit/logs${query ? `?${query}` : ""}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? data.message ?? "Failed to load tenant audit logs");
  }
  const payload = (await response.json()) as { tenant_id: string; events?: TenantAuditEvent[] };
  return { tenant_id: payload.tenant_id, events: payload.events ?? [] };
}

export type AddMembersByEmailResult = {
  success: Array<{ email: string; user_id: string; name?: string | null }>;
  notFound: string[];
  alreadyMember: Array<{ email: string; user_id: string }>;
};

export async function addTenantMembersByEmail(
  emails: string[],
  role: TenantMemberRole,
): Promise<AddMembersByEmailResult> {
  const response = await fetchAuthApi("/api/tenants/members/by-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ emails, role }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? data.message ?? "Failed to add tenant members");
  }
  return (await response.json()) as AddMembersByEmailResult;
}
