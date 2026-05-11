import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type OverviewPageHeaderProps = {
  title: string;
  description: string;
  actions?: ReactNode;
};

export function OverviewPageHeader({
  title,
  description,
  actions,
}: OverviewPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

type OverviewSectionCardProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function OverviewSectionCard({
  title,
  description,
  actions,
  children,
  className,
}: OverviewSectionCardProps) {
  return (
    <section className={cn("rounded-xl border bg-card p-6", className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {actions}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function OverviewEmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border p-4 text-sm text-muted-foreground">{text}</div>;
}
