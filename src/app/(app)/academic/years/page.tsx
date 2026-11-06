"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useAcademicAdminStore, useAcademicAdmin } from "@/lib/academic-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CalendarRange, Plus, Trash2 } from "lucide-react";

/**
 * Academic Years & Terms (task §3). The list seeds from the school's demo
 * calendar (2026 · Terms 1–3) and is the academic-year scope used by the
 * catalogue, curricula and allocations.
 */
export default function AcademicYearsPage() {
  useAcademicAdmin();
  const { toast } = useToast();
  const years = useAcademicAdminStore((s) => s.years);
  const curricula = useAcademicAdminStore((s) => s.curricula);
  const adoptions = useAcademicAdminStore((s) => s.adoptions);

  const [newYear, setNewYear] = useState("");
  const [newTerms, setNewTerms] = useState("Term 1, Term 2, Term 3");

  const addYear = () => {
    const year = newYear.trim();
    if (!/^\d{4}(\/\d{2,4})?$/.test(year)) {
      toast({ title: "Invalid year", description: "Use a year like 2027 or 2027/28.", variant: "destructive" });
      return;
    }
    if (years.some((y) => y.year === year)) {
      toast({ title: "Year already exists", description: year, variant: "destructive" });
      return;
    }
    const terms = newTerms.split(",").map((t) => t.trim()).filter(Boolean);
    useAcademicAdminStore.setState((s) => ({
      years: [...s.years, { year, terms }],
      audit: [...s.audit, {
        id: `audit-${Date.now()}`,
        at: new Date().toISOString(),
        actor: "academic-master",
        action: "add-year",
        entity: "academic_year",
        entityId: year,
        detail: `${year} with ${terms.length} term(s)`,
      }],
    }));
    toast({ title: "Academic year added", description: `${year} · ${terms.join(", ")}` });
    setNewYear("");
  };

  const removeYear = (year: string) => {
    const inUse = Object.keys(adoptions).some((k) => k.endsWith(`|${year}`)) ||
      curricula.some((c) => c.academicYear === year);
    if (inUse) {
      toast({
        title: "Year in use",
        description: `${year} has curricula or class allocations — retire it after those are removed.`,
        variant: "destructive",
      });
      return;
    }
    useAcademicAdminStore.setState((s) => ({
      years: s.years.filter((y) => y.year !== year),
      audit: [...s.audit, {
        id: `audit-${Date.now()}`,
        at: new Date().toISOString(),
        actor: "academic-master",
        action: "remove-year",
        entity: "academic_year",
        entityId: year,
        detail: "removed",
      }],
    }));
    toast({ title: "Academic year removed", description: year });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Academic Years & Terms"
        description="The academic calendar scope for curricula, allocations and registrations. Historical years keep their records intact."
      />

      <SectionCard noPadding title={`Academic years (${years.length})`}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-28 pl-4">Year</TableHead>
              <TableHead className="min-w-48">Terms</TableHead>
              <TableHead className="w-32 text-center">Curricula</TableHead>
              <TableHead className="w-32 text-center">Class allocations</TableHead>
              <TableHead className="w-20 pr-4 text-right">Remove</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {years.map((y) => (
              <TableRow key={y.year}>
                <TableCell className="pl-4">
                  <span className="inline-flex items-center gap-2 text-compact font-medium text-foreground">
                    <CalendarRange className="size-4 text-muted-foreground" /> {y.year}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {y.terms.map((t) => <Badge key={t} variant="secondary" className="font-normal">{t}</Badge>)}
                  </div>
                </TableCell>
                <TableCell className="text-center text-compact tabular">
                  {curricula.filter((c) => c.academicYear === y.year).length}
                </TableCell>
                <TableCell className="text-center text-compact tabular">
                  {Object.keys(adoptions).filter((k) => k.endsWith(`|${y.year}`)).length}
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeYear(y.year)} aria-label={`Remove ${y.year}`}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      <SectionCard title="Add an academic year" description="New years start empty — create curricula and allocations for them in the module pages.">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid w-40 gap-1.5">
            <Label htmlFor="new-year">Year</Label>
            <Input id="new-year" value={newYear} placeholder="2027" onChange={(e) => setNewYear(e.target.value)} />
          </div>
          <div className="grid w-72 gap-1.5">
            <Label htmlFor="new-terms">Terms (comma-separated)</Label>
            <Input id="new-terms" value={newTerms} onChange={(e) => setNewTerms(e.target.value)} />
          </div>
          <Button className="gap-1.5" onClick={addYear}>
            <Plus className="size-4" /> Add year
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
