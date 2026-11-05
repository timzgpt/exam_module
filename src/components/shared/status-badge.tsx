import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "destructive"
  | "primary"
  | "info";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  success: "bg-success/10 text-success-strong border-success/25",
  warning: "bg-warning/10 text-warning-strong border-warning/30",
  destructive: "bg-destructive/10 text-destructive-strong border-destructive/25",
  primary: "bg-primary/8 text-primary border-primary/25",
  info: "bg-info/10 text-info-strong border-info/25",
};

const dotClasses: Record<BadgeTone, string> = {
  neutral: "bg-muted-foreground/60",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  primary: "bg-primary",
  info: "bg-info",
};

interface StatusBadgeProps {
  tone?: BadgeTone;
  label: string;
  dot?: boolean;
  className?: string;
}

/**
 * Status chip with a coloured dot. Centralises the visual language for
 * statuses across the module (success / warning / destructive / primary…).
 */
export function StatusBadge({ tone = "neutral", label, dot = true, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {dot ? <span className={cn("size-1.5 rounded-full", dotClasses[tone])} /> : null}
      {label}
    </span>
  );
}

/** Map a raw status string from demo data to a badge tone. */
export function toneForStatus(status: string): BadgeTone {
  switch (status) {
    case "completed":
    case "approved":
    case "released":
    case "complete":
    case "valid":
    case "submitted":
    case "eligible":
    case "on-track":
      return "success";
    case "ongoing":
    case "partial":
    case "pending":
    case "draft":
    case "in-progress":
      return "warning";
    case "overdue":
    case "failed":
    case "changes-requested":
    case "on-hold":
    case "revoked":
    case "tampered":
    case "not-found":
    case "behind":
    case "not-submitted":
      return "destructive";
    case "scheduled":
    case "review":
    case "marks-entry":
    case "preparation":
      return "info";
    default:
      return "neutral";
  }
}

export function labelForStatus(status: string): string {
  return status
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
