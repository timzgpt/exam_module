"use client";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge, labelForStatus, toneForStatus } from "@/components/shared/status-badge";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  approvals as demoApprovals,
  classById,
  classes,
  cycleById,
  currentCycle,
  teacherById,
} from "@/lib/demo-data";
import {
  CircleCheck,
  ClipboardCheck,
  FileWarning,
  Hourglass,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { ClassApproval } from "@/lib/types";

const STATUS_TABS = ["all", "submitted", "approved", "changes-requested", "not-submitted"] as const;

const REVIEWER = "Mrs. Agnes Nyoni";

export default function ReviewPage() {
  const params = useParams<{ cycleId?: string; studentId?: string }>();
  const { toast } = useToast();

  // Param resolution — never crash on unknown ids.
  const cycle = cycleById(params.cycleId ?? "") ?? currentCycle;

  const [rows, setRows] = useState<ClassApproval[]>(() =>
    classes.map((cls) => {
      const a = demoApprovals.find((x) => x.classId === cls.id);
      return {
        classId: cls.id,
        status: a?.status ?? ("not-submitted" as const),
        submittedAt: a?.submittedAt ?? null,
        submittedBy: a?.submittedBy ?? null,
        reviewedAt: a?.reviewedAt ?? null,
        reviewedBy: a?.reviewedBy ?? null,
        note: a?.note ?? null,
        audit: a ? [...a.audit] : [],
      };
    }),
  );
  const [tab, setTab] = useState<string>("all");
  const [changesFor, setChangesFor] = useState<ClassApproval | null>(null);
  const [changesNote, setChangesNote] = useState("");
  const [auditFor, setAuditFor] = useState<ClassApproval | null>(null);

  const filtered = useMemo(
    () => rows.filter((a) => tab === "all" || a.status === tab),
    [rows, tab],
  );

  const counts = {
    approved: rows.filter((a) => a.status === "approved").length,
    submitted: rows.filter((a) => a.status === "submitted").length,
    changes: rows.filter((a) => a.status === "changes-requested").length,
    notSubmitted: rows.filter((a) => a.status === "not-submitted").length,
  };

  const approveClass = (classId: string) => {
    const cls = classById(classId);
    setRows((prev) =>
      prev.map((a) =>
        a.classId === classId
          ? {
              ...a,
              status: "approved",
              reviewedAt: "2026-03-11",
              reviewedBy: REVIEWER,
              note: null,
              audit: [
                ...a.audit,
                {
                  at: "2026-03-11 09:12",
                  actor: REVIEWER,
                  action: "Approved for report generation",
                },
              ],
            }
          : a,
      ),
    );
    toast({
      title: "Class approved",
      description: `${cls?.name ?? "Class"} was approved for report generation.`,
    });
  };

  const requestChanges = () => {
    if (!changesFor || !changesNote.trim()) return;
    const cls = classById(changesFor.classId);
    setRows((prev) =>
      prev.map((a) =>
        a.classId === changesFor.classId
          ? {
              ...a,
              status: "changes-requested",
              reviewedAt: "2026-03-11",
              reviewedBy: REVIEWER,
              note: changesNote.trim(),
              audit: [
                ...a.audit,
                {
                  at: "2026-03-11 09:24",
                  actor: REVIEWER,
                  action: "Changes requested",
                  detail: changesNote.trim(),
                },
              ],
            }
          : a,
      ),
    );
    toast({
      title: "Changes requested",
      description: `${cls?.name ?? "Class"} teacher has been notified to revise the submission.`,
    });
    setChangesFor(null);
    setChangesNote("");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Review & approval"
        description={`Verify marks and comments per class for ${cycle.name} before reports are generated.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Approved" value={counts.approved} icon={ShieldCheck} tone="success" hint="Ready for generation" />
        <StatCard label="Submitted (awaiting)" value={counts.submitted} icon={Send} tone="primary" hint="Needs a decision" />
        <StatCard label="Changes requested" value={counts.changes} icon={FileWarning} tone="warning" hint="Returned to class teacher" />
        <StatCard label="Not submitted" value={counts.notSubmitted} icon={Hourglass} tone="destructive" hint="Awaiting class teacher" />
      </div>

      <SectionCard noPadding title="Classes" description="Approve or return each class submission. Every action is recorded in the audit trail.">
        <div className="border-b border-border/70 px-4 py-3">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-8">
              {STATUS_TABS.map((t) => (
                <TabsTrigger key={t} value={t} className="h-7 px-2.5 text-xs capitalize">
                  {t === "all" ? "All" : labelForStatus(t)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No classes with this status"
            description="Switch the filter to see other classes."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-[140px] pl-4">Class</TableHead>
                  <TableHead>Class teacher</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reviewed by</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const cls = classById(a.classId);
                  const teacher = teacherById(cls?.classTeacherId);
                  return (
                    <TableRow key={a.classId}>
                      <TableCell className="pl-4">
                        <p className="text-[13.5px] font-medium text-foreground">{cls?.name ?? "Class"}</p>
                        <p className="text-xs text-muted-foreground">{cls ? `${cls.level} · Room ${cls.room}` : "—"}</p>
                      </TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">{teacher?.name ?? "—"}</TableCell>
                      <TableCell>
                        {a.submittedAt ? (
                          <>
                            <p className="text-[13px] tabular">{a.submittedAt}</p>
                            <p className="text-xs text-muted-foreground">by {a.submittedBy ?? "—"}</p>
                          </>
                        ) : (
                          <span className="text-[13px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={toneForStatus(a.status)} label={labelForStatus(a.status)} />
                      </TableCell>
                      <TableCell>
                        {a.reviewedBy ? (
                          <>
                            <p className="text-[13px]">{a.reviewedBy}</p>
                            <p className="text-xs text-muted-foreground tabular">{a.reviewedAt}</p>
                          </>
                        ) : (
                          <span className="text-[13px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" className="h-7 gap-1 px-2.5 text-xs" disabled={a.status === "approved"}>
                                <ShieldCheck className="size-3.5" /> Approve
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Approve {cls?.name ?? "this class"}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Approved classes are included in the next report generation batch. The decision is recorded in the audit trail.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => approveClass(a.classId)}>
                                  Approve class
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 px-2.5 text-xs"
                            disabled={a.status === "not-submitted"}
                            onClick={() => {
                              setChangesFor(a);
                              setChangesNote(a.note ?? "");
                            }}
                          >
                            <FileWarning className="size-3.5" /> Request changes
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 px-2.5 text-xs"
                            onClick={() => setAuditFor(a)}
                          >
                            <ClipboardCheck className="size-3.5" /> Audit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Review policy" description="How the approval workflow gates report generation.">
        <div className="space-y-2 text-[13px] leading-relaxed text-muted-foreground">
          <p>
            Approvals gate batch generation: only classes with an <span className="font-medium text-foreground">approved</span> status are included when report cards are generated. A class that is merely submitted still needs an explicit decision here.
          </p>
          <p>
            Requesting changes notifies the class teacher by notification and returns the class for revision; it must be resubmitted before it can be approved. Every approval and change request is appended to the class audit trail.
          </p>
        </div>
      </SectionCard>

      {/* Request changes dialog */}
      <Dialog open={!!changesFor} onOpenChange={(open) => !open && setChangesFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request changes — {changesFor ? classById(changesFor.classId)?.name : ""}</DialogTitle>
            <DialogDescription>
              The class teacher is notified and the class returns for revision before it can be approved.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-1">
            <Label htmlFor="changes-note">Note for the class teacher</Label>
            <Textarea
              id="changes-note"
              rows={4}
              placeholder="e.g. Mathematics marks for 3 students look inconsistent with coursework — please verify."
              value={changesNote}
              onChange={(e) => setChangesNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangesFor(null)}>
              Cancel
            </Button>
            <Button onClick={requestChanges} disabled={!changesNote.trim()}>
              Send change request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit trail dialog */}
      <Dialog open={!!auditFor} onOpenChange={(open) => !open && setAuditFor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Audit trail — {auditFor ? classById(auditFor.classId)?.name : ""}</DialogTitle>
            <DialogDescription>Chronological record of submissions and decisions.</DialogDescription>
          </DialogHeader>
          {auditFor && auditFor.audit.length > 0 ? (
            <div className="max-h-[50vh] space-y-4 overflow-y-auto border-l border-border py-1 pl-5">
              {auditFor.audit.map((entry, i) => (
                <div key={`${entry.at}-${i}`} className="relative">
                  <span className="absolute -left-[25px] top-1 flex size-2.5 items-center justify-center rounded-full bg-primary" />
                  <p className="text-xs text-muted-foreground tabular">{entry.at}</p>
                  <p className="text-[13.5px] font-medium text-foreground">{entry.action}</p>
                  <p className="text-xs text-muted-foreground">
                    by {entry.actor}
                    {entry.detail ? ` — ${entry.detail}` : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CircleCheck}
              title="No audit entries yet"
              description="Entries appear when the class teacher submits for review."
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
