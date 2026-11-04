"use client";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  approvalFor,
  classById,
  classes,
  cycleById,
  currentCycle,
  releaseFor,
} from "@/lib/demo-data";
import {
  Ban,
  CalendarDays,
  CircleCheck,
  Info,
  MailCheck,
  Send,
  Undo2,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { ClassRelease } from "@/lib/types";

const HOLD_REASONS = ["Fees balance", "Approval pending", "Disciplinary review", "Other"] as const;

const RELEASED_BY = "Mrs. Agnes Nyoni";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-01-24 08:00" -> "24 Jan 2026 08:00" */
function fmtStamp(value: string): string {
  const [date, time] = value.split(" ");
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return value;
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}${time ? ` ${time}` : ""}`;
}

/** "2026-03-27" -> "27 March 2026" */
function fmtLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS_LONG[m - 1]} ${y}`;
}

type ReleaseState = "released" | "on-hold" | "eligible";

function releaseStateOf(r: ClassRelease): ReleaseState {
  if (r.hold) return "on-hold";
  if (r.releasedAt) return "released";
  return "eligible";
}

const STATE_META: Record<ReleaseState, { label: string; tone: "success" | "destructive" | "info" }> = {
  released: { label: "Released", tone: "success" },
  "on-hold": { label: "On hold", tone: "destructive" },
  eligible: { label: "Eligible", tone: "info" },
};

export default function ReleasePage() {
  const params = useParams<{ cycleId?: string; studentId?: string }>();
  const { toast } = useToast();

  // Param resolution: never crash on unknown ids.
  const cycle = cycleById(params.cycleId ?? "") ?? currentCycle;

  const [rows, setRows] = useState<ClassRelease[]>(() =>
    classes.map((cls) => {
      const r = releaseFor(cls.id);
      return { ...r, hold: r.hold ? { ...r.hold } : null };
    }),
  );
  const [holdFor, setHoldFor] = useState<ClassRelease | null>(null);
  const [holdReason, setHoldReason] = useState("");
  const [holdDetail, setHoldDetail] = useState("");

  const releasedCount = rows.filter((r) => r.releasedAt && !r.hold).length;
  const eligibleCount = rows.filter((r) => !r.hold && !r.releasedAt).length;
  const holdCount = rows.filter((r) => r.hold).length;

  const releasedHistory = rows
    .filter((r) => r.releasedAt)
    .slice()
    .sort((a, b) => (b.releasedAt ?? "").localeCompare(a.releasedAt ?? ""));

  const confirmRelease = (classId: string) => {
    const cls = classById(classId);
    setRows((prev) =>
      prev.map((r) =>
        r.classId === classId
          ? { ...r, releasedAt: "2026-03-25 09:00", releasedBy: RELEASED_BY }
          : r,
      ),
    );
    toast({
      title: "Report cards released",
      description: `${cls?.name ?? "Class"} is now visible in the parent portal. Parents have been notified.`,
    });
  };

  const confirmHold = () => {
    if (!holdFor || !holdReason) return;
    const cls = classById(holdFor.classId);
    setRows((prev) =>
      prev.map((r) =>
        r.classId === holdFor.classId
          ? { ...r, hold: { reason: holdReason, detail: holdDetail.trim() } }
          : r,
      ),
    );
    toast({
      title: "Hold placed",
      description: `${cls?.name ?? "Class"} report cards are held. Reason: ${holdReason}.`,
    });
    setHoldFor(null);
    setHoldReason("");
    setHoldDetail("");
  };

  const liftHold = (classId: string) => {
    const cls = classById(classId);
    setRows((prev) =>
      prev.map((r) => (r.classId === classId ? { ...r, hold: null } : r)),
    );
    toast({
      title: "Hold lifted",
      description: `${cls?.name ?? "Class"} can now be released to the parent portal.`,
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Release management"
        description={`Publish approved report cards to the parent portal for ${cycle.name}.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Released" value={releasedCount} icon={MailCheck} tone="success" hint="Visible in parent portal" />
        <StatCard label="Eligible" value={eligibleCount} icon={CircleCheck} tone="primary" hint="No hold · not yet released" />
        <StatCard label="On hold" value={holdCount} icon={Ban} tone="destructive" hint="Hidden until resolved" />
        <StatCard
          label="Parents' day"
          value={fmtLongDate(cycle.parentsDayDate)}
          icon={CalendarDays}
          hint="Consultation day for this cycle"
        />
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-compact text-foreground">
          Releasing a card makes it visible in the parent portal and triggers a notification. Simulated in this demo.
        </p>
      </div>

      <SectionCard noPadding title="Classes" description="Release, hold or lift each class's report cards.">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="min-w-35 pl-4">Class</TableHead>
                <TableHead>Approval status</TableHead>
                <TableHead>Hold reason</TableHead>
                <TableHead>Release date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const cls = classById(r.classId);
                const approval = approvalFor(r.classId);
                const state = releaseStateOf(r);
                const meta = STATE_META[state];
                return (
                  <TableRow key={r.classId}>
                    <TableCell className="pl-4">
                      <p className="text-compact font-medium text-foreground">{cls?.name ?? "Class"}</p>
                      <p className="text-xs text-muted-foreground">{cls ? `${cls.level} · Room ${cls.room}` : "-"}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        tone={approval.status === "approved" ? "success" : approval.status === "changes-requested" ? "destructive" : "neutral"}
                        label={approval.status === "not-submitted" ? "Not submitted" : approval.status.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                      />
                    </TableCell>
                    <TableCell>
                      {r.hold ? (
                        <>
                          <p className="text-compact font-medium text-foreground">{r.hold.reason}</p>
                          {r.hold.detail ? (
                            <p className="max-w-[240px] text-xs text-muted-foreground">{r.hold.detail}</p>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-compact text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-compact tabular text-muted-foreground">
                      {r.releasedAt ? fmtStamp(r.releasedAt) : "-"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={meta.tone} label={meta.label} />
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              className="h-7 gap-1 px-2.5 text-xs"
                              disabled={state !== "eligible"}
                            >
                              <Send className="size-3.5" /> Release
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Release {cls?.name ?? "this class"}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                All report cards for this class become visible in the parent portal and each parent receives a notification. This is simulated in the demo.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => confirmRelease(r.classId)}>
                                Release cards
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {r.hold ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 px-2.5 text-xs"
                            onClick={() => liftHold(r.classId)}
                          >
                            <Undo2 className="size-3.5" /> Lift hold
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 px-2.5 text-xs"
                            onClick={() => {
                              setHoldFor(r);
                              setHoldReason("");
                              setHoldDetail("");
                            }}
                          >
                            <Ban className="size-3.5" /> Place hold
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard title="Release history" description="Classes released to the parent portal, newest first.">
        {releasedHistory.length === 0 ? (
          <EmptyState
            icon={Send}
            title="Nothing released yet"
            description="Released classes will appear here with a timestamp and the releasing officer."
          />
        ) : (
          <div className="space-y-4 border-l border-border py-1 pl-5">
            {releasedHistory.map((r) => {
              const cls = classById(r.classId);
              return (
                <div key={r.classId} className="relative">
                  <span className="absolute -left-6 top-1 flex size-2.5 items-center justify-center rounded-full bg-success" />
                  <p className="text-compact text-foreground">
                    <span className="font-medium">{cls?.name ?? "Class"}</span> released:{" "}
                    {fmtStamp(r.releasedAt ?? "")} by {r.releasedBy ?? "-"}
                  </p>
                  {r.hold ? (
                    <p className="text-xs text-muted-foreground">
                      Note: placed on hold afterwards ({r.hold.reason}). Cards are hidden again.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Place hold dialog */}
      <Dialog open={!!holdFor} onOpenChange={(open) => !open && setHoldFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Place hold: {holdFor ? classById(holdFor.classId)?.name : ""}</DialogTitle>
            <DialogDescription>
              Held report cards are hidden from the parent portal until the hold is lifted.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3.5 py-1">
            <div className="grid gap-1.5">
              <Label>Reason</Label>
              {/* ds-allow-native-select: shadcn Select is a Radix listbox trigger, not a native select */}
              <Select value={holdReason} onValueChange={setHoldReason}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {HOLD_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hold-detail">Detail (optional)</Label>
              <Textarea
                id="hold-detail"
                rows={3}
                placeholder="e.g. 3 students have an outstanding balance. Cards held until cleared."
                value={holdDetail}
                onChange={(e) => setHoldDetail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldFor(null)}>
              Cancel
            </Button>
            <Button onClick={confirmHold} disabled={!holdReason}>
              Place hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
