"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

import { useCurrentTenant } from "./hooks";
import { ROUTE_TYPE_REQUIREMENTS } from "./route-type-requirements";

/**
 * Redirects to /workspace/overview if the current workspace type does not have
 * access to the current route, according to ROUTE_TYPE_REQUIREMENTS.
 *
 * Usage: Call at the top of a page component:
 *   useWorkspaceTypeGuard();
 */
export function useWorkspaceTypeGuard() {
  const { data: currentTenant, isLoading } = useCurrentTenant();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    const tenantType = currentTenant?.tenant_type ?? "ops";

    // Find the first matching route requirement
    for (const [prefix, allowedTypes] of Object.entries(ROUTE_TYPE_REQUIREMENTS)) {
      if (pathname.startsWith(prefix)) {
        if (!allowedTypes.includes(tenantType)) {
          router.replace("/workspace/overview");
        }
        return;
      }
    }
  }, [currentTenant, isLoading, pathname, router]);
}
