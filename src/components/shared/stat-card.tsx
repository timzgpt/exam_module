"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  delta?: { text: string; up: boolean };
  tone?: "default" | "success" | "warning" | "destructive" | "primary";
  className?: string;
}

const toneStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  primary: "text-primary",
};

/** Compact KPI tile used on dashboards and overview pages. */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  delta,
  tone = "default",
  className,
}: StatCardProps) {
  return (
    <Card className={cn("border-border/80 shadow-none", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-compact font-medium text-muted-foreground">{label}</p>
          {Icon ? (
            <Icon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden />
          ) : null}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className={cn("text-2xl font-semibold tabular tracking-tight", toneStyles[tone])}>
            {value}
          </span>
          {delta ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-2xs font-medium",
                delta.up
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {delta.up ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              )}
              {delta.text}
            </span>
          ) : null}
        </div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
