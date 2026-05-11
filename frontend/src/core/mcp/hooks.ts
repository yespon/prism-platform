import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  loadMCPConfig,
  updateMCPConfig,
  pingMCPServer,
  checkMCPServerHealth,
  loadAvailableMcpConfig,
  loadTenantMcpConfig,
  updateTenantMcpConfig,
  updateTenantMcpServerEnabled,
  convertAvailableToDict,
} from "./api";
import type { MCPServerConfig } from "./types";

export function useMCPConfig() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["mcpConfig"],
    queryFn: () => loadMCPConfig(),
  });
  return { config: data, isLoading, error };
}

export function useCreateMCPServer() {
  const queryClient = useQueryClient();
  const { config } = useMCPConfig();
  return useMutation({
    mutationFn: async ({ name, config: serverConfig }: { name: string; config: MCPServerConfig }) => {
      const currentConfig = config ?? { mcp_servers: {} };
      return await updateMCPConfig({
        mcp_servers: {
          ...currentConfig.mcp_servers,
          [name]: serverConfig
        }
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mcpConfig"] });
      void queryClient.invalidateQueries({ queryKey: ["availableMcpConfig"] });
      void queryClient.invalidateQueries({ queryKey: ["availableMcpConfig"] });
    },
  });
}

export function useUpdateSingleMCPServer() {
  const queryClient = useQueryClient();
  const { config } = useMCPConfig();
  return useMutation({
    mutationFn: async ({ name, config: serverConfig }: { name: string; config: MCPServerConfig }) => {
      if (!config) throw new Error("config missing");
      return await updateMCPConfig({
        mcp_servers: {
          ...config.mcp_servers,
          [name]: serverConfig
        }
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mcpConfig"] });
      void queryClient.invalidateQueries({ queryKey: ["availableMcpConfig"] });
      void queryClient.invalidateQueries({ queryKey: ["availableMcpConfig"] });
    },
  });
}

export function useDeleteMCPServer() {
  const queryClient = useQueryClient();
  const { config } = useMCPConfig();
  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      if (!config) throw new Error("config missing");
      const newConfig = { ...config.mcp_servers };
      delete newConfig[name];
      return await updateMCPConfig({
        mcp_servers: newConfig
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mcpConfig"] });
      void queryClient.invalidateQueries({ queryKey: ["availableMcpConfig"] });
      void queryClient.invalidateQueries({ queryKey: ["availableMcpConfig"] });
    },
  });
}

export function usePingMCPServer() {
  return useMutation({
    mutationFn: async ({ name, config }: { name: string; config: MCPServerConfig }) => {
      return await pingMCPServer(name, config);
    },
  });
}

export function useEnableMCPServer() {
  const queryClient = useQueryClient();
  const { config } = useMCPConfig();
  return useMutation({
    mutationFn: async ({
      serverName,
      enabled,
    }: {
      serverName: string;
      enabled: boolean;
    }) => {
      if (!config) {
        throw new Error("MCP config not found");
      }
      if (!config.mcp_servers[serverName]) {
        throw new Error(`MCP server ${serverName} not found`);
      }
      await updateMCPConfig({
        mcp_servers: {
          ...config.mcp_servers,
          [serverName]: {
            ...config.mcp_servers[serverName],
            enabled,
          },
        },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mcpConfig"] });
      void queryClient.invalidateQueries({ queryKey: ["availableMcpConfig"] });
      void queryClient.invalidateQueries({ queryKey: ["availableMcpConfig"] });
    },
  });
}

export function useAvailableMcpConfig({ enabled = true }: { enabled?: boolean } = {}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["availableMcpConfig"],
    queryFn: () => loadAvailableMcpConfig(),
    enabled,
    refetchOnWindowFocus: false,
  });

  return {
    config: data ? convertAvailableToDict(data) : {},
    rawArray: data?.mcp_servers ?? [],
    isLoading,
    error,
  };
}

export function useTenantMcpConfig({ enabled = true }: { enabled?: boolean } = {}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tenantMcpConfig"],
    queryFn: () => loadTenantMcpConfig(),
    enabled,
    refetchOnWindowFocus: false,
  });

  return {
    config: data?.mcp_servers ?? {},
    isLoading,
    error,
  };
}

export function useUpdateTenantMcpConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: Record<string, MCPServerConfig>) => updateTenantMcpConfig(config),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenantMcpConfig"] });
      void queryClient.invalidateQueries({ queryKey: ["availableMcpConfig"] });
    },
  });
}

export function useCreateTenantMCPServer() {
  const queryClient = useQueryClient();
  const { config } = useTenantMcpConfig();
  return useMutation({
    mutationFn: async ({ name, config: serverConfig }: { name: string; config: MCPServerConfig }) => {
      if (!config) throw new Error("config missing");
      return await updateTenantMcpConfig({
        ...config,
        [name]: serverConfig
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenantMcpConfig"] });
      void queryClient.invalidateQueries({ queryKey: ["availableMcpConfig"] });
    },
  });
}

export function useUpdateSingleTenantMCPServer() {
  const queryClient = useQueryClient();
  const { config } = useTenantMcpConfig();
  return useMutation({
    mutationFn: async ({ name, config: serverConfig }: { name: string; config: MCPServerConfig }) => {
      if (!config) throw new Error("config missing");
      return await updateTenantMcpConfig({
        ...config,
        [name]: serverConfig
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenantMcpConfig"] });
      void queryClient.invalidateQueries({ queryKey: ["availableMcpConfig"] });
    },
  });
}

export function useDeleteTenantMCPServer() {
  const queryClient = useQueryClient();
  const { config } = useTenantMcpConfig();
  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      if (!config) throw new Error("config missing");
      const newConfig = { ...config };
      delete newConfig[name];
      return await updateTenantMcpConfig(newConfig);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenantMcpConfig"] });
      void queryClient.invalidateQueries({ queryKey: ["availableMcpConfig"] });
    },
  });
}

export function useEnableTenantMCPServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ serverName, enabled }: { serverName: string; enabled: boolean }) => {
      return await updateTenantMcpServerEnabled(serverName, enabled);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenantMcpConfig"] });
      void queryClient.invalidateQueries({ queryKey: ["availableMcpConfig"] });
    },
  });
}

export function useCheckMCPHealth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serverName: string) => checkMCPServerHealth(serverName),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["availableMcpConfig"] });
    },
  });
}

