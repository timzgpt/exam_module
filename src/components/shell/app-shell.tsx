"use client";

import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { CommandPalette } from "@/components/shell/command-palette";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { useAppContext } from "@/lib/store";
import { useEffect, useRef, type ReactNode } from "react";

/** Keeps the sidebar collapsed/expanded state across reloads. */
function SidebarStateSync() {
  const { open, setOpen } = useSidebar();
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const stored = window.localStorage.getItem("js-sidebar-open");
      if (stored === "0") setOpen(false);
      return;
    }
    window.localStorage.setItem("js-sidebar-open", open ? "1" : "0");
  }, [open, setOpen]);
  return null;
}

/**
 * Shared application chrome for the academic module: collapsible sidebar,
 * sticky header, global page search and the content surface.
 */
export function AppShell({ children }: { children: ReactNode }) {
  // Restore the persisted cycle/class/student context after mount.
  useEffect(() => {
    void useAppContext.persist.rehydrate();
  }, []);

  return (
    <SidebarProvider>
      <SidebarStateSync />
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-background">
        <AppHeader />
        <main className="mx-auto w-full max-w-page flex-1 px-3 py-5 sm:px-6 sm:py-6">
          {children}
        </main>
      </SidebarInset>
      <CommandPalette />
    </SidebarProvider>
  );
}
