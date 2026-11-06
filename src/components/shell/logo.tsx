import { cn } from "@/lib/utils";
import { GraduationCap } from "lucide-react";

/** Josephian Schools "School Reports" brand mark. */
export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg",
        inverted
          ? "bg-primary text-primary-foreground"
          : "bg-sidebar-primary text-sidebar-primary-foreground",
        className,
      )}
      aria-hidden
    >
      <GraduationCap className="size-[18px]" strokeWidth={2.2} />
    </span>
  );
}
