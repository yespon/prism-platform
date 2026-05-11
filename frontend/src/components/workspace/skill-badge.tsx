import { SparklesIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface SkillBadgeProps {
  skillName: string;
  onRemove?: () => void;
  className?: string;
}

export function SkillBadge({ skillName, onRemove, className }: SkillBadgeProps) {
  if (!skillName) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-sm font-medium text-primary",
        className
      )}
    >
      <SparklesIcon className="size-3.5 shrink-0 text-primary/70" />
      <span>{skillName}</span>
      {onRemove && (
        <button
          type="button"
          className="inline-flex h-4 w-4 items-center justify-center rounded-sm text-primary/60 hover:bg-primary/20 hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="size-3" />
          <span className="sr-only">Remove skill</span>
        </button>
      )}
    </span>
  );
}
