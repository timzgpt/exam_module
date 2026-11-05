import { AppShell } from "@/components/shell/app-shell";
import { Toaster } from "@/components/ui/toaster";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      {children}
      <Toaster />
    </AppShell>
  );
}
