"use client";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchAuthApi } from "@/core/api/auth-client";
import { useI18n } from "@/core/i18n/hooks";

interface EditTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
    tenant_type?: string;
  } | null;
  onSuccess: () => void;
}

export function EditTenantDialog({
  open,
  onOpenChange,
  tenant,
  onSuccess,
}: EditTenantDialogProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("active");
  const [tenantType, setTenantType] = useState("ops");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name);
      setSlug(tenant.slug);
      setStatus(tenant.status === "active" ? "active" : "inactive");
      setTenantType(tenant.tenant_type || "ops");
    } else {
      setName("");
      setSlug("");
      setStatus("active");
      setTenantType("ops");
    }
    setError(null);
  }, [tenant, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    
    setLoading(true);
    setError(null);

    try {
      const res = await fetchAuthApi(`/api/admin/tenants/${tenant.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          slug,
          status,
          tenant_type: tenantType,
        }),
      });

      if (!res.ok) {
        let msg = t.admin.tenants.editDialog.editError;
        try {
          const data = await res.json();
          if (data.detail) msg = data.detail;
        } catch {}
        throw new Error(msg);
      }

      toast.success(t.admin.tenants.editDialog.editSuccess);
      onSuccess();
      onOpenChange(false);
    } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t.admin.tenants.editDialog.title}</DialogTitle>
            <DialogDescription>{t.admin.tenants.editDialog.description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">{t.admin.tenants.editDialog.nameLabel}</label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.admin.tenants.editDialog.namePlaceholder}
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="slug" className="text-sm font-medium">{t.admin.tenants.editDialog.slugLabel}</label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={t.admin.tenants.editDialog.slugPlaceholder}
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="status" className="text-sm font-medium">{t.admin.tenants.editDialog.statusLabel}</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder={t.admin.tenants.editDialog.statusPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t.admin.tenants.editDialog.statusActive}</SelectItem>
                  <SelectItem value="inactive">{t.admin.tenants.editDialog.statusInactive}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t.admin.tenants.editDialog.typeLabel}</label>
              <div className="flex gap-2">
                {(['ops', 'product', 'rd'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTenantType(type)}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors border ${
                      tenantType === type
                        ? type === 'product'
                          ? 'bg-violet-50 border-violet-300 text-violet-700 dark:bg-violet-900/20 dark:border-violet-700 dark:text-violet-400'
                          : type === 'rd'
                          ? 'bg-cyan-50 border-cyan-300 text-cyan-700 dark:bg-cyan-900/20 dark:border-cyan-700 dark:text-cyan-400'
                          : 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400'
                        : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {type === 'product' ? t.admin.tenants.types.product :
                     type === 'rd' ? t.admin.tenants.types.rd :
                     t.admin.tenants.types.ops}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t.admin.tenants.editDialog.cancel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t.admin.tenants.editDialog.saving : t.admin.tenants.editDialog.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
