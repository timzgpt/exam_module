"use client";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DEMO_IDS } from "@/lib/demo-config";
import {
  classById,
  commentFor,
  commentTemplates,
  cycleById,
  currentCycle,
  studentsInClass,
} from "@/lib/demo-data";
import type { CommentRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronRight, MessageSquareText, PenLine, Search, Send } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

const REMARK_MAX = 240;

export default function CommentsPage() {
  const { toast } = useToast();
  const params = useParams<{ cycleId?: string; classId?: string }>();
  const cls = classById(params.classId ?? "") ?? classById(DEMO_IDS.classId)!;
  const cycle = cycleById(params.cycleId ?? "") ?? currentCycle;
  const students = useMemo(() => studentsInClass(cls.id), [cls.id]);

  const [comments, setComments] = useState<Record<string, CommentRecord>>(() =>
    Object.fromEntries(students.map((s) => [s.id, commentFor(cls.id, s.id)])),
  );
  const [selectedId, setSelectedId] = useState<string>(students[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [edited, setEdited] = useState<Set<string>>(() => new Set());

  const selected = selectedId ? comments[selectedId] : undefined;
  const selectedStudent = students.find((s) => s.id === selectedId);

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(query.toLowerCase()),
  );

  const doneCount = students.filter((s) => comments[s.id]?.classTeacher !== null).length;
  const missingCount = students.length - doneCount;

  const updateSelected = (patch: Partial<CommentRecord>) => {
    if (!selectedId) return;
    setComments((prev) => ({
      ...prev,
      [selectedId]: { ...prev[selectedId], ...patch, studentId: selectedId },
    }));
    setEdited((prev) => {
      const next = new Set(prev);
      next.add(selectedId);
      return next;
    });
  };

  const insertTemplate = (key: string) => {
    setTemplateKey(key);
    const template = commentTemplates[Number(key)];
    if (!template || !selectedId) return;
    const base = (comments[selectedId].classTeacher ?? "").trimEnd();
    const next = `${base ? `${base} ` : ""}${template}`.slice(0, REMARK_MAX);
    updateSelected({ classTeacher: next });
    toast({ title: "Template inserted", description: "The template text was appended to the class teacher's remark." });
  };

  const saveDraft = () => {
    if (!selected) return;
    updateSelected({ status: "draft" });
    toast({
      title: "Draft saved",
      description: `Comment saved as draft for ${selectedStudent?.name ?? "student"}.`,
    });
  };

  const markSubmitted = () => {
    if (!selected || !selected.classTeacher?.trim()) return;
    updateSelected({ status: "submitted" });
    toast({
      title: "Comment submitted",
      description: `Comment submitted for ${selectedStudent?.name ?? "student"}.`,
    });
  };

  const goNextMissing = () => {
    const start = students.findIndex((s) => s.id === selectedId);
    for (let k = 1; k <= students.length; k++) {
      const cand = students[(start + k) % students.length];
      if (cand && comments[cand.id]?.classTeacher === null) {
        setSelectedId(cand.id);
        return;
      }
    }
    toast({
      title: "All remarks complete",
      description: `Every student in ${cls.name} has a class teacher's remark.`,
    });
  };

  const dotClass = (rec: CommentRecord | undefined) =>
    !rec || rec.classTeacher === null
      ? "bg-destructive ring-2 ring-destructive/25"
      : rec.status === "draft"
        ? "bg-warning"
        : "bg-success";

  const statusLabel = (rec: CommentRecord | undefined) =>
    !rec || rec.classTeacher === null ? "Missing" : rec.status === "draft" ? "Draft" : "Submitted";

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Comments: ${cls.name}`}
        description={`${cycle.name} · write the class teacher's remark per student, insert templates and submit for report generation.`}
      />

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* Student list */}
        <SectionCard noPadding title="Students" description={`${doneCount} of ${students.length} remarks complete`}>
          <div className="border-b border-border/70 p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search students…"
                className="h-8 pl-8 text-compact"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full gap-1.5 text-xs"
              onClick={goNextMissing}
              disabled={missingCount === 0}
            >
              <ChevronRight className="size-3.5" />
              Next missing
              {missingCount > 0 ? (
                <span className="ml-auto font-medium tabular text-destructive">{missingCount}</span>
              ) : null}
            </Button>
          </div>
          <div className="max-h-[52vh] overflow-y-auto lg:max-h-[calc(100vh-(var(--spacing)*80))]">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">No students match “{query}”.</p>
            ) : (
              filtered.map((s) => {
                const rec = comments[s.id];
                const isSel = s.id === selectedId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 border-b border-border/50 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-muted/50",
                      isSel && "bg-muted/70",
                    )}
                  >
                    <span className={cn("size-2 shrink-0 rounded-full", dotClass(rec))} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-compact font-medium text-foreground">{s.name}</span>
                      <span className="block text-2xs tabular text-muted-foreground">{s.admissionNo}</span>
                    </span>
                    {edited.has(s.id) ? <PenLine className="size-3 shrink-0 text-muted-foreground" /> : null}
                    <span
                      className={cn(
                        "shrink-0 text-2xs font-medium",
                        !rec || rec.classTeacher === null
                          ? "text-destructive"
                          : rec.status === "draft"
                            ? "text-warning"
                            : "text-success",
                      )}
                    >
                      {statusLabel(rec)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </SectionCard>

        {/* Editor */}
        {selected && selectedStudent ? (
          <SectionCard
            noPadding
            title={selectedStudent.name}
            description={`Adm. ${selectedStudent.admissionNo} · ${selected.classTeacher === null ? "No remark yet" : `Last updated ${selected.updatedAt}`}`}
            actions={
              <StatusBadge
                tone={
                  selected.classTeacher === null
                    ? "destructive"
                    : selected.status === "draft"
                      ? "warning"
                      : "success"
                }
                label={statusLabel(selected)}
              />
            }
          >
            <div className="space-y-5 p-4 sm:p-5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Progress: {doneCount} of {students.length} comments complete
                  </span>
                  <span className="tabular">
                    {students.length ? Math.round((doneCount / students.length) * 100) : 0}%
                  </span>
                </div>
                <Progress value={students.length ? (doneCount / students.length) * 100 : 0} />
              </div>

              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="class-teacher-remark">Class teacher&apos;s remark</Label>
                  <span className="text-xs tabular text-muted-foreground">
                    {(selected.classTeacher ?? "").length}/{REMARK_MAX}
                  </span>
                </div>
                <Textarea
                  id="class-teacher-remark"
                  rows={4}
                  maxLength={REMARK_MAX}
                  value={selected.classTeacher ?? ""}
                  onChange={(e) => updateSelected({ classTeacher: e.target.value })}
                  placeholder="Write a constructive remark about this student's term…"
                />
              </div>

              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="head-remark">Head of School&apos;s remark (optional)</Label>
                  <span className="text-xs tabular text-muted-foreground">
                    {(selected.headTeacher ?? "").length}/{REMARK_MAX}
                  </span>
                </div>
                <Textarea
                  id="head-remark"
                  rows={2}
                  maxLength={REMARK_MAX}
                  value={selected.headTeacher ?? ""}
                  onChange={(e) => updateSelected({ headTeacher: e.target.value })}
                  placeholder="Optional remark from the Head of School…"
                />
              </div>

              <div className="grid gap-1.5">
                <Label>Insert template</Label>
                {/* ds-allow-native-select: shadcn Select is a Radix listbox trigger, not a native select */}
                <Select value={templateKey} onValueChange={insertTemplate}>
                  <SelectTrigger className="w-full sm:w-80">
                    <SelectValue placeholder="Insert template…" />
                  </SelectTrigger>
                  <SelectContent>
                    {commentTemplates.map((t, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {t.length > 64 ? `${t.slice(0, 64)}…` : t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={saveDraft}>
                  <PenLine className="size-4" /> Save draft
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={markSubmitted}
                  disabled={!selected.classTeacher?.trim()}
                >
                  <Send className="size-4" /> Mark as submitted
                </Button>
                <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageSquareText className="size-3.5" />
                  {edited.has(selectedStudent.id)
                    ? "Edited this session"
                    : selected.classTeacher === null
                      ? "Awaiting remark"
                      : "Loaded from draft records"}
                </span>
              </div>
            </div>
          </SectionCard>
        ) : (
          <SectionCard noPadding>
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              Select a student from the list to write their report comment.
            </p>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
