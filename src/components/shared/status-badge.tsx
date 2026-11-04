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
  success: "bg-[#16834a]/10 text-[#116b3c] border-[#16834a]/25",
  warning: "bg-[#c47a16]/10 text-[#9a5f11] border-[#c47a16]/30",
  destructive: "bg-[#dc2626]/10 text-[#b91c1c] border-[#dc2626]/25",
  primary: "bg-primary/8 text-primary border-primary/25",
  info: "bg-[#6b4f9e]/10 text-[#5a3f8a] border-[#6b4f9e]/25",
};

const dotClasses: Record<BadgeTone, string> = {
  neutral: "bg-muted-foreground/60",
  success: "bg-[#16834a]",
  warning: "bg-[#c47a16]",
  destructive: "bg-[#dc2626]",
  primary: "bg-primary",
  info: "bg-[#6b4f9e]",
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
