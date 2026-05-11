"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

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
}

interface ResetUserPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
  onSuccess: () => void;
}

export function ResetUserPasswordDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: ResetUserPasswordDialogProps) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setPassword("");
      setMustChangePassword(true);
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetchAuthApi(`/api/admin/users/${user.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_password: password,
          must_change_password: mustChangePassword,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail ?? t.admin.users.resetPasswordDialog.resetError);
      }

      onSuccess();
      handleClose(false);
      alert(t.admin.users.resetPasswordDialog.resetSuccess);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.admin.users.resetPasswordDialog.resetError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t.admin.users.resetPasswordDialog.title}</DialogTitle>
          <DialogDescription>
            {t.admin.users.resetPasswordDialog.description.replace("{user}", user?.email ?? user?.id ?? "-")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error ? (
            <div className="text-red-500 text-sm p-3 bg-red-50 dark:bg-red-950/30 rounded-md">
              {error}
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium">{t.admin.users.resetPasswordDialog.newPasswordLabel}</label>
            <Input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.admin.users.resetPasswordDialog.newPasswordPlaceholder}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="must-change-password"
              type="checkbox"
              checked={mustChangePassword}
              onChange={(e) => setMustChangePassword(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-700"
            />
            <label htmlFor="must-change-password" className="text-sm select-none cursor-pointer">
              {t.admin.users.resetPasswordDialog.mustChangePassword}
            </label>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleClose(false)}
            >
              {t.admin.users.resetPasswordDialog.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting || !password.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  {t.admin.users.resetPasswordDialog.submitting}
                </>
              ) : (
                t.admin.users.resetPasswordDialog.confirm
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
