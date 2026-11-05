"use client";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge, toneForStatus, labelForStatus } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { downloadCsv } from "@/lib/csv";
import { SCHOOL } from "@/lib/demo-config";
import { exams as demoExams, subjectById, teacherById } from "@/lib/demo-data";
import { CalendarDays, ClipboardList, Download, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Exam } from "@/lib/types";

const STATUS_TABS = ["all", "scheduled", "ongoing", "completed", "draft"] as const;

export default function ExamsPage() {
  const { toast } = useToast();
  const [exams, setExams] = useState<Exam[]>(demoExams);
  const [tab, setTab] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Exam | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Terminal", startDate: "", endDate: "", notes: "" });

  const filtered = useMemo(
    () =>
      exams
        .filter((e) => tab === "all" || e.status === tab)
        .filter(
          (e) =>
            e.name.toLowerCase().includes(query.toLowerCase()) ||
            e.type.toLowerCase().includes(query.toLowerCase()),
        ),
    [exams, tab, query],
  );

  const nextExam = exams
    .filter((e) => e.status === "scheduled" || e.status === "ongoing")
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

  const counts = {
    scheduled: exams.filter((e) => e.status === "scheduled").length,
    ongoing: exams.filter((e) => e.status === "ongoing").length,
    completed: exams.filter((e) => e.status === "completed").length,
  };

  const createExam = () => {
    if (!form.name.trim() || !form.startDate || !form.endDate) return;
    const exam: Exam = {
      id: `ex-${Date.now()}`,
      name: form.name.trim(),
      term: "Term 1",
      academicYear: "2026",
      type: form.type as Exam["type"],
      startDate: form.startDate,
      endDate: form.endDate,
      status: "scheduled",
      sittings: [],
    };
    setExams((prev) => [exam, ...prev]);
    setCreateOpen(false);
    setForm({ name: "", type: "Terminal", startDate: "", endDate: "", notes: "" });
    toast({
      title: "Exam scheduled",
      description: `${exam.name} was added to the ${exam.term} calendar. Add subject sittings next.`,
    });
  };

  const exportCsv = () => {
    const rows = [
      ["Exam", "Type", "Term", "Start", "End", "Status", "Sittings"],
      ...exams.map((e) => [e.name, e.type, e.term, e.startDate, e.endDate, e.status, String(e.sittings.length)]),
    ];
    downloadCsv(rows, "exams-2026-term1.csv");
    toast({ title: "Exported", description: "Exam calendar downloaded as CSV." });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Exams"
        description={`Exam administration for ${SCHOOL.academicYear}. Schedule sittings, track status and manage invigilation.`}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv}>
              <Download className="size-4" /> Export CSV
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="size-4" /> New exam
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Schedule a new exam</DialogTitle>
                  <DialogDescription>
                    The exam is created as scheduled; add subject sittings afterwards.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3.5 py-1">
                  <div className="grid gap-1.5">
                    <Label htmlFor="exam-name">Exam name</Label>
                    <Input
                      id="exam-name"
                      placeholder="e.g. Terminal Examinations"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Type</Label>
                    {/* ds-allow-native-select: shadcn Select is a Radix listbox trigger, not a native select */}
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Terminal", "Mid-term", "Monthly test", "Mock"].map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="exam-start">Start date</Label>
                      <Input
                        id="exam-start"
                        type="date"
                        value={form.startDate}
                        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="exam-end">End date</Label>
                      <Input
                        id="exam-end"
                        type="date"
                        value={form.endDate}
                        onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="exam-notes">Notes (optional)</Label>
                    <Textarea
                      id="exam-notes"
                      placeholder="Instructions for invigilators…"
                      rows={2}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createExam} disabled={!form.name.trim() || !form.startDate || !form.endDate}>
                    Schedule exam
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Exams this term" value={exams.length} icon={ClipboardList} hint="Term 1 · 2026" />
        <StatCard label="Scheduled" value={counts.scheduled} icon={CalendarDays} tone="primary" hint="Awaiting commencement" />
        <StatCard label="Ongoing" value={counts.ongoing} icon={CalendarDays} tone="warning" hint="In progress" />
        <StatCard
          label="Next exam"
          value={nextExam ? nextExam.startDate.slice(5) : "-"}
          icon={CalendarDays}
          tone="success"
          hint={nextExam?.name ?? "Nothing scheduled"}
        />
      </div>

      <SectionCard noPadding title="Exam calendar" description="All examinations registered for the academic year.">
        <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="min-h-8 max-w-full flex-wrap">
              {STATUS_TABS.map((t) => (
                <TabsTrigger key={t} value={t} className="h-7 px-2.5 text-xs capitalize">
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative sm:w-64">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exams…"
              className="h-8 pl-8 text-compact"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No exams match your filters"
            description="Adjust the status filter or search query."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-55 pl-4">Exam</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead className="text-center">Sittings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="pl-4">
                      <p className="text-compact font-medium text-foreground">{exam.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {exam.term} · {exam.academicYear}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-muted-foreground">
                        {exam.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-compact tabular text-muted-foreground">
                      {exam.startDate} → {exam.endDate}
                    </TableCell>
                    <TableCell className="text-center text-compact tabular">{exam.sittings.length}</TableCell>
                    <TableCell>
                      <StatusBadge tone={toneForStatus(exam.status)} label={labelForStatus(exam.status)} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => setSelected(exam)}>
                        View details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* Sitting timetable */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected?.name}
              {selected ? (
                <StatusBadge tone={toneForStatus(selected.status)} label={labelForStatus(selected.status)} />
              ) : null}
            </DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.term} ${selected.academicYear} · ${selected.startDate} → ${selected.endDate} · ${selected.sittings.length} subject sittings`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {selected && selected.sittings.length > 0 ? (
            <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Invigilator</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.sittings.map((s) => (
                    <TableRow key={s.subjectId}>
                      <TableCell className="whitespace-nowrap tabular">{s.date}</TableCell>
                      <TableCell className="whitespace-nowrap tabular">
                        {s.startTime} · {s.durationMin}min
                      </TableCell>
                      <TableCell className="text-compact font-medium">
                        {subjectById(s.subjectId)?.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">-</TableCell>
                      <TableCell className="text-muted-foreground">{s.venue}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {teacherById(s.invigilatorId)?.name ?? "TBA"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No sittings yet"
              description="Subject sittings for this exam have not been scheduled."
            />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!selected) return;
                setExams((prev) =>
                  prev.map((e) =>
                    e.id === selected.id
                      ? { ...e, status: e.status === "scheduled" ? "ongoing" : e.status === "ongoing" ? "completed" : e.status }
                      : e,
                  ),
                );
                setSelected(null);
                toast({ title: "Status updated", description: `${selected.name} status changed.` });
              }}
              disabled={!selected || selected.status === "completed" || selected.status === "draft"}
            >
              {selected?.status === "ongoing" ? "Mark as completed" : "Start exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
