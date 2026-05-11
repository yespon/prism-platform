"use client";

import { AlertTriangleIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchAuthApi } from "@/core/api/auth-client";
import { useI18n } from "@/core/i18n/hooks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId?: string;
  tenantName?: string;
  onSuccess: () => void;
}

export function DeleteTenantDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
  onSuccess,
}: Props) {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!tenantId) return;

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetchAuthApi(`/api/admin/tenants/${tenantId}/purge`, {
        method: "DELETE",
      });

      if (!res.ok) {
        let msg = t.admin.tenants.deleteDialog.deleteError;
        try {
          const data = await res.json();
          if (typeof data?.detail === "string" && data.detail.trim()) {
            msg = data.detail;
          }
        } catch {}
        throw new Error(msg);
      }

      toast.success(t.admin.tenants.deleteDialog.deleteSuccess);
      onSuccess();
      onOpenChange(false);
    } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="shrink-0 size-10 rounded-full bg-red-100 flex items-center justify-center dark:bg-red-900/30">
              <AlertTriangleIcon className="size-5 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-red-600 dark:text-red-500">
                {t.admin.tenants.deleteDialog.title}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {t.admin.tenants.deleteDialog.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 text-sm bg-red-50 text-red-600 rounded-md border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50">
            {error}
          </div>
        )}

        <div className="py-2 space-y-4">
          <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">
            {t.admin.tenants.deleteDialog.warning}{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
              {tenantName}
            </span>
          </p>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 p-3 bg-red-50 dark:bg-red-900/10 rounded border border-red-100 dark:border-red-900/30">
            <strong>{t.admin.tenants.deleteDialog.impactTitle}</strong>
            <br />
            {t.admin.tenants.deleteDialog.impact1}
            <br />
            {t.admin.tenants.deleteDialog.impact2}
            <br />
            {t.admin.tenants.deleteDialog.impact3}
          </p>

          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t.admin.tenants.deleteDialog.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? t.admin.tenants.deleteDialog.processing : t.admin.tenants.deleteDialog.confirmDelete}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
