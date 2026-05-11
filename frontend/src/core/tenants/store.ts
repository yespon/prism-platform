"use client";

const TENANT_STORAGE_KEY = "opsintech.current_tenant_id";

let cachedTenantId: string | null = null;
const listeners = new Set<(tenantId: string | null) => void>();

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeTenantId(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function notify(tenantId: string | null) {
  for (const listener of listeners) {
    listener(tenantId);
  }
}

export function getCurrentTenantId(): string | null {
  if (cachedTenantId !== null) {
    return cachedTenantId;
  }
  if (!isBrowser()) {
    return null;
  }
  cachedTenantId = normalizeTenantId(window.localStorage.getItem(TENANT_STORAGE_KEY));
  return cachedTenantId;
}

export function setCurrentTenantId(tenantId: string | null) {
  const normalized = normalizeTenantId(tenantId);
  cachedTenantId = normalized;

  if (isBrowser()) {
    if (normalized) {
      window.localStorage.setItem(TENANT_STORAGE_KEY, normalized);
    } else {
      window.localStorage.removeItem(TENANT_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent("opsintech:tenant-changed", { detail: { tenantId: normalized } }));
  }

  notify(normalized);
}

export function subscribeTenantChange(listener: (tenantId: string | null) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}


export function clearTenantId(): void {
  setCurrentTenantId(null);
}
