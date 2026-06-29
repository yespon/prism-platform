"use client";

import { Loader2Icon, UserPenIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAuthApi } from "@/core/api/auth-client";
import { useI18n } from "@/core/i18n/hooks";

interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  status: string | null;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
  onSuccess: () => void;
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: EditUserDialogProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setEmail(user.email ?? "");
      setRole(user.role ?? "user");
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim() || !email.trim()) {
      toast.error(t.admin.users.editUser.validationError);
      return;
    }

    setSaving(true);
    try {
      const res = await fetchAuthApi(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { detail?: string }).detail ?? t.admin.users.editUser.saveError
        );
      }
      toast.success(t.admin.users.editUser.saveSuccess);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t.admin.users.editUser.saveError
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPenIcon className="h-5 w-5 text-indigo-500" />
            {t.admin.users.editUser.title}
          </DialogTitle>
          <DialogDescription>
            {t.admin.users.editUser.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="edit-user-name" className="text-sm font-medium">
              {t.admin.users.editUser.nameLabel}
            </label>
            <Input
              id="edit-user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.admin.users.editUser.namePlaceholder}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-user-email" className="text-sm font-medium">
              {t.admin.users.editUser.emailLabel}
            </label>
            <Input
              id="edit-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.admin.users.editUser.emailPlaceholder}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-user-role" className="text-sm font-medium">
              {t.admin.users.editUser.roleLabel}
            </label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="edit-user-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  {t.admin.users.editUser.roleUser}
                </SelectItem>
                <SelectItem value="admin">
                  {t.admin.users.editUser.roleAdmin}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t.admin.users.editUser.cancel}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                {t.admin.users.editUser.saving}
              </>
            ) : (
              t.admin.users.editUser.save
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
