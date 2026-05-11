"use client";

import { Building2Icon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";

import { useI18n } from "@/core/i18n/hooks";
import { useCurrentTenant, useSwitchTenant, useTenantList } from "@/core/tenants";
import { cn } from "@/lib/utils";

export function WorkspaceContainer({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex h-screen w-full flex-col", className)} {...props}>
      {children}
    </div>
  );
}

export function WorkspaceHeader({
  className,
  ...props
}: React.ComponentProps<"header">) {
  const { t } = useI18n();
  const { data: currentTenant } = useCurrentTenant();
  const { data: tenants } = useTenantList();
  const { mutate: switchTenant, isPending: switching } = useSwitchTenant();
  const currentTenantId = currentTenant?.tenant_id ?? "";

  const tenantName = useMemo(() => {
    if (!currentTenant?.tenant_id) {
      return t.workspace.unboundWorkspace;
    }
    const matched = tenants?.find((item) => item.id === currentTenant.tenant_id);
    return matched?.name ?? currentTenant.tenant_id;
  }, [currentTenant?.tenant_id, tenants]);

  const [shortcutHint, setShortcutHint] = useState("Ctrl+K");

  useEffect(() => {
    const isMac =
      typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");
    setShortcutHint(isMac ? "⌘K" : "Ctrl+K");
  }, []);

  const handleOpenCommandPalette = () => {
    window.dispatchEvent(new Event("workspace:open-command-palette"));
  };

  return (
    <header
      className={cn(
        "top-0 right-0 left-0 z-20 flex h-16 shrink-0 items-center justify-end gap-2 border-b backdrop-blur-sm transition-[width,height] ease-out group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 px-4",
        className,
      )}
      {...props}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground hidden h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm transition md:flex"
        onClick={handleOpenCommandPalette}
      >
        <SearchIcon className="h-3.5 w-3.5" />
        <span>{t.workspace.globalSearch}</span>
        <span className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {shortcutHint}
        </span>
      </button>

      <div className="hidden items-center gap-1 rounded-md border bg-background px-1 py-1 text-xs md:flex focus-within:ring-1 focus-within:ring-ring">
        <Building2Icon className="h-3.5 w-3.5 text-muted-foreground ml-1.5" />
        <select
          aria-label={t.navMenu.switchTenant}
          value={currentTenantId}
          disabled={switching || !tenants || tenants.length === 0}
          onChange={(event) => {
            const tenantId = event.target.value;
            if (!tenantId || tenantId === currentTenantId) {
              return;
            }
            switchTenant(tenantId);
          }}
          className="h-6 w-full max-w-[150px] bg-transparent outline-none focus:outline-none hidden md:block text-foreground font-medium"
        >
          {!tenants || tenants.length === 0 ? (
            <option value="">{tenantName}</option>
          ) : (
            tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))
          )}
        </select>
      </div>

      {currentTenant?.role === "tenant_admin" && (
        <Link
          href="/tenant-admin"
          className="hidden rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground transition hover:bg-primary/90 md:block"
        >
          {t.workspace.manageWorkspace}
        </Link>
      )}
    </header>
  );
}

export function WorkspaceBody({
  className,
  children,
  ...props
}: React.ComponentProps<"main">) {
  return (
    <main
      className={cn(
        "relative flex min-h-0 w-full flex-1 flex-col items-center",
        className,
      )}
      {...props}
    >
      <div className="flex h-full w-full flex-col items-center">{children}</div>
    </main>
  );
}
