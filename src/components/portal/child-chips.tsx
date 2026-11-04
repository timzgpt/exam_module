"use client";

import type { Student } from "@/lib/types";
import { classNameOf } from "@/lib/demo-data";
import { firstName, initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ChildChipsProps {
  kids: Student[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Optional subtitle override per child (defaults to the child's class name). */
  subtitleFor?: (kid: Student) => string;
}

/**
 * Child selector chips shared by every parent-portal page (mobile: horizontal
 * scroll). Previously duplicated verbatim in four portal pages
 * (consolidation review, Table 1 row 3).
 */
export function ChildChips({ kids, selectedId, onSelect, subtitleFor }: ChildChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin" role="group" aria-label="Select a child">
      {kids.map((kid) => {
        const active = kid.id === selectedId;
        return (
          <button
            key={kid.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(kid.id)}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-2.5 rounded-full border px-3 py-1.5 text-left transition-colors",
              active ? "border-primary bg-primary/8" : "border-border bg-card hover:bg-accent",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-2xs font-semibold",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {initialsOf(kid.name)}
            </span>
            <span className="flex flex-col leading-tight">
              <span className={cn("text-compact font-medium", active ? "text-primary" : "text-foreground")}>
                {firstName(kid.name)}
              </span>
              <span className="text-2xs text-muted-foreground">
                {subtitleFor ? subtitleFor(kid) : classNameOf(kid.classId)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
