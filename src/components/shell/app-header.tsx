"use client";

import { cn } from "@/lib/utils";

import { Logo } from "@/components/shell/logo";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SCHOOL } from "@/lib/demo-config";
import { breadcrumbFor } from "@/lib/nav";
import { classes, cycles, marksDeadlines, cycleById } from "@/lib/demo-data";
import { useAppContext } from "@/lib/store";
import { useUiStore } from "@/lib/ui-store";
import { Bell, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { cycleId, classId, setCycle, setClass } = useAppContext();
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);

  const trail = breadcrumbFor(pathname, (t) =>
    t
      .replaceAll("{cycleId}", cycleId)
      .replaceAll("{classId}", classId)
      .replaceAll("{studentId}", "st1"),
  );

  const overdue = marksDeadlines.filter(
    (d) => d.entriesDone < d.entriesTotal,
  ).length;

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 flex-nowrap items-center gap-2 overflow-hidden border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:px-5">
      <SidebarTrigger className="-ml-1 size-8 shrink-0 text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" className="!h-5 shrink-0" />

      <Breadcrumb className="min-w-0 flex-1 overflow-hidden">
        <BreadcrumbList className="flex-nowrap text-compact">
          <BreadcrumbItem className="hidden lg:block">
            <button
              onClick={() => router.push("/")}
              className="font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {SCHOOL.reportsBrand}
            </button>
          </BreadcrumbItem>
          {trail.map((item, i) => (
            <span
              key={`${item.label}-${i}`}
              className={cn("flex items-center gap-1.5", i < trail.length - 1 && "hidden lg:flex")}
            >
              <BreadcrumbSeparator className="[&>svg]:size-3.5" />
              <BreadcrumbItem>
                {i === trail.length - 1 ? (
                  <BreadcrumbPage className="max-w-[46vw] truncate font-medium md:max-w-[130px] lg:max-w-[280px] xl:max-w-none">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <span className="max-w-[38vw] truncate text-muted-foreground lg:max-w-[220px] xl:max-w-[300px]">
                    {item.label}
                  </span>
                )}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        {/* Cycle context */}
        <Select value={cycleId} onValueChange={setCycle}> {/* ds-allow-native-select: Radix listbox trigger */}
          <SelectTrigger
            size="sm"
            className="hidden h-8 w-auto gap-1.5 border-border bg-card px-2.5 text-xs font-medium text-foreground shadow-none md:flex"
            aria-label="Report cycle context"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Report cycle context
            </DropdownMenuLabel>
            {cycles.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-compact">
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Class context */}
        <Select value={classId} onValueChange={setClass}> {/* ds-allow-native-select: Radix listbox trigger */}
          <SelectTrigger
            size="sm"
            className="hidden h-8 w-auto gap-1.5 border-border bg-card px-2.5 text-xs font-medium text-foreground shadow-none md:flex"
            aria-label="Class context"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Class context
            </DropdownMenuLabel>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-compact">
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search pages"
            >
              <Search className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Search pages (⌘K)</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative size-8 text-muted-foreground hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-destructive" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Notifications
            </DropdownMenuLabel>
            <DropdownMenuItem
              className="flex cursor-pointer flex-col items-start gap-0.5"
              onClick={() => router.push(`/academic/report-cycles/${cycleId}/deadlines`)}
            >
              <span className="text-compact font-medium">
                {overdue} marks submissions need attention
              </span>
              <span className="text-xs text-muted-foreground">Deadline tracker · due 06 Mar 2026</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex cursor-pointer flex-col items-start gap-0.5"
              onClick={() => router.push(`/academic/report-cycles/${cycleId}/review`)}
            >
              <span className="text-compact font-medium">2 classes awaiting approval</span>
              <span className="text-xs text-muted-foreground">Review &amp; approval</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex cursor-pointer flex-col items-start gap-0.5"
              onClick={() => router.push(`/academic/report-cycles/${cycleId}/release`)}
            >
              <span className="text-compact font-medium">
                Release date: {cycleById(cycleId)?.releaseDate ?? "06 Apr 2026"}
              </span>
              <span className="text-xs text-muted-foreground">Release management</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="mx-0.5 hidden items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2.5 lg:flex">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-3xs font-semibold text-primary-foreground">
            DN
          </span>
          <span className="leading-tight">
            <span className="block text-2xs font-medium leading-none text-foreground">
              Deo Nsubuga
            </span>
            <span className="block text-3xs leading-none text-muted-foreground">
              Academic Master
            </span>
          </span>
        </span>
      </div>
    </header>
  );
}
