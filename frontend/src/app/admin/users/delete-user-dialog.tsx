"use client";

import { Loader2Icon, AlertTriangleIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fetchAuthApi } from "@/core/api/auth-client";
import { useI18n } from "@/core/i18n/hooks";

interface AdminUser {
  id: string;
  email: string | null;
  isBootstrapAdmin?: boolean;
}

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
  onSuccess: () => void;
}

export function DeleteUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: DeleteUserDialogProps) {
  const { t } = useI18n();
  const [confirmInput, setConfirmInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmText = useMemo(() => user?.email ?? user?.id ?? "", [user]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConfirmInput("");
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleDelete = async () => {
    if (!user) return;
    if (user.isBootstrapAdmin) {
      setError(t.admin.users.deleteDialog.bootstrapDeleteForbidden);
      return;
    }
    if (confirmInput !== confirmText) {
      setError(t.admin.users.deleteDialog.confirmMismatch);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetchAuthApi(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.detail ?? t.admin.users.deleteDialog.deleteError);
      }

      onSuccess();
      handleClose(false);
      alert(
        [
          `${t.admin.users.deleteDialog.deleteSuccess}: ${data?.user_id ?? user.id}`,
          `${t.admin.users.deleteDialog.deletedSessions}: ${data?.deleted_sessions ?? 0}`,
          `${t.admin.users.deleteDialog.deletedAccounts}: ${data?.deleted_accounts ?? 0}`,
          `${t.admin.users.deleteDialog.deletedFiles}: ${data?.deleted_files ?? 0}`,
        ].join("\n"),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t.admin.users.deleteDialog.deleteError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangleIcon className="size-5" />
            {t.admin.users.deleteDialog.title}
          </DialogTitle>
          <DialogDescription>
            {t.admin.users.deleteDialog.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-3 text-sm text-red-700 dark:text-red-300 space-y-1">
            <div>{t.admin.users.deleteDialog.warning}</div>
            <div>{t.admin.users.deleteDialog.dataToDelete}</div>
            <div>{t.admin.users.deleteDialog.account}</div>
            <div>{t.admin.users.deleteDialog.sessions}</div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t.admin.users.deleteDialog.confirmLabel.replace("{confirmText}", confirmText || "-")}
            </label>
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={confirmText || t.admin.users.deleteDialog.confirmPlaceholder}
            />
          </div>

          {error ? (
            <div className="text-red-500 text-sm p-3 bg-red-50 dark:bg-red-950/30 rounded-md">
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => handleClose(false)}
          >
            {t.admin.users.deleteDialog.cancel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isSubmitting || confirmInput !== confirmText || !confirmText}
            onClick={() => { void handleDelete(); }}
          >
            {isSubmitting ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                {t.admin.users.deleteDialog.deleting}
              </>
            ) : (
              t.admin.users.deleteDialog.confirmDelete
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
