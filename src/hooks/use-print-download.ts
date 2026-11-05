"use client";

import { useToast } from "@/hooks/use-toast";

/**
 * Shared "Download PDF" plumbing for the printable report-card surfaces
 * (staff preview and parent portal). Both previously duplicated the toast +
 * window.print() pattern; the print layouts themselves stay per-surface.
 */
export function usePrintDownload(description: string): () => void {
  const { toast } = useToast();
  return () => {
    toast({
      title: "Opening print dialog",
      description,
    });
    window.print();
  };
}
