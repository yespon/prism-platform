import { useQuery } from "@tanstack/react-query";

import { useCurrentTenant } from "@/core/tenants/hooks";

import { loadMemory } from "./api";

export function useMemory() {
  const { data: currentTenant } = useCurrentTenant();
  const { data, isLoading, error } = useQuery({
    queryKey: ["memory", currentTenant?.tenant_id ?? null],
    queryFn: () => loadMemory(),
    refetchOnWindowFocus: false,
  });
  return { memory: data ?? null, isLoading, error };
}
