"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useAcademicAdminStore, useAcademicAdmin } from "@/lib/academic-store";
import { classCompleteness } from "@/lib/academic-admin";
import { allClasses, classById } from "@/lib/demo-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BookOpen, CheckCircle2, CircleDashed, Layers, Users } from "lucide-react";

const YEAR = "2026";

/** Academic Dashboard (task §3): configuration completeness across the school. */
export default function AcademicDashboardPage() {
  useAcademicAdmin();
  const curricula = useAcademicAdminStore((s) => s.curricula);
  const adoptions = useAcademicAdminStore((s) => s.adoptions);
  const assignments = useAcademicAdminStore((s) => s.assignments);
  const registrations = useAcademicAdminStore((s) => s.registrations);
  const items = useAcademicAdminStore((s) => s.items);
  const combinations = useAcademicAdminStore((s) => s.combinations);

  const data = useMemo(
    () => ({ curricula, adoptions, assignments, registrations, items }),
    [curricula, adoptions, assignments, registrations, items],
  );

  const rows = allClasses.map((cls) => ({
    cls,
    completeness: classCompleteness(data, cls.id, YEAR),
    adoption: adoptions[`${cls.id}|${YEAR}`],
  }));

  const complete = rows.filter((r) => r.completeness.score === 100).length;
  const catalogueSubjects = items.filter((i) => i.type === "subject").length;
  const catalogueAreas = items.filter((i) => i.type === "learning-area").length;
  const activeAssignments = assignments.filter((a) => a.endsAt === null && a.status === "assigned").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Academic Dashboard"
        description="Configuration completeness across Early Years, Primary and Secondary for the academic year. Detailed configuration happens in the module pages."
        actions={
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link href="/academic/catalogue">Open catalogue</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat icon={BookOpen} label="Catalogue items"
          value={`${catalogueSubjects} subjects · ${catalogueAreas} areas`}
          hint="Registered once, reused everywhere" />
        <MiniStat icon={Layers} label="Curricula"
          value={String(curricula.length)}
          hint={`${Object.keys(adoptions).length} class adoption(s) for ${YEAR}`} />
        <MiniStat icon={Users} label="Teacher assignments"
          value={String(activeAssignments)}
          hint="Active rows drive marks-entry access" />
        <MiniStat icon={CheckCircle2} label="Classes fully configured"
          value={`${complete}/${rows.length}`}
          hint={`${combinations.filter((c) => c.status === "active").length} active optional combinations`} />
      </div>

      <SectionCard
        noPadding
        title={`Configuration completeness — ${YEAR}`}
        description="Allocation, teacher coverage, student registrations and assessment setup per class."
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="min-w-40 pl-4">Class</TableHead>
              <TableHead className="w-24">Section</TableHead>
              <TableHead className="w-48">Curriculum</TableHead>
              <TableHead className="w-56">Completeness</TableHead>
              <TableHead className="w-24 pr-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ cls, completeness, adoption }) => {
              const curriculum = curricula.find((c) => c.id === adoption?.curriculumId);
              return (
                <TableRow key={cls.id}>
                  <TableCell className="pl-4">
                    <Link href={`/academic/classes/${cls.id}/subjects`} className="text-compact font-medium text-foreground hover:underline">
                      {cls.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{classById(cls.id)?.level}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">{curriculum?.section ?? "—"}</Badge>
                  </TableCell>
                  <TableCell className="text-compact text-muted-foreground">
                    {curriculum?.name ?? "None adopted"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={completeness.score} className="h-1.5 w-28" />
                      <span className="w-8 text-xs tabular text-muted-foreground">{completeness.score}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="pr-4">
                    {completeness.score === 100 ? (
                      <span className="inline-flex items-center gap-1.5 text-compact text-emerald-600">
                        <CheckCircle2 className="size-3.5" /> Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-compact text-amber-600">
                        <CircleDashed className="size-3.5" /> In progress
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, hint }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint: string;
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="mt-1.5 text-base font-semibold text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
