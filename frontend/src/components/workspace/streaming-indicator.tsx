import { cn } from "@/lib/utils";

export function StreamingIndicator({
  className,
  size = "normal",
}: {
  className?: string;
  size?: "normal" | "sm";
}) {
  const dotSize = size === "sm" ? "size-1.5 mx-0.5" : "size-2 mx-[3px]";

  return (
    <div className={cn("flex items-center justify-center opacity-80", className)}>
      <div
        className={cn(
          dotSize,
          "animate-pulse rounded-full bg-primary/60"
        )}
        style={{ animationDuration: "1.2s", animationDelay: "0ms" }}
      />
      <div
        className={cn(
          dotSize,
          "animate-pulse rounded-full bg-primary/80"
        )}
        style={{ animationDuration: "1.2s", animationDelay: "200ms" }}
      />
      <div
        className={cn(
          dotSize,
          "animate-pulse rounded-full bg-primary"
        )}
        style={{ animationDuration: "1.2s", animationDelay: "400ms" }}
      />
    </div>
  );
}
