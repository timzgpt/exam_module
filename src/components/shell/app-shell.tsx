"use client";

import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { CommandPalette } from "@/components/shell/command-palette";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { useAppContext } from "@/lib/store";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";

/** Subscribe never — the snapshot only flips between server and client. */
const subscribeNoop = () => () => {};

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
 *
 * The chrome is mounted client-side only: the streamed server tree and the
 * client tree used to disagree on Radix `useId` positions (the streamed
 * App Router segments add fork nodes the client render does not have), so
 * every Select/Dialog in the header hydrated with mismatched `aria-controls`
 * ids. Rendering the chrome after mount makes the two trees identical by
 * construction and removes the whole class of mismatches.
 */
export function AppShell({ children }: { children: ReactNode }) {
  // False during SSR and the first client render, true afterwards.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  useEffect(() => {
    void useAppContext.persist.rehydrate();
  }, []);

  if (!mounted) return null;

  return (
    <SidebarProvider>
      <SidebarStateSync />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-background">
        <AppHeader />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-page flex-1 px-3 py-5 outline-none sm:px-6 sm:py-6"
        >
          {children}
        </main>
      </SidebarInset>
      <CommandPalette />
    </SidebarProvider>
  );
}
