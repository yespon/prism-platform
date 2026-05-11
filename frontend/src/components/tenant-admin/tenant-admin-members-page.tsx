"use client";

import { PlusIcon, Trash2Icon, UserCheckIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { useI18n } from "@/core/i18n/hooks";
import { isTenantAdminRole } from "@/core/permissions/scope";
import type { TenantMemberRole, TenantSelectableUser } from "@/core/tenants/api";
import {
  useAddTenantMembersByEmail,
  useCurrentTenant,
  useRemoveTenantMember,
  useTenantMembers,
  useTenantSelectableUsers,
  useUpdateTenantMemberRole,
  useUpdateTenantMemberStatus,
} from "@/core/tenants/hooks";

// Email tag input component with autocomplete
function EmailTagInput({
  emails,
  onChange,
  placeholder,
}: {
  emails: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
}) {
  const { t } = useI18n();
  const [inputValue, setInputValue] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search for users when input has 2+ characters
  const queryEnabled = inputValue.trim().length >= 2;
  const { data: suggestions = [], isLoading } = useTenantSelectableUsers({
    enabled: queryEnabled,
    keyword: inputValue,
    limit: 10,
  });

  // Filter out already selected emails
  const filteredSuggestions = suggestions.filter(
    (user) => user.email && !emails.includes(user.email.toLowerCase()),
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update dropdown visibility
  useEffect(() => {
    setIsOpen(queryEnabled && filteredSuggestions.length > 0);
    setHighlightedIndex(0);
  }, [inputValue, filteredSuggestions.length, queryEnabled]);

  const addEmail = (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error(`${t.tenantAdmin.members.invalidEmail}: ${trimmed}`);
      return;
    }
    if (!emails.includes(trimmed)) {
      onChange([...emails, trimmed]);
    }
    setInputValue("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const removeEmail = (email: string) => {
    onChange(emails.filter((e) => e !== email));
  };

  const handleSelectUser = (user: TenantSelectableUser) => {
    if (user.email) {
      addEmail(user.email);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle dropdown navigation
    if (isOpen && filteredSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredSuggestions[highlightedIndex];
        if (selected) {
          handleSelectUser(selected);
        }
        return;
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }
    }

    // Handle tag input
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addEmail(inputValue);
    }
    if (e.key === "Backspace" && !inputValue && emails.length > 0) {
      const lastEmail = emails[emails.length - 1];
      if (lastEmail) {
        removeEmail(lastEmail);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const pastedEmails = pastedText
      .split(/[,\s\n]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));

    const newEmails = [...emails];
    for (const email of pastedEmails) {
      if (!newEmails.includes(email)) {
        newEmails.push(email);
      }
    }
    onChange(newEmails);
    setInputValue("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex flex-wrap gap-2">
          {emails.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
            >
              {email}
              <button
                type="button"
                onClick={() => removeEmail(email)}
                className="ml-1 rounded-full p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-800"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={() => {
              if (queryEnabled && filteredSuggestions.length > 0) {
                setIsOpen(true);
              }
            }}
            placeholder={emails.length === 0 ? placeholder : ""}
            className="h-7 min-w-[120px] flex-1 border-0 bg-transparent p-0 text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {/* Autocomplete dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="max-h-[200px] overflow-auto py-1">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {t.tenantAdmin.members.searchLoading}
              </div>
            ) : filteredSuggestions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {t.tenantAdmin.members.searchNoResults}
              </div>
            ) : (
              filteredSuggestions.map((user, index) => (
                <button
                  key={user.user_id}
                  type="button"
                  onClick={() => handleSelectUser(user)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-accent ${
                    index === highlightedIndex ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {user.name ?? user.email}
                      </span>
                      {user.name && user.email && (
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      )}
                    </div>
                    {user.already_member ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                        <UserCheckIcon className="h-3 w-3" />
                        {t.tenantAdmin.members.alreadyMember}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t.tenantAdmin.members.clickToAdd}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Add members dialog component
function AddMembersDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { t } = useI18n();
  const [emails, setEmails] = useState<string[]>([]);
  const [role, setRole] = useState<TenantMemberRole>("tenant_member");
  const { mutateAsync: addMembers, isPending } = useAddTenantMembersByEmail();

  const handleSubmit = async () => {
    if (emails.length === 0) {
      toast.error(t.tenantAdmin.members.emailRequired);
      return;
    }

    try {
      const result = await addMembers({ emails, role });

      if (result.success.length > 0) {
        toast.success(t.tenantAdmin.members.addSuccessCount(result.success.length));
      }

      if (result.alreadyMember.length > 0) {
        toast.info(
          `${t.tenantAdmin.members.alreadyMembersCount(result.alreadyMember.length)}: ${result.alreadyMember.map((m) => m.email).join(", ")}`,
        );
      }

      if (result.notFound.length > 0) {
        toast.error(
          `${t.tenantAdmin.members.notFoundUsers}: ${result.notFound.join(", ")}`,
        );
      }

      if (result.success.length > 0) {
        setEmails([]);
        onOpenChange(false);
        onSuccess();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.tenantAdmin.members.addError);
    }
  };

  const handleClose = () => {
    if (!isPending) {
      setEmails([]);
      setRole("tenant_member");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t.tenantAdmin.members.addTitle}</DialogTitle>
          <DialogDescription>
            {t.tenantAdmin.members.addDesc}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.tenantAdmin.members.emailLabel}</label>
            <EmailTagInput
              emails={emails}
              onChange={setEmails}
              placeholder={t.tenantAdmin.members.emailPlaceholder}
            />
            <p className="text-xs text-muted-foreground">
              {t.tenantAdmin.members.emailHint}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t.tenantAdmin.members.roleLabel}</label>
            <Select
              value={role}
              onValueChange={(value: TenantMemberRole) => setRole(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant_member">{t.tenantAdmin.members.roleMember}</SelectItem>
                <SelectItem value="tenant_admin">{t.tenantAdmin.members.roleAdmin}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t.tenantAdmin.members.roleHint}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            {t.common.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || emails.length === 0}
          >
            {isPending ? t.tenantAdmin.members.adding : `${t.tenantAdmin.members.addButton} (${emails.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TenantAdminMembersPage() {
  const { t } = useI18n();
  const { data: currentTenant } = useCurrentTenant();
  const isTenantAdmin = isTenantAdminRole(currentTenant?.role);

  const { data: members = [], isLoading, error } = useTenantMembers({
    enabled: isTenantAdmin,
  });

  const { mutateAsync: updateRole } = useUpdateTenantMemberRole();
  const { mutateAsync: updateStatus } = useUpdateTenantMemberStatus();
  const { mutateAsync: removeMember } = useRemoveTenantMember();

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const handleRoleChange = async (userId: string, role: TenantMemberRole) => {
    try {
      await updateRole({ userId, role });
      toast.success(t.tenantAdmin.members.updateRoleSuccess);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.tenantAdmin.members.updateRoleError);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm(`${t.tenantAdmin.members.removeConfirm} ${userId}?`)) return;
    try {
      await removeMember(userId);
      toast.success(t.tenantAdmin.members.removeSuccess);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.tenantAdmin.members.removeError);
    }
  };

  const handleStatusToggle = async (
    userId: string,
    nextStatus: "active" | "inactive",
  ) => {
    try {
      await updateStatus({ userId, status: nextStatus });
      toast.success(nextStatus === "active" ? t.tenantAdmin.members.enableSuccess : t.tenantAdmin.members.disableSuccess);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.tenantAdmin.members.updateStatusError);
    }
  };

  if (!isTenantAdmin) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        {t.tenantAdmin.members.adminOnly}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t.tenantAdmin.members.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.tenantAdmin.members.description}
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
          <PlusIcon className="h-4 w-4" />
          {t.tenantAdmin.members.addMembers}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/30 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t.tenantAdmin.members.columns.name}</th>
              <th className="px-4 py-3 font-medium">{t.tenantAdmin.members.columns.role}</th>
              <th className="px-4 py-3 font-medium">{t.tenantAdmin.members.columns.status}</th>
              <th className="px-4 py-3 text-right font-medium">{t.tenantAdmin.members.columns.actions}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                  {t.tenantAdmin.members.loading}
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                  {t.tenantAdmin.members.empty}
                </td>
              </tr>
            ) : (
              members.map((member) => {
                const label = member.name ?? member.email ?? member.user_id;
                return (
                  <tr key={member.user_id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">{label}</div>
                      <div className="text-xs text-muted-foreground">
                        {member.user_id}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={
                          member.role === "tenant_admin"
                            ? "tenant_admin"
                            : "tenant_member"
                        }
                        onValueChange={(value: TenantMemberRole) =>
                          void handleRoleChange(member.user_id, value)
                        }
                        disabled={member.status !== "active"}
                      >
                        <SelectTrigger className="w-[170px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tenant_member">
                            {t.tenantAdmin.members.roleMember}
                          </SelectItem>
                          <SelectItem value="tenant_admin">
                            {t.tenantAdmin.members.roleAdmin}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          member.status === "active"
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }
                      >
                        {member.status === "active" ? t.tenantAdmin.members.statusActive : t.tenantAdmin.members.statusInactive}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void handleStatusToggle(
                              member.user_id,
                              member.status === "active"
                                ? "inactive"
                                : "active",
                            )
                          }
                        >
                          {member.status === "active" ? t.tenantAdmin.members.deactivate : t.tenantAdmin.members.activate}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => void handleRemove(member.user_id)}
                        >
                          <Trash2Icon className="mr-1 h-4 w-4" />
                          {t.tenantAdmin.members.remove}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AddMembersDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => { /* dialog closes and list refreshes automatically via query invalidation */ }}
      />
    </div>
  );
}
