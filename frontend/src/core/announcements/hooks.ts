import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentTenant } from "@/core/tenants";

import {
  archiveAdminAnnouncement,
  createAdminAnnouncement,
  deleteAdminAnnouncement,
  dismissAnnouncement,
  loadActiveAnnouncements,
  loadAdminAnnouncements,
  loadAdminAnnouncementDetail,
  loadAdminTenantTargets,
  loadAnnouncements,
  markAnnouncementRead,
  publishAdminAnnouncement,
  updateAdminAnnouncement,
} from "./api";
import type { CreateAnnouncementInput, UpdateAnnouncementInput } from "./types";

export function useActiveAnnouncements({ enabled = true, limit = 3 }: { enabled?: boolean; limit?: number } = {}) {
  const { data: currentTenant } = useCurrentTenant();
  const tenantId = currentTenant?.tenant_id ?? null;

  const { data, isLoading, error } = useQuery({
    queryKey: ["announcements", "active", { limit, tenantId }],
    queryFn: () => loadActiveAnnouncements(limit),
    enabled: enabled && Boolean(tenantId),
    refetchOnWindowFocus: false,
  });

  return {
    announcements: data ?? [],
    isLoading,
    error,
  };
}

export function useAnnouncementList(
  { enabled = true, includeHistory = true, limit = 100 }: { enabled?: boolean; includeHistory?: boolean; limit?: number } = {},
) {
  const { data: currentTenant } = useCurrentTenant();
  const tenantId = currentTenant?.tenant_id ?? null;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["announcements", "list", { includeHistory, limit, tenantId }],
    queryFn: () => loadAnnouncements({ includeHistory, limit }),
    enabled: enabled && Boolean(tenantId),
    refetchOnWindowFocus: false,
  });

  return {
    announcements: data ?? [],
    isLoading,
    error,
    refetch,
  };
}

export function useMarkAnnouncementRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (announcementId: number) => markAnnouncementRead(announcementId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
}

export function useDismissAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (announcementId: number) => dismissAnnouncement(announcementId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
}

export function useAdminAnnouncementList({ enabled = true }: { enabled?: boolean } = {}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["announcements", "admin", "list"],
    queryFn: loadAdminAnnouncements,
    enabled,
    refetchOnWindowFocus: false,
  });

  return {
    announcements: data ?? [],
    isLoading,
    error,
    refetch,
  };
}

export function useCreateAdminAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) => createAdminAnnouncement(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["announcements", "admin"] });
      void queryClient.invalidateQueries({ queryKey: ["announcements", "active"] });
    },
  });
}

export function usePublishAdminAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (announcementId: number) => publishAdminAnnouncement(announcementId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
}

export function useArchiveAdminAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (announcementId: number) => archiveAdminAnnouncement(announcementId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
}

export function useAdminAnnouncementDetail(
  { announcementId, enabled = true }: { announcementId: number | null; enabled?: boolean },
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["announcements", "admin", "detail", announcementId],
    queryFn: () => loadAdminAnnouncementDetail(announcementId!),
    enabled: enabled && typeof announcementId === "number",
    refetchOnWindowFocus: false,
  });

  return {
    announcement: data ?? null,
    isLoading,
    error,
    refetch,
  };
}

export function useUpdateAdminAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ announcementId, input }: { announcementId: number; input: UpdateAnnouncementInput }) =>
      updateAdminAnnouncement(announcementId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
}

export function useDeleteAdminAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (announcementId: number) => deleteAdminAnnouncement(announcementId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
}

export function useAdminTenantTargets({ enabled = true }: { enabled?: boolean } = {}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["announcements", "admin", "tenants"],
    queryFn: loadAdminTenantTargets,
    enabled,
    refetchOnWindowFocus: false,
  });

  return {
    tenants: data ?? [],
    isLoading,
    error,
    refetch,
  };
}
