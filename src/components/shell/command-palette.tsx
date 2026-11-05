"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { NAV_GROUPS } from "@/lib/nav";
import { resolveHref, SCHOOL } from "@/lib/demo-config";
import { useNavContext } from "@/lib/store";
import { useUiStore } from "@/lib/ui-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Global navigation search (⌘K / Ctrl+K). Lists every page in the module. */
export function CommandPalette() {
  const router = useRouter();
  const { cycleId, classId, studentId } = useNavContext();
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  const run = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages in Exams & Report Cards…" />
      <CommandList className="max-h-[70vh]">
        <CommandEmpty>No page found.</CommandEmpty>
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 ? <CommandSeparator /> : null}
            <CommandGroup heading={group.label}>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.key}
                    value={`${item.label} ${item.description} ${group.label}`}
                    onSelect={() => run(resolveHref(item.hrefTemplate, { cycleId, classId, studentId }))}
                    className="gap-2"
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">{item.label}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}
        <div className="border-t px-3 py-2 text-2xs text-muted-foreground">
          {SCHOOL.name} · School Reports
        </div>
      </CommandList>
    </CommandDialog>
  );
}
