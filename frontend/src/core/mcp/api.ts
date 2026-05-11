import { getAuthHeaders } from "@/core/api/auth-client";
import { getBackendBaseURL } from "@/core/config";

import type { MCPConfig, MCPServerConfig, AvailableMcpConfigResponse, HealthCheckResponse } from "./types";

type PingMCPServerConfig = {
  type?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  description?: string;
};

export async function loadMCPConfig() {
  const response = await fetch(`${getBackendBaseURL()}/api/mcp/config`, {
    headers: await getAuthHeaders(),
  });
  return response.json() as Promise<MCPConfig>;
}

export async function updateMCPConfig(config: MCPConfig) {
  const response = await fetch(`${getBackendBaseURL()}/api/mcp/config`, {
    method: "PUT",
    headers: await getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(config),
  });
  return response.json();
}

export async function pingMCPServer(name: string, config: PingMCPServerConfig) {
  void name;
  const response = await fetch(`${getBackendBaseURL()}/api/mcp/ping`, {
    method: "POST",
    headers: await getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      enabled: true,
      type: config.type,
      command: config.command,
      args: config.args ?? [],
      env: config.env ?? {},
      url: config.url,
      headers: config.headers ?? {},
      description: config.description ?? "",
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to ping MCP server");
  }
  return response.json();
}

export async function loadAvailableMcpConfig() {
  const response = await fetch(`${getBackendBaseURL()}/api/mcp/available`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to load available MCP config: ${response.status}`);
  }

  return response.json() as Promise<AvailableMcpConfigResponse>;
}

export async function loadTenantMcpConfig() {
  const response = await fetch(`${getBackendBaseURL()}/api/tenants/mcp/config`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to load tenant MCP config: ${response.status}`);
  }

  return response.json() as Promise<{ mcp_servers: Record<string, MCPServerConfig> }>;
}

export async function updateTenantMcpConfig(config: Record<string, MCPServerConfig>) {
  const response = await fetch(`${getBackendBaseURL()}/api/tenants/mcp/config`, {
    method: "PUT",
    headers: await getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ mcp_servers: config }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update tenant MCP config: ${response.status}`);
  }

  return response.json();
}

export async function updateTenantMcpServerEnabled(name: string, enabled: boolean) {
  const response = await fetch(`${getBackendBaseURL()}/api/tenants/mcp/${encodeURIComponent(name)}/enabled`, {
    method: "PATCH",
    headers: await getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ enabled }),
  });

  if (!response.ok) {
    let detail = `Failed to update tenant MCP server status: ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) detail = payload.detail;
    } catch {
      // Ignore non-JSON response bodies.
    }
    throw new Error(detail);
  }

  return response.json();
}

export async function checkMCPServerHealth(serverName: string) {
  const response = await fetch(
    `${getBackendBaseURL()}/api/mcp/check-health/${encodeURIComponent(serverName)}`,
    {
      method: "POST",
      headers: await getAuthHeaders(),
    },
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to check MCP server health");
  }
  return response.json() as Promise<HealthCheckResponse>;
}

/**
 * Helper to convert the array format to the dictionary format expected by the UI
 */
export function convertAvailableToDict(available: AvailableMcpConfigResponse): Record<string, MCPServerConfig> {
  const result: Record<string, MCPServerConfig> = {};
  if (!available?.mcp_servers) return result;
  
  for (const server of available.mcp_servers) {
    result[server.name] = server;
  }
  return result;
}
