"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useAcademicAdminStore, useAcademicAdmin } from "@/lib/academic-store";
import {
  adoptedCurriculum,
  levelsForSection,
  type Curriculum,
  type RegistrationMode,
  type SchoolSection,
  type SubjectCombination,
} from "@/lib/academic-admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Layers,
  ListPlus,
  Plus,
  Trash2,
} from "lucide-react";

const SECTIONS: SchoolSection[] = ["Early Years", "Primary", "Secondary"];

export default function CurriculaPage() {
  useAcademicAdmin();
  return (
    <div className="space-y-5">
      <PageHeader
        title="Curriculum Management"
        description="Define what each class level studies per academic year — learning areas for Early Years, compulsory subjects for Primary, core + optional with combinations for Secondary."
      />
      <Tabs defaultValue="Early Years">
        <TabsList>
          {SECTIONS.map((s) => (
            <TabsTrigger key={s} value={s}>{s}</TabsTrigger>
          ))}
        </TabsList>
        {SECTIONS.map((s) => (
          <TabsContent key={s} value={s} className="mt-4">
            <SectionWorkspace section={s} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/* ================================================================
 * Per-section workspace
 * ================================================================ */

function SectionWorkspace({ section }: { section: SchoolSection }) {
  useAcademicAdmin();
  const curricula = useAcademicAdminStore((s) => s.curricula);
  const years = useAcademicAdminStore((s) => s.years);
  const [year, setYear] = useState("2026");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const levels = useMemo(() => levelsForSection(section), [section]);
  const sectionCurricula = useMemo(
    () =>
      curricula.filter((c) => c.section === section && c.academicYear === year),
    [curricula, section, year],
  );
  const selected = curricula.find((c) => c.id === selectedId) ?? sectionCurricula[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid w-36 gap-1.5">
            <Label className="text-2xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Academic year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-9 w-full" aria-label="Academic year"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y.year} value={y.year}>{y.year}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {sectionCurricula.length > 1 ? (
            <div className="grid w-64 gap-1.5">
              <Label className="text-2xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Curriculum</Label>
              <Select value={selected?.id ?? ""} onValueChange={setSelectedId}>
                <SelectTrigger className="h-9 w-full" aria-label="Curriculum"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {sectionCurricula.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <NewCurriculumButton section={section} levels={levels} year={year} open={createOpen} onOpenChange={setCreateOpen} />
      </div>

      {selected ? (
        section === "Secondary" ? (
          <SecondaryWorkspace curriculum={selected} />
        ) : (
          <SimpleCurriculumEditor curriculum={selected} />
        )
      ) : (
        <SectionCard>
          <p className="py-10 text-center text-sm text-muted-foreground">
            No {section} curriculum defined for {year} yet. Create one to start adding items.
          </p>
        </SectionCard>
      )}
    </div>
  );
}

function NewCurriculumButton({ section, levels, year, open, onOpenChange }: {
  section: SchoolSection; levels: string[]; year: string; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const createCurriculum = useAcademicAdminStore((s) => s.createCurriculum);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");

  const create = () => {
    const result = createCurriculum({
      section,
      level,
      academicYear: year,
      name: name.trim() || `${section} curriculum — ${level}`,
    });
    if (!result.ok) {
      toast({ title: "Cannot create curriculum", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Curriculum created", description: "Add items from the catalogue, then publish." });
    setName("");
    setLevel("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onOpenChange(true)}>
        <Plus className="size-4" /> New curriculum
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New {section} curriculum</DialogTitle>
          <DialogDescription>One curriculum per section level and academic year.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div className="grid gap-1.5">
            <Label>Class level</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="w-full" aria-label="Class level"><SelectValue placeholder="Select level…" /></SelectTrigger>
              <SelectContent>
                {levels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cur-name">Name (optional)</Label>
            <Input id="cur-name" value={name} placeholder={`${section} curriculum — ${level || "…"}`}
              onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={create} disabled={!level}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================
 * Early Years & Primary editor (shared engine, different copy)
 * ================================================================ */

function SimpleCurriculumEditor({ curriculum }: { curriculum: Curriculum }) {
  useAcademicAdmin();
  const { toast } = useToast();
  const items = useAcademicAdminStore((s) => s.items);
  const addItem = useAcademicAdminStore((s) => s.addItemToCurriculum);
  const removeItem = useAcademicAdminStore((s) => s.removeItemFromCurriculum);
  const reorder = useAcademicAdminStore((s) => s.reorderCurriculumItem);
  const updateItemRow = useAcademicAdminStore((s) => s.updateCurriculumItem);
  const publish = useAcademicAdminStore((s) => s.publishCurriculum);
  const [addOpen, setAddOpen] = useState(false);
  const [pick, setPick] = useState("");

  const isEarlyYears = curriculum.section === "Early Years";
  const ordered = [...curriculum.items].sort((a, b) => a.order - b.order);
  const candidates = items.filter(
    (i) =>
      i.status === "active" &&
      i.sections.includes(curriculum.section) &&
      !curriculum.items.some((ci) => ci.itemId === i.id),
  );

  const add = () => {
    if (!pick) return;
    const result = addItem(curriculum.id, pick, "core");
    if (!result.ok) toast({ title: "Cannot add item", description: result.error, variant: "destructive" });
    else {
      toast({ title: "Item added", description: "Reorder rows and publish when the curriculum is ready." });
      setPick("");
      setAddOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionCard
        noPadding
        title={curriculum.name}
        description={
          isEarlyYears
            ? "Learning areas from the catalogue, in report-card order. Assessment uses the configurable developmental model — no numerical marks."
            : "Compulsory subjects for every student in this level. New students joining the class are registered automatically."
        }
        actions={
          <>
            <Badge variant={curriculum.status === "published" ? "secondary" : "outline"} className="mr-1 font-normal">
              v{curriculum.version} · {curriculum.status}
            </Badge>
            {curriculum.status === "draft" ? (
              <Button size="sm" className="gap-1.5" onClick={() => {
                const r = publish(curriculum.id);
                if (!r.ok) toast({ title: "Cannot publish", description: r.error, variant: "destructive" });
                else toast({ title: "Curriculum published", description: `${curriculum.name} is now the level's reference.` });
              }}>
                Publish
              </Button>
            ) : null}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAddOpen(true)}
              disabled={candidates.length === 0}>
              <ListPlus className="size-4" /> Add item
            </Button>
          </>
        }
      >
        {ordered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No items yet — add {isEarlyYears ? "learning areas" : "subjects"} from the catalogue.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-16 pl-4 text-center">Order</TableHead>
                <TableHead className="min-w-48">Item</TableHead>
                <TableHead className="w-16">Code</TableHead>
                {!isEarlyYears ? <TableHead className="w-20 text-center">Periods / wk</TableHead> : null}
                <TableHead className="w-44">Assessment</TableHead>
                <TableHead className="w-24 pr-4 text-right">Remove</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordered.map((ci, i) => {
                const item = items.find((it) => it.id === ci.itemId);
                if (!item) return null;
                return (
                  <TableRow key={ci.itemId}>
                    <TableCell className="pl-4">
                      <div className="flex items-center justify-center gap-0.5">
                        <Button variant="ghost" size="icon" className="size-6 text-muted-foreground"
                          onClick={() => reorder(curriculum.id, ci.itemId, -1)} disabled={i === 0}
                          aria-label={`Move ${item.name} up`}><ArrowUp className="size-3.5" /></Button>
                        <span className="w-4 text-center text-xs tabular text-muted-foreground">{i + 1}</span>
                        <Button variant="ghost" size="icon" className="size-6 text-muted-foreground"
                          onClick={() => reorder(curriculum.id, ci.itemId, 1)} disabled={i === ordered.length - 1}
                          aria-label={`Move ${item.name} down`}><ArrowDown className="size-3.5" /></Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-compact font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.code}</TableCell>
                    {!isEarlyYears ? (
                      <TableCell className="text-center">
                        <Input type="number" min={1} max={8} value={String(ci.periodsPerWeek)}
                          onChange={(e) => updateItemRow(curriculum.id, ci.itemId, {
                            periodsPerWeek: Math.min(8, Math.max(1, Number.parseInt(e.target.value, 10) || 1)),
                          })}
                          className="mx-auto h-8 w-14 text-center text-compact tabular"
                          aria-label={`Periods for ${item.name}`} />
                      </TableCell>
                    ) : null}
                    <TableCell>
                      {ci.assessment.developmentalModel ? (
                        <span className="text-xs text-muted-foreground">
                          Developmental: {ci.assessment.developmentalModel.join(" → ")}
                        </span>
                      ) : (
                        <span className="text-xs tabular text-muted-foreground">
                          CA {ci.assessment.caMarks} + Exam {ci.assessment.examMarks} = {ci.assessment.fullMarks}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          const r = removeItem(curriculum.id, ci.itemId);
                          if (!r.ok) toast({ title: "Cannot remove", description: r.error, variant: "destructive" });
                        }}
                        aria-label={`Remove ${item.name}`}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {/* Add item dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to {curriculum.name}</DialogTitle>
            <DialogDescription>
              {isEarlyYears
                ? "Pick a learning area offered for the Early Years section."
                : "Pick a subject offered for the Primary section."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-1">
            <Label>Catalogue item</Label>
            <Select value={pick} onValueChange={setPick}>
              <SelectTrigger className="w-full" aria-label="Catalogue item"><SelectValue placeholder="Choose an item…" /></SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={add} disabled={!pick}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================================================================
 * Secondary workspace: curriculum + combinations + registration mode
 * ================================================================ */

function SecondaryWorkspace({ curriculum }: { curriculum: Curriculum }) {
  return (
    <Tabs defaultValue="items">
      <TabsList>
        <TabsTrigger value="items">Curriculum items</TabsTrigger>
        <TabsTrigger value="combinations">Optional combinations</TabsTrigger>
        <TabsTrigger value="mode">Registration mode</TabsTrigger>
      </TabsList>
      <TabsContent value="items" className="mt-4">
        <SimpleCurriculumEditor curriculum={curriculum} />
      </TabsContent>
      <TabsContent value="combinations" className="mt-4">
        <CombinationsPanel curriculum={curriculum} />
      </TabsContent>
      <TabsContent value="mode" className="mt-4">
        <RegistrationModePanel curriculum={curriculum} />
      </TabsContent>
    </Tabs>
  );
}

function CombinationsPanel({ curriculum }: { curriculum: Curriculum }) {
  useAcademicAdmin();
  const { toast } = useToast();
  const combinations = useAcademicAdminStore((s) => s.combinations);
  const items = useAcademicAdminStore((s) => s.items);
  const saveCombination = useAcademicAdminStore((s) => s.saveCombination);
  const removeCombination = useAcademicAdminStore((s) => s.removeCombination);
  const [editing, setEditing] = useState<SubjectCombination | "new" | null>(null);

  const optionalItems = useMemo(
    () => items.filter((i) => i.type === "subject" && curriculum.items.some((ci) => ci.itemId === i.id)),
    [items, curriculum],
  );
  const combos = combinations.filter((c) => c.level === curriculum.level);

  return (
    <div className="space-y-4">
      <SectionCard
        noPadding
        title={`Optional-subject combinations — ${curriculum.level}`}
        description="School-configured named combinations. Students can be registered through a combination or by individual selection."
        actions={
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing("new")}>
            <Plus className="size-4" /> New combination
          </Button>
        }
      >
        {combos.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No combinations defined for {curriculum.level} yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Combination</TableHead>
                <TableHead className="w-16">Code</TableHead>
                <TableHead className="min-w-52">Included optional subjects</TableHead>
                <TableHead className="w-24 text-center">Min–Max</TableHead>
                <TableHead className="w-20">Status</TableHead>
                <TableHead className="w-24 pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {combos.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="pl-4 text-compact font-medium">{c.name}</TableCell>
                  <TableCell className="font-mono text-xs">{c.code}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.itemIds.map((id) => (
                        <Badge key={id} variant="secondary" className="font-normal">
                          {items.find((i) => i.id === id)?.name ?? id}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-compact tabular">
                    {c.minSelections ?? "–"} – {c.maxSelections ?? "–"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {c.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditing(c)}>Edit</Button>
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          const r = removeCombination(c.id);
                          if (!r.ok) toast({ title: "Cannot remove", description: r.error, variant: "destructive" });
                          else toast({ title: "Combination removed", description: c.name });
                        }}
                        aria-label={`Remove ${c.name}`}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {editing ? (
        <CombinationDialog
          curriculumLevel={curriculum.level}
          optionalItems={optionalItems}
          combination={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(draft) => {
            const r = saveCombination(draft);
            if (!r.ok) {
              toast({ title: "Cannot save combination", description: r.error, variant: "destructive" });
              return;
            }
            toast({ title: "Combination saved", description: draft.name });
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function CombinationDialog({ curriculumLevel, optionalItems, combination, onClose, onSave }: {
  curriculumLevel: string;
  optionalItems: { id: string; name: string; code: string }[];
  combination: SubjectCombination | null;
  onClose: () => void;
  onSave: (draft: Omit<SubjectCombination, "id"> & { id?: string }) => void;
}) {
  const [name, setName] = useState(combination?.name ?? "");
  const [code, setCode] = useState(combination?.code ?? "");
  const [selected, setSelected] = useState<string[]>(combination?.itemIds ?? []);
  const [minSel, setMinSel] = useState(String(combination?.minSelections ?? ""));
  const [maxSel, setMaxSel] = useState(String(combination?.maxSelections ?? ""));

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{combination ? `Edit ${combination.name}` : `New combination — ${curriculumLevel}`}</DialogTitle>
          <DialogDescription>Choose the optional subjects a student taking this combination may register.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="combo-name">Name</Label>
              <Input id="combo-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Combination A — Science" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="combo-code">Code</Label>
              <Input id="combo-code" value={code} maxLength={6} className="font-mono uppercase"
                onChange={(e) => setCode(e.target.value.toUpperCase())} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Included optional subjects</Label>
            <div className="grid gap-2 rounded-md border p-3">
              {optionalItems.map((i) => (
                <label key={i.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={selected.includes(i.id)} onCheckedChange={() => toggle(i.id)} />
                  {i.name} <span className="font-mono text-xs text-muted-foreground">{i.code}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="combo-min">Minimum selections</Label>
              <Input id="combo-min" type="number" min={0} value={minSel} placeholder="e.g. 2"
                onChange={(e) => setMinSel(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="combo-max">Maximum selections</Label>
              <Input id="combo-max" type="number" min={0} value={maxSel} placeholder="e.g. 3"
                onChange={(e) => setMaxSel(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() =>
              onSave({
                id: combination?.id,
                name: name.trim(),
                code: code.trim().toUpperCase(),
                level: curriculumLevel,
                itemIds: selected,
                minSelections: minSel === "" ? null : Math.max(0, Number.parseInt(minSel, 10) || 0),
                maxSelections: maxSel === "" ? null : Math.max(0, Number.parseInt(maxSel, 10) || 0),
                status: combination?.status ?? "active",
              })
            }
          >
            Save combination
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RegistrationModePanel({ curriculum }: { curriculum: Curriculum }) {
  useAcademicAdmin();
  const { toast } = useToast();
  const modes = useAcademicAdminStore((s) => s.registrationModes);
  const setMode = useAcademicAdminStore((s) => s.setRegistrationMode);
  const adoptions = useAcademicAdminStore((s) => s.adoptions);
  const year = curriculum.academicYear;
  const adoptingClasses = Object.values(adoptions).filter(
    (a) => a.curriculumId === curriculum.id,
  );
  const current = modes[`${adoptingClasses[0]?.classId ?? curriculum.id}|${year}`] ?? "individual";

  const options: [RegistrationMode, string, string][] = [
    ["individual", "Individual selection", "Each student chooses their optional subjects one by one."],
    ["combinations", "Predefined combinations", "Students are registered through a named combination."],
    ["both", "Both approaches", "Administrators may use either method per student."],
  ];

  return (
    <SectionCard
      title="Optional-subject registration mode"
      description="How optional subjects are chosen for classes running this curriculum (task §5.C Step 3)."
    >
      <div className="grid gap-3 md:grid-cols-3">
        {options.map(([value, title, description]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              const targets = adoptingClasses.length > 0
                ? adoptingClasses.map((a) => a.classId)
                : [curriculum.id];
              let failed: string | null = null;
              for (const classId of targets) {
                const r = setMode(classId, year, value);
                if (!r.ok) failed = r.error ?? null;
              }
              if (failed) toast({ title: "Cannot set mode", description: failed, variant: "destructive" });
              else toast({ title: "Registration mode updated", description: `${title} for ${curriculum.level}.` });
            }}
            className={`rounded-lg border p-4 text-left transition-colors ${
              current === value ? "border-primary ring-1 ring-primary" : "hover:border-muted-foreground/40"
            }`}
          >
            <p className="text-compact font-medium text-foreground">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </button>
        ))}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Layers className="size-3.5" />
        Applies to {adoptingClasses.length} adopting class(es) for {year}. Manage the actual registrations on the{" "}
        <Link href="/academic/registrations" className="underline">Student Subject Registration</Link> page.
      </p>
    </SectionCard>
  );
}
