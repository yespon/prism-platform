import type { ReactNode } from "react";

export default function ChatsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex size-full min-w-0 bg-background">
      <main className="flex-1 min-w-0 relative h-full">
        {children}
      </main>
    </div>
  );
}
