import { getAuthHeaders } from "@/core/api/auth-client";

import { getBackendBaseURL } from "../config";

import type { Model, RegisterModelInput, AvailableModelResponse, TestConnectionInput, TestConnectionResponse } from "./types";

function encodeModelName(name: string): string {
  return encodeURIComponent(name);
}

export async function loadModels() {
  const headers = await getAuthHeaders();

  const res = await fetch(`${getBackendBaseURL()}/api/models`, {
    headers,
  });

  if (res.status === 401) {
    return [] as Model[];
  }

  if (!res.ok) {
    throw new Error(`Failed to load models: ${res.status}`);
  }

  const payload = (await res.json()) as { models?: Model[] };
  return payload.models ?? [];
}

export async function registerModel(input: RegisterModelInput) {
  const res = await fetch(`${getBackendBaseURL()}/api/models`, {
    method: "POST",
    headers: await getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    let detail = `Failed to register model: ${res.status}`;
    try {
      const payload = (await res.json()) as { detail?: string };
      if (payload.detail) {
        detail = payload.detail;
      }
    } catch {
    }
    throw new Error(detail);
  }

  return (await res.json()) as Model;
}

export async function updateModel(name: string, input: Partial<RegisterModelInput>) {
  const res = await fetch(`${getBackendBaseURL()}/api/models/${encodeModelName(name)}`, {
    method: "PUT",
    headers: await getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    let detail = `Failed to update model: ${res.status}`;
    try {
      const payload = await res.json();
      if (payload.detail) {
        detail = payload.detail;
      }
    } catch {
    }
    throw new Error(detail);
  }

  return await res.json() as Model;
}

export async function deleteModel(name: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getBackendBaseURL()}/api/models/${encodeModelName(name)}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    let detail = `Failed to delete model: ${res.status}`;
    try {
      const payload = await res.json();
      if (payload.detail) {
        detail = payload.detail;
      }
    } catch {
    }
    throw new Error(detail);
  }
}

export async function loadAvailableModels() {
  const headers = await getAuthHeaders();

  const res = await fetch(`${getBackendBaseURL()}/api/models/available`, {
    headers,
  });

  if (res.status === 401) {
    return [] as AvailableModelResponse[];
  }

  if (!res.ok) {
    throw new Error(`Failed to load available models: ${res.status}`);
  }

  const payload = (await res.json()) as { models?: AvailableModelResponse[] };
  return payload.models ?? [];
}

export async function loadTenantModels() {
  const headers = await getAuthHeaders();

  const res = await fetch(`${getBackendBaseURL()}/api/tenants/models`, {
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to load tenant models: ${res.status}`);
  }

  const payload = (await res.json()) as { models?: Model[] };
  return payload.models ?? [];
}

export async function registerTenantModel(input: RegisterModelInput) {
  const res = await fetch(`${getBackendBaseURL()}/api/tenants/models`, {
    method: "POST",
    headers: await getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    let detail = `Failed to register tenant model: ${res.status}`;
    try {
      const payload = await res.json();
      if (payload.detail) detail = payload.detail;
    } catch {}
    throw new Error(detail);
  }
  return await res.json() as Model;
}

export async function updateTenantModel(name: string, input: Partial<RegisterModelInput>) {
  const res = await fetch(`${getBackendBaseURL()}/api/tenants/models/${encodeModelName(name)}`, {
    method: "PUT",
    headers: await getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    let detail = `Failed to update tenant model: ${res.status}`;
    try {
      const payload = await res.json();
      if (payload.detail) detail = payload.detail;
    } catch {}
    throw new Error(detail);
  }
  return await res.json() as Model;
}

export async function deleteTenantModel(name: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getBackendBaseURL()}/api/tenants/models/${encodeModelName(name)}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    let detail = `Failed to delete tenant model: ${res.status}`;
    try {
      const payload = await res.json();
      if (payload.detail) detail = payload.detail;
    } catch {}
    throw new Error(detail);
  }
}

export async function testModelConnection(input: TestConnectionInput): Promise<TestConnectionResponse> {
  const res = await fetch(`${getBackendBaseURL()}/api/admin/models/test-connection`, {
    method: "POST",
    headers: await getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    let detail = `Test connection failed: ${res.status}`;
    try {
      const payload = await res.json();
      if (payload.detail) detail = payload.detail;
    } catch {}
    throw new Error(detail);
  }

  return (await res.json()) as TestConnectionResponse;
}
