export interface PluginInfo {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  frontendNavIds: string[];
}

export interface PluginsResponse {
  plugins: PluginInfo[];
}

export async function fetchPlugins(): Promise<PluginsResponse> {
  const resp = await fetch("/api/plugins");
  if (!resp.ok) {
    throw new Error(`Failed to fetch plugins: ${resp.status}`);
  }
  return resp.json();
}