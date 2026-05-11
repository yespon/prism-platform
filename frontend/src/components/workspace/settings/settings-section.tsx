import { cn } from "@/lib/utils";

export function SettingsSection({
  className,
  title,
  description,
  action,
  children,
}: {
  className?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={cn(className)}>
      <header className="flex flex-row items-center justify-between space-y-0 mb-4">
        <div className="space-y-2">
          <div className="text-lg font-semibold">{title}</div>
          {description && (
            <div className="text-muted-foreground text-sm">{description}</div>
          )}
        </div>
        {action && <div>{action}</div>}
      </header>
      <main className="mt-4">{children}</main>
    </section>
  );
}
