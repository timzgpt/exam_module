import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SectionCardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
}

/** White surface section with a subtle border and optional header row. */
export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  noPadding = false,
}: SectionCardProps) {
  return (
    <Card className={cn("border-border/80 shadow-none", className)}>
      {title || actions ? (
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div className="min-w-0">
            {title ? (
              <CardTitle className="text-sm font-semibold text-foreground">
                {title}
              </CardTitle>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </CardHeader>
      ) : null}
      <CardContent className={noPadding ? "p-0" : "pt-0"}>{children}</CardContent>
    </Card>
  );
}
