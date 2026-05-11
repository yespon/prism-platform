import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { deleteModel, loadModels, registerModel, updateModel, loadAvailableModels, loadTenantModels, registerTenantModel, updateTenantModel, deleteTenantModel, testModelConnection } from "./api";
import type { RegisterModelInput, Model, TestConnectionInput, TestConnectionResponse } from "./types";

const STORAGE_KEY = "opsintech:models:disabled";

export function getDisabledModelsStore(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function setDisabledModelsStore(disabled: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(disabled));
}

export function useModels({ enabled = true }: { enabled?: boolean } = {}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["models"],
    queryFn: () => loadModels(),
    enabled,
    refetchOnWindowFocus: false,
  });
  return { models: data ?? [], isLoading, error };
}

export function useActiveModels({ enabled = true }: { enabled?: boolean } = {}) {
  const { models, isLoading, error } = useModels({ enabled });
  const [active, setActive] = useState<Model[]>(models);

  useEffect(() => {
    if (!models.length) return;
    const disabled = getDisabledModelsStore();
    setActive(models.filter((m) => !disabled.includes(m.name)));
  }, [models]);

  useEffect(() => {
    const handleStorage = () => {
      const disabled = getDisabledModelsStore();
      setActive(models.filter((m) => !disabled.includes(m.name)));
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [models]);

  return { models: active, isLoading, error };
}

export function useRegisterModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterModelInput) => registerModel(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["models"] });
    },
  });
}

export function useUpdateModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, input }: { name: string; input: Partial<RegisterModelInput> }) => updateModel(name, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["models"] });
    },
  });
}

export function useDeleteModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteModel(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["models"] });
    },
  });
}

export function useAvailableModels({ enabled = true }: { enabled?: boolean } = {}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["availableModels"],
    queryFn: () => loadAvailableModels(),
    enabled,
    refetchOnWindowFocus: false,
  });

  return {
    models: data ?? [],
    isLoading,
    error,
  };
}

export function useTenantModels({ enabled = true }: { enabled?: boolean } = {}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tenantModels"],
    queryFn: () => loadTenantModels(),
    enabled,
    refetchOnWindowFocus: false,
  });

  return {
    models: data ?? [],
    isLoading,
    error,
  };
}

export function useRegisterTenantModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterModelInput) => registerTenantModel(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["availableModels"] });
      void queryClient.invalidateQueries({ queryKey: ["tenantModels"] });
    },
  });
}

export function useUpdateTenantModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, input }: { name: string; input: Partial<RegisterModelInput> }) => updateTenantModel(name, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["availableModels"] });
      void queryClient.invalidateQueries({ queryKey: ["tenantModels"] });
    },
  });
}

export function useDeleteTenantModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteTenantModel(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["availableModels"] });
      void queryClient.invalidateQueries({ queryKey: ["tenantModels"] });
    },
  });
}

export function useTestModelConnection() {
  return useMutation({
    mutationFn: (input: TestConnectionInput) => testModelConnection(input),
  });
}

