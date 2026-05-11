"use client";

import { useMemo } from "react";

import {
  useActiveAnnouncements,
  useDismissAnnouncement,
  useMarkAnnouncementRead,
} from "@/core/announcements";
import { useI18n } from "@/core/i18n/hooks";
import { cn } from "@/lib/utils";

const severityClassMap: Record<string, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-red-200 bg-red-50 text-red-900",
};

export function AnnouncementBanner({ limit = 3 }: { limit?: number }) {
  const { t } = useI18n();
  const { announcements } = useActiveAnnouncements({ limit });
  const markReadMutation = useMarkAnnouncementRead();
  const dismissMutation = useDismissAnnouncement();

  const visibleItems = useMemo(
    () => announcements.filter((item) => !item.read_state?.is_dismissed),
    [announcements],
  );

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 px-4 py-3 md:px-6">
      {visibleItems.map((item) => {
        const severityCls = severityClassMap[item.severity] ?? "border-zinc-200 bg-zinc-50 text-zinc-900";
        return (
          <div
            key={item.id}
            className={cn("rounded-lg border px-3 py-2 text-sm", severityCls)}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">{item.title}</div>
              <div className="flex items-center gap-2">
                {!item.read_state?.is_read && (
                  <button
                    type="button"
                    className="rounded border border-current/30 px-2 py-0.5 text-xs"
                    onClick={() => markReadMutation.mutate(item.id)}
                  >
                    {t.announcementsBanner.markRead}
                  </button>
                )}
                <button
                  type="button"
                  className="rounded border border-current/30 px-2 py-0.5 text-xs"
                  onClick={() => dismissMutation.mutate(item.id)}
                >
                  {t.announcementsBanner.ignore}
                </button>
              </div>
            </div>
            <div className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs opacity-90">{item.content}</div>
          </div>
        );
      })}
    </div>
  );
}