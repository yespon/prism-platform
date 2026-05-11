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

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateUserDialog({ open, onOpenChange, onSuccess }: CreateUserDialogProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [mustChangePassword, setMustChangePassword] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetchAuthApi("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          name,
          password,
          role,
          status: "active",
          must_change_password: mustChangePassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? t.admin.users.createDialog.createError);
      }

      onSuccess();
      onOpenChange(false);
      // Reset form
      setEmail("");
      setName("");
      setPassword("");
      setRole("user");
      setMustChangePassword(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t.admin.users.createDialog.internalError);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t.admin.users.createDialog.title}</DialogTitle>
          <DialogDescription>
            {t.admin.users.createDialog.description}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="text-red-500 text-sm p-3 bg-red-50 dark:bg-red-950/30 rounded-md">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.admin.users.createDialog.emailLabel}</label>
            <Input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder={t.admin.users.createDialog.emailPlaceholder}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t.admin.users.createDialog.nameLabel}</label>
            <Input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder={t.admin.users.createDialog.namePlaceholder}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t.admin.users.createDialog.passwordLabel}</label>
            <Input 
              type="text" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder={t.admin.users.createDialog.passwordPlaceholder}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t.admin.users.createDialog.roleLabel}</label>
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="user">{t.admin.users.createDialog.roleUser}</option>
              <option value="admin">{t.admin.users.createDialog.roleAdmin}</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox" 
              id="mustChange" 
              checked={mustChangePassword} 
              onChange={(e) => setMustChangePassword(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-700"
            />
            <label htmlFor="mustChange" className="text-sm cursor-pointer select-none">
              {t.admin.users.createDialog.mustChangePassword}
            </label>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t.admin.users.createDialog.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  {t.admin.users.createDialog.submitting}
                </>
              ) : (
                t.admin.users.createDialog.confirm
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
