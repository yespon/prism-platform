"use client";

import { Plus, Settings2, Trash2, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import type { ChangeEvent, FocusEvent } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/core/i18n/hooks";
import { 
  useAvailableMcpConfig, 
  useEnableMCPServer, 
  useCreateMCPServer, 
  useUpdateSingleMCPServer, 
  useDeleteMCPServer, 
  usePingMCPServer, 
  useUpdateSingleTenantMCPServer, 
  useDeleteTenantMCPServer, 
  useEnableTenantMCPServer 
} from "@/core/mcp/hooks";
import type { MCPServerConfig, AvailableMcpServerResponse } from "@/core/mcp/types";
import { canManageScopedResource, isTenantAdminRole, scopeLabel } from "@/core/permissions/scope";
import { useCurrentTenant } from "@/core/tenants/hooks";
import { env } from "@/env";

import { SettingsSection } from "./settings-section";

type McpEditorState = {
  name: string;
  config: Partial<MCPServerConfig>;
};

type McpEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverState: McpEditorState | null;
};

function toMcpServerConfig(config: Partial<MCPServerConfig>): MCPServerConfig {
  return {
    enabled: config.enabled ?? true,
    type: config.type ?? "stdio",
    command: config.command,
    args: config.args ?? [],
    env: config.env ?? {},
    url: config.url,
    headers: config.headers ?? {},
    oauth: config.oauth,
    description: config.description ?? "",
    is_builtin: config.is_builtin,
  };
}

export function ToolSettingsPage({ readOnly = false }: { readOnly?: boolean } = {}) {
  const { t } = useI18n();
  const { data: currentTenant } = useCurrentTenant();
  const { config, rawArray, isLoading, error } = useAvailableMcpConfig();
  const [editingServer, setEditingServer] = useState<McpEditorState | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isTenantAdmin = isTenantAdminRole(currentTenant?.role);

  const filteredServers = (rawArray ?? []).filter(
    (server) => server.scope !== "user"
  );

  return (
    <SettingsSection
      title={t.settings.tools.title}
      description={t.settings.tools.description}
      action={null}
    >
      {isLoading ? (
        <div className="text-muted-foreground text-sm">{t.common.loading}</div>
      ) : error ? (
        <div>Error: {error.message}</div>
      ) : (
        config && (
          <MCPServerList
            servers={filteredServers}
            readOnly={readOnly}
            onEdit={(name, cfg) => {
              setEditingServer({name, config: cfg});
              setIsDialogOpen(true);
            }}
          />
        )
      )}

      <McpEditDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        serverState={editingServer}
        readOnly={readOnly}
        isTenantAdmin={isTenantAdmin}
      />
    </SettingsSection>
  );
}

function McpEditDialog({ open, onOpenChange, serverState, isTenantAdmin, readOnly = false }: McpEditDialogProps & { isTenantAdmin: boolean; readOnly?: boolean }) {
  const { t } = useI18n();
  const [state, setState] = useState(serverState);
  const { mutateAsync: pingAsync, isPending: isPinging } = usePingMCPServer();
  const { mutateAsync: createAsync, isPending: isCreating } = useCreateMCPServer();
  const { mutateAsync: updateAsync, isPending: isUpdating } = useUpdateSingleMCPServer();
  const { mutateAsync: updateTenantAsync } = useUpdateSingleTenantMCPServer();
  
  const { config, rawArray } = useAvailableMcpConfig();

  const existingServer = rawArray.find(s => s.name === state?.name);
  const isNew = !existingServer && Boolean(state?.name);
  const selectedServerName = serverState?.name ?? "";

  if (serverState !== state && open) {
    setState(serverState);
  }

  const handleSave = async () => {
    if (readOnly) {
      toast.error("个人设置为只读视图，请前往租户治理进行编辑");
      return;
    }

    if (!state?.name) {
      toast.error("Please enter a sever name");
      return;
    }

    try {
      const normalizedConfig = toMcpServerConfig(state.config);

      if (state.config.type === "stdio") {
         await pingAsync({ name: state.name, config: normalizedConfig });
         toast.success("Connection test successful. Saving...");
      }

      if (serverState?.name && existingServer) {
        if (existingServer.scope === "tenant") {
          if (!isTenantAdmin) {
            toast.error("仅租户管理员可编辑租户共享工具");
            return;
          }
          await updateTenantAsync({ name: state.name, config: normalizedConfig });
        } else {
          toast.error("仅租户管理员可管理租户共享工具");
          return;
        }
      } else {
        toast.error("工具创建入口已禁用");
        return;
      }
      toast.success("Saved successfully");
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Operation failed");
    }
  };

  if (!state) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{config?.mcp_servers?.[selectedServerName] ? t.settings.tools.editServer : t.settings.tools.registerTool}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">{t.settings.tools.serverName}</label>
            <Input 
              value={state.name} 
              disabled={!isNew && !!config?.mcp_servers?.[selectedServerName]} 
              onChange={(e: ChangeEvent<HTMLInputElement>) => setState({...state, name: e.target.value})} 
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">{t.settings.tools.type}</label>
            <Select 
              value={state.config.type ?? "stdio"} 
              onValueChange={(v: string) => setState({...state, config: {...state.config, type: v}})}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="stdio">stdio</SelectItem>
                <SelectItem value="sse">sse</SelectItem>
                <SelectItem value="http">http</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {state.config.type === "stdio" ? (
            <>
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t.settings.tools.command}</label>
                <Input 
                  value={state.config.command ?? ""} 
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setState({...state, config: {...state.config, command: e.target.value}})} 
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t.settings.tools.args}</label>
                <Input 
                  value={JSON.stringify(state.config.args ?? [])} 
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    try {
                      const arr = JSON.parse(e.target.value);
                      if (Array.isArray(arr)) {
                        setState({...state, config: {...state.config, args: arr}});
                      }
                    } catch {}
                  }}
                />
              </div>
            </>
          ) : (
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t.settings.tools.url}</label>
              <Input 
                value={state.config.url ?? ""} 
                onChange={(e: ChangeEvent<HTMLInputElement>) => setState({...state, config: {...state.config, url: e.target.value}})} 
              />
            </div>
          )}

          <div className="grid gap-2">
            <label className="text-sm font-medium">{t.settings.tools.envVars}</label>
            <EnvEditor 
              env={state.config.env ?? {}} 
              onChange={(envMap: Record<string, string>) => setState({...state, config: {...state.config, env: envMap}})} 
            />
          </div>

          <div className="grid gap-2 mt-2">
            <label className="text-sm font-medium">Description</label>
            <Input 
              value={state.config.description ?? ""} 
              onChange={(e: ChangeEvent<HTMLInputElement>) => setState({...state, config: {...state.config, description: e.target.value}})} 
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.settings.tools.cancel}</Button>
          <Button onClick={handleSave} disabled={isPinging || isCreating || isUpdating}>
            {(isPinging || isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t.settings.tools.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EnvEditor({ env, onChange }: { env: Record<string, string>; onChange: (env: Record<string, string>) => void }) {
  const { t } = useI18n();
  const [showMask, setShowMask] = useState<Record<string, boolean>>({});

  const updateKey = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    const newEnv = { ...env };
    newEnv[newKey] = newEnv[oldKey] ?? "";
    delete newEnv[oldKey];
    onChange(newEnv);
  };

  const updateValue = (key: string, val: string) => {
    onChange({...env, [key]: val});
  };

  const deleteKey = (key: string) => {
    const newEnv = { ...env };
    delete newEnv[key];
    onChange(newEnv);
  };

  const addRow = () => {
    onChange({...env, [""]: ""});
  };

  return (
    <div className="space-y-2">
      {Object.entries(env).map(([k, v], i) => {
        const isMasked = showMask[k] !== false;
        return (
          <div key={i} className="flex gap-2 items-center">
            <Input 
              className="w-1/3" 
              placeholder="Key" 
              defaultValue={k} 
              onBlur={(e: FocusEvent<HTMLInputElement>) => {
                if(e.target.value !== k) {
                  updateKey(k, e.target.value);
                }
              }} 
            />
            <div className="relative flex-1 flex items-center">
              <Input 
                type={isMasked ? "password" : "text"}
                className="w-full pr-10" 
                placeholder="Value" 
                value={v} 
                onChange={(e: ChangeEvent<HTMLInputElement>) => updateValue(k, e.target.value)} 
              />
              <Button type="button" variant="ghost" size="icon" className="absolute right-0" onClick={() => setShowMask({...showMask, [k]: !isMasked})}>
                {isMasked ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={() => deleteKey(k)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        );
      })}
      <Button size="sm" variant="outline" onClick={addRow} className="mt-2 text-xs h-7">{t.settings.tools.addVar}</Button>
    </div>
  );
}

function MCPServerList({
  servers,
  readOnly = false,
  onEdit
}: {
  servers: AvailableMcpServerResponse[];
  readOnly?: boolean;
  onEdit: (name: string, config: MCPServerConfig) => void;
}) {
  const { t } = useI18n();
  const { data: currentTenant } = useCurrentTenant();
  const isTenantAdmin = isTenantAdminRole(currentTenant?.role);
  const { mutate: enableMCPServer } = useEnableMCPServer();
  const { mutate: deleteMCPServer } = useDeleteMCPServer();
  const { mutate: enableTenantMCPServer } = useEnableTenantMCPServer();
  const { mutate: deleteTenantMCPServer } = useDeleteTenantMCPServer();

  const handleDelete = (name: string, scope?: string) => {
    if(confirm(`${t.settings.tools.deleteConfirm} ${name}?`)) {
      if (scope === "tenant") {
        deleteTenantMCPServer({ name });
      } else {
        deleteMCPServer({ name });
      }
    }
  };

  // 去重：根据 server.name 去重
  const uniqueServers = useMemo(() => {
    const seen = new Set<string>();
    return servers.filter((server) => {
      if (seen.has(server.name)) {
        return false;
      }
      seen.add(server.name);
      return true;
    });
  }, [servers]);

  return (
    <div className="divide-y border rounded-lg bg-card w-full">
      {uniqueServers.map((server, index) => {
        const name = server.name;
        const config = server;
        const isBuiltIn = false;

        const scopeBadgeStyle = {
          global: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
          tenant: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
          user: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
        }[server.scope ?? "user"] ?? "bg-muted text-muted-foreground";
        
        const canManage =
            !readOnly &&
          server.scope === "tenant" &&
          isTenantAdmin &&
          canManageScopedResource(server.scope, server.managed_by_current_user);

        // 使用组合 key 避免重复
        const uniqueKey = `${name}-${index}`;

        return (
          <div key={uniqueKey} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary font-bold text-sm shrink-0">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm truncate">{name}</h3>
                  <span className="px-1.5 py-0.5 text-[0.65rem] uppercase font-semibold bg-muted text-muted-foreground rounded-sm shrink-0">
                    {config.type}
                  </span>
                  <span className={`px-1.5 py-0.5 text-[0.65rem] uppercase font-semibold rounded-sm border shrink-0 ${scopeBadgeStyle}`}>
                    {scopeLabel(server.scope ?? "user")}
                  </span>
                  {isBuiltIn && (
                    <span className="px-1.5 py-0.5 text-[0.65rem] uppercase font-semibold bg-blue-500/10 text-blue-500 rounded-sm shrink-0">
                      {t.settings.tools.builtIn}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {config.description ?? t.settings.tools.noDescription}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <div className="flex items-center text-xs text-muted-foreground">
                <span className={`flex h-2 w-2 rounded-full mr-1.5 ${config.enabled ? 'bg-emerald-500' : 'bg-muted-foreground'}`}></span>
                {config.enabled ? t.settings.tools.active : t.settings.tools.disabled}
              </div>
              <Switch
                checked={config.enabled}
                disabled={env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true" || !canManage}
                onCheckedChange={(checked) => {
                  if (server.scope === "tenant") {
                    enableTenantMCPServer({ serverName: name, enabled: checked });
                  }
                }}
              />
              {!isBuiltIn && canManage ? (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(name, config)}>
                    <Settings2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(name, server.scope)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 h-8 px-2">
                  <Lock className="h-3.5 w-3.5" />
                  只读
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
