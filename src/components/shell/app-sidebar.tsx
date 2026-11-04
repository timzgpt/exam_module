"use client";

import { Logo } from "@/components/shell/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { resolveHref, SCHOOL } from "@/lib/demo-config";
import { NAV_GROUPS, matchNavKey } from "@/lib/nav";
import { useNavContext } from "@/lib/store";
import { useUiStore } from "@/lib/ui-store";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";

const USER = {
  name: "Deo Nsubuga",
  role: "Academic Master",
  initials: "DN",
};

/** Collapsible dark-burgundy sidebar: icons + tooltips when collapsed. */
export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { cycleId, classId, studentId } = useNavContext();
  const activeKey = matchNavKey(pathname);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="gap-0 pb-1">
        <div className="flex items-center gap-2.5 px-2 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Logo />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-compact font-semibold leading-tight text-sidebar-foreground">
              {SCHOOL.name}
            </p>
            <p className="truncate text-2xs leading-tight text-sidebar-foreground/60">
              {SCHOOL.reportsBrand}
            </p>
          </div>
        </div>
        <SidebarMenu className="px-2 pb-2 group-data-[collapsible=icon]:px-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Search pages (⌘K)"
              onClick={() => setPaletteOpen(true)}
              className="border border-sidebar-border/70 bg-white/5 text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground"
            >
              <Search className="size-4" />
              <span className="text-compact">Search navigation…</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin gap-1 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label} className="py-1.5">
            <SidebarGroupLabel className="text-3xs font-semibold uppercase tracking-widest text-sidebar-foreground/45">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const href = resolveHref(item.hrefTemplate, { cycleId, classId, studentId });
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        isActive={item.key === activeKey}
                        tooltip={{ children: item.label, side: "right", align: "center" }}
                        onClick={() => router.push(href)}
                        className="h-8 text-compact font-medium text-sidebar-foreground/85 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:hover:bg-sidebar-primary"
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-0 border-t border-sidebar-border/70 pb-2">
        <SidebarMenu className="px-2 group-data-[collapsible=icon]:px-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={{ children: `${USER.name} · ${USER.role}`, side: "right" }}
              className="h-auto items-center gap-2.5 py-1.5 text-sidebar-foreground/85 hover:bg-sidebar-accent"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xs font-semibold text-sidebar-foreground">
                {USER.initials}
              </span>
              <span className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
                <span className="block truncate text-xs font-medium">{USER.name}</span>
                <span className="block truncate text-2xs text-sidebar-foreground/55">
                  {USER.role}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
