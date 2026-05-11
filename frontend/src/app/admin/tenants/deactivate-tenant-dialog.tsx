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

export function DeactivateTenantDialog({
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

      const res = await fetchAuthApi(`/api/admin/tenants/${tenantId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(t.admin.tenants.deactivateDialog.deactivateError);
      }

      toast.success(t.admin.tenants.deactivateDialog.deactivateSuccess);
      onSuccess();
      onOpenChange(false);
    } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="shrink-0 size-10 rounded-full bg-red-100 flex items-center justify-center dark:bg-red-900/30">
              <AlertTriangleIcon className="size-5 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-red-600 dark:text-red-500">
                {t.admin.tenants.deactivateDialog.title}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {t.admin.tenants.deactivateDialog.description}
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
          <p className="text-zinc-700 dark:text-zinc-300 text-sm">
            {t.admin.tenants.deactivateDialog.confirmText}{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
              {tenantName}
            </span>{" "}
            {t.admin.tenants.deactivateDialog.confirmSuffix}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 p-3 bg-red-50 dark:bg-red-900/10 rounded border border-red-100 dark:border-red-900/30">
            <strong>{t.admin.tenants.deactivateDialog.noteTitle}</strong>
            <br />
            {t.admin.tenants.deactivateDialog.note1}
            <br />
            {t.admin.tenants.deactivateDialog.note2}
          </p>

          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t.admin.tenants.deactivateDialog.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
              className="min-w-[100px]"
            >
              {isLoading ? t.admin.tenants.deactivateDialog.processing : t.admin.tenants.deactivateDialog.confirmDeactivate}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
