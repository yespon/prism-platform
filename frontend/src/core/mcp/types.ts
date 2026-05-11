export interface McpOAuthConfigResponse {
  enabled: boolean;
  token_url: string;
  grant_type: string;
  client_id?: string;
  client_secret?: string;
  refresh_token?: string;
  scope?: string;
  audience?: string;
  token_field: string;
  token_type_field: string;
  expires_in_field: string;
  default_token_type: string;
  refresh_skew_seconds: number;
  extra_token_params: Record<string, string>;
}

export interface MCPServerConfig {
  enabled: boolean;
  type: string; // "stdio" | "sse" | "http"
  command?: string;
  args: string[];
  env: Record<string, string>;
  url?: string;
  headers: Record<string, string>;
  oauth?: McpOAuthConfigResponse;
  description: string;
  is_builtin?: boolean;
}

export interface MCPConfig {
  mcp_servers: Record<string, MCPServerConfig>;
}

export interface AvailableMcpServerResponse extends MCPServerConfig {
  name: string; // MCP server name (included in response, not keyed)
  scope: string; // "global" | "tenant" | "user"
  source: string; // Server source classification
  managed_by_current_user: boolean; // Whether current user can manage this server
  effective_permissions: string[]; // ["read", "write", "delete", "share", ...]
  health_status: "connected" | "disconnected" | "unknown";
  last_checked_at: string | null;
}

export interface AvailableMcpConfigResponse {
  mcp_servers: AvailableMcpServerResponse[]; // Array format, not dict
}

export interface McpToolInfo {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface HealthCheckResponse {
  success: boolean;
  tools_count: number;
  tools: McpToolInfo[];
  health_status: "connected" | "disconnected" | "unknown";
  last_checked_at: string;
}
