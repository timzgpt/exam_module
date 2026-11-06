"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { useClassTemplateKind } from "@/hooks/use-class-template";
import { useClassContext } from "@/hooks/use-academic-context";
import { isNurseryTemplateKind } from "@/lib/report-templates";
import { useAcademicAdminStore, useAcademicAdmin } from "@/lib/academic-store";
import {
  activeAssignmentFor,
  adoptedCurriculum,
  classCompleteness,
} from "@/lib/academic-admin";
import {
  classById,
  studentsInClass,
  teacherById,
} from "@/lib/demo-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BookOpen,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Clock,
  Layers,
  ListChecks,
  Users,
} from "lucide-react";

const YEAR = "2026";

/**
 * Class subjects route (task §12): a class-level OVERVIEW. Detailed
 * configuration happens in the dedicated Academic Management modules —
 * this page summarises the applied curriculum, allocated items, teacher
 * assignments, registration coverage and assessment readiness, and links
 * to where each concern is managed.
 */
export default function ClassSubjectsPage() {
  useAcademicAdmin();
  const { klass: cls } = useClassContext();
  const templateKind = useClassTemplateKind(cls.id);
  if (isNurseryTemplateKind(templateKind)) {
    return (
      <div className="space-y-5">
        <PageHeader
          title={`Class subjects: ${cls.name}`}
          description="Early Years class — learning areas are managed through the curriculum and the report-template configuration."
        />
        <EarlyYearsOverview classId={cls.id} />
      </div>
    );
  }
  return <ClassOverview key={cls.id} classId={cls.id} />;
}

function OverviewShell({ children, stats }: {
  children: React.ReactNode;
  stats: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      {stats}
      {children}
    </div>
  );
}

/* ── Early Years variant ─────────────────────────────────────────── */

function EarlyYearsOverview({ classId }: { classId: string }) {
  const curricula = useAcademicAdminStore((s) => s.curricula);
  const adoptions = useAcademicAdminStore((s) => s.adoptions);
  const assignments = useAcademicAdminStore((s) => s.assignments);
  const registrations = useAcademicAdminStore((s) => s.registrations);
  const items = useAcademicAdminStore((s) => s.items);
  const curriculum = adoptedCurriculum({ curricula, adoptions }, classId, YEAR);
  const ordered = [...(curriculum?.items ?? [])].sort((a, b) => a.order - b.order);
  const students = studentsInClass(classId);
  const cls = classById(classId);

  return (
    <OverviewShell
      stats={
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Learning areas" value={ordered.length} icon={BookOpen} tone="primary"
            hint={curriculum?.name ?? "No curriculum adopted"} />
          <StatCard label="Responsible teacher" value={teacherById(cls?.classTeacherId)?.name ?? "—"} icon={Users}
            hint="Class teacher covers all areas by default" />
          <StatCard label="Learners covered" value={registrations.filter((r) => r.classId === classId && r.status === "active").length > 0 ? `${students.length}/${students.length}` : "0"} icon={ListChecks}
            hint="Automatic learning-area coverage on enrolment" />
          <StatCard label="Assessment model" value="Developmental" icon={CheckCircle2}
            hint="Emerging → Developing → Achieved → Exceeding" />
        </div>
      }
    >
      <SectionCard
        noPadding
        title={`Learning areas — ${cls?.name ?? classId}`}
        description="The area list mirrors the adopted Early Years curriculum. Edit it in Curriculum Management; observations and competency grades are entered on the assessment editor."
        actions={
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link href="/academic/curricula"><Layers className="size-4" /> Edit curriculum</Link>
          </Button>
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="min-w-48 pl-4">Learning area</TableHead>
              <TableHead className="w-16">Code</TableHead>
              <TableHead className="w-24">Teacher</TableHead>
              <TableHead className="w-44">Assessment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordered.map((ci) => {
              const item = items.find((i) => i.id === ci.itemId);
              const assignment = activeAssignmentFor({ assignments }, classId, ci.itemId, YEAR);
              return (
                <TableRow key={ci.itemId}>
                  <TableCell className="pl-4 text-compact font-medium">{item?.name ?? ci.itemId}</TableCell>
                  <TableCell className="font-mono text-xs">{item?.code}</TableCell>
                  <TableCell className="text-compact text-muted-foreground">
                    {assignment ? teacherById(assignment.teacherId)?.name ?? "—" : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {ci.assessment.developmentalModel?.join(" → ") ?? "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </SectionCard>

      <SectionCard>
        <div className="flex flex-wrap justify-center gap-2 py-2">
          <Button asChild>
            <Link href={`/academic/report-cycles/cy1/classes/${classId}/marks`}>Enter assessments</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/academic/report-templates">Report templates</Link>
          </Button>
        </div>
      </SectionCard>
    </OverviewShell>
  );
}

/* ── Primary / Secondary overview ────────────────────────────────── */

function ClassOverview({ classId }: { classId: string }) {
  useAcademicAdmin();
  const curricula = useAcademicAdminStore((s) => s.curricula);
  const adoptions = useAcademicAdminStore((s) => s.adoptions);
  const assignments = useAcademicAdminStore((s) => s.assignments);
  const registrations = useAcademicAdminStore((s) => s.registrations);
  const items = useAcademicAdminStore((s) => s.items);
  const assessmentOverrides = useAcademicAdminStore((s) => s.assessmentOverrides);

  const cls = classById(classId);
  const curriculum = adoptedCurriculum({ curricula, adoptions }, classId, YEAR);
  const completeness = classCompleteness(
    { curricula, adoptions, assignments, registrations, items },
    classId,
    YEAR,
  );
  const students = useMemo(() => studentsInClass(classId), [classId]);
  const ordered = useMemo(
    () => [...(curriculum?.items ?? [])].sort((a, b) => a.order - b.order),
    [curriculum],
  );
  const coreCount = ordered.filter((ci) => ci.classification === "core").length;
  const periods = ordered.reduce((a, ci) => a + ci.periodsPerWeek, 0);
  const adoption = adoptions[`${classId}|${YEAR}`];

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Class subjects: ${cls?.name ?? classId}`}
        description={`Class-level overview of the applied curriculum, teacher assignments, student registration and assessment readiness. Configuration happens in the dedicated Academic Management modules.`}
        actions={
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link href="/academic/allocation">Open Class Subject Allocation</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Applied curriculum"
          value={curriculum ? `v${curriculum.version}` : "—"}
          icon={Layers}
          tone="primary"
          hint={curriculum?.name ?? "No curriculum adopted"}
        />
        <StatCard
          label="Allocated items"
          value={ordered.length}
          icon={BookOpen}
          hint={`${coreCount} core · ${ordered.length - coreCount} optional`}
        />
        <StatCard
          label="Periods per week"
          value={periods}
          icon={Clock}
          hint="Sum of allocated items"
        />
        <StatCard
          label="Configuration status"
          value={`${completeness.score}%`}
          icon={completeness.score === 100 ? CheckCircle2 : CircleDashed}
          tone={completeness.score === 100 ? "primary" : "default"}
          hint={[completeness.teachers && "teachers", completeness.registrations && "registrations", completeness.assessment && "assessment"].filter(Boolean).join(" · ") || "incomplete"}
        />
      </div>

      <SectionCard
        noPadding
        title="Allocated subjects"
        description={`Adoption is ${adoption?.status ?? "none"} for ${YEAR}. Order drives the report card and marks grids.`}
      >
        {ordered.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-compact text-muted-foreground">No curriculum applied yet.</p>
            <Button asChild size="sm" variant="outline" className="mt-3 gap-1.5">
              <Link href="/academic/allocation">Apply a curriculum</Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-12 pl-4 text-center">#</TableHead>
                <TableHead className="min-w-44">Subject</TableHead>
                <TableHead className="w-16">Code</TableHead>
                <TableHead className="w-20">Type</TableHead>
                <TableHead className="min-w-40">Teacher</TableHead>
                <TableHead className="w-28 text-center">Registered</TableHead>
                <TableHead className="w-28">Assessment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordered.map((ci, i) => {
                const item = items.find((it) => it.id === ci.itemId);
                if (!item) return null;
                const assignment = activeAssignmentFor({ assignments }, classId, ci.itemId, YEAR);
                const registered = registrations.filter(
                  (r) => r.classId === classId && r.itemId === ci.itemId && r.status === "active" && r.academicYear === YEAR,
                ).length;
                const override = assessmentOverrides[`${classId}|${ci.itemId}`];
                return (
                  <TableRow key={ci.itemId}>
                    <TableCell className="pl-4 text-center text-xs tabular text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <p className="text-compact font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.code}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {ci.classification === "core" ? "Core" : "Optional"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {assignment ? (
                        <span className="text-compact">{teacherById(assignment.teacherId)?.name ?? "—"}</span>
                      ) : (
                        <span className="text-compact text-destructive">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-compact tabular">
                      {ci.classification === "core" ? (
                        <span className="text-muted-foreground">all ({registered})</span>
                      ) : (
                        `${registered}/${students.length}`
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ci.assessment.developmentalModel
                        ? "Developmental"
                        : `CA ${override?.caMarks ?? ci.assessment.caMarks} + ${override?.examMarks ?? ci.assessment.examMarks}`}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {/* Module links */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ModuleLink
          href="/academic/teacher-allocation"
          icon={Users}
          title="Teacher Allocation"
          description="Assign or reassign responsible teachers per subject."
        />
        <ModuleLink
          href="/academic/registrations"
          icon={ListChecks}
          title="Student Registration"
          description="Register optional subjects and combinations."
        />
        <ModuleLink
          href="/academic/assessment-config"
          icon={ClipboardList}
          title="Assessment Configuration"
          description="Adjust CA / exam weightings per class subject."
        />
      </div>
    </div>
  );
}

function ModuleLink({ href, icon: Icon, title, description }: {
  href: string; icon: React.ComponentType<{ className?: string }>; title: string; description: string;
}) {
  return (
    <Link href={href} className="group rounded-lg border p-4 transition-colors hover:border-muted-foreground/40">
      <p className="flex items-center gap-2 text-compact font-medium text-foreground">
        <Icon className="size-4 text-muted-foreground" /> {title}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </Link>
  );
}
