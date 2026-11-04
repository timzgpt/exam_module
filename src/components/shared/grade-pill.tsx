import { gradeToneClass } from "@/lib/grading";
import { cn } from "@/lib/utils";

interface GradePillProps {
  grade: string;
  className?: string;
}

/** Coloured grade letter (A–F) using the shared grade tone palette. */
export function GradePill({ grade, className }: GradePillProps) {
  return (
    <span
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-md border text-xs font-semibold",
        gradeToneClass(grade),
        className,
      )}
    >
      {grade}
    </span>
  );
}
