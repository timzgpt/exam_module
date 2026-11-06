"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useAcademicAdminStore, useAcademicAdmin } from "@/lib/academic-store";
import {
  itemUsage,
  type AcademicItem,
  type AcademicItemType,
  type SchoolSection,
} from "@/lib/academic-admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  Layers,
  Lock,
  Pencil,
  Search,
  Plus,
} from "lucide-react";

const SECTIONS = ["Early Years", "Primary", "Secondary"] as const;

const emptyDraft = {
  name: "",
  code: "",
  type: "subject" as AcademicItemType,
  category: "",
  description: "",
  sections: [] as SchoolSection[],
  status: "active" as AcademicItem["status"],
};

export default function CataloguePage() {
  useAcademicAdmin(); // rehydrate on mount
  const { toast } = useToast();
  const items = useAcademicAdminStore((s) => s.items);
  const registerItem = useAcademicAdminStore((s) => s.registerItem);
  const updateItem = useAcademicAdminStore((s) => s.updateItem);
  const archiveItem = useAcademicAdminStore((s) => s.archiveItem);

  const [q, setQ] = useState("");
  const [section, setSection] = useState("all");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicItem | null>(null);
  const [usageOf, setUsageOf] = useState<AcademicItem | null>(null);
  const [draft, setDraft] = useState(emptyDraft);

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category).filter(Boolean))].sort(),
    [items],
  );

  const filtered = useMemo(
    () =>
      items.filter((i) => {
        if (section !== "all" && !i.sections.includes(section as never)) return false;
        if (type !== "all" && i.type !== type) return false;
        if (category !== "all" && i.category !== category) return false;
        if (status !== "all" && i.status !== status) return false;
        if (q.trim()) {
          const needle = q.trim().toLowerCase();
          if (!i.name.toLowerCase().includes(needle) && !i.code.toLowerCase().includes(needle))
            return false;
        }
        return true;
      }),
    [items, section, type, category, status, q],
  );

  const openRegister = () => {
    setDraft(emptyDraft);
    setEditing(null);
    setRegisterOpen(true);
  };

  const openEdit = (item: AcademicItem) => {
    setDraft({
      name: item.name,
      code: item.code,
      type: item.type,
      category: item.category,
      description: item.description,
      sections: [...item.sections],
      status: item.status,
    });
    setEditing(item);
    setRegisterOpen(true);
  };

  const save = () => {
    const payload = {
      ...draft,
      code: draft.code.trim().toUpperCase(),
      name: draft.name.trim(),
    };
    const result = editing ? updateItem(editing.id, payload) : registerItem(payload);
    if (!result.ok) {
      toast({ title: "Cannot save", description: result.error, variant: "destructive" });
      return;
    }
    toast({
      title: editing ? "Academic item updated" : "Academic item registered",
      description: `${payload.name} (${payload.code}) saved to the catalogue.`,
    });
    setRegisterOpen(false);
    setEditing(null);
  };

  const toggleSection = (s: SchoolSection) =>
    setDraft((d) => ({
      ...d,
      sections: d.sections.includes(s)
        ? d.sections.filter((x) => x !== s)
        : [...d.sections, s],
    }));

  const onArchive = (item: AcademicItem) => {
    const result = archiveItem(item.id);
    if (!result.ok) {
      toast({ title: "Cannot change status", description: result.error, variant: "destructive" });
      return;
    }
    toast({
      title: item.status === "active" ? "Item archived" : "Item restored",
      description:
        item.status === "active"
          ? `${item.name} can no longer be added to new curricula. Historical records remain accessible.`
          : `${item.name} is active again.`,
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Subject & Learning Area Catalogue"
        description="Manage academic subjects and learning areas available across Josephian Schools. Register an item once and reuse it across sections, curricula and years."
        actions={
          <Button size="sm" className="gap-1.5" onClick={openRegister}>
            <Plus className="size-4" /> Register Academic Item
          </Button>
        }
      />

      <SectionCard>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or code…"
              className="h-9 pl-8"
              aria-label="Search catalogue"
            />
          </div>
          <FilterSelect label="School section" value={section} onChange={setSection}
            options={[["all", "All sections"], ...SECTIONS.map((s) => [s, s] as [string, string])]} />
          <FilterSelect label="Item type" value={type} onChange={setType}
            options={[["all", "All types"], ["subject", "Subject"], ["learning-area", "Learning Area"]]} />
          <FilterSelect label="Category" value={category} onChange={setCategory}
            options={[["all", "All categories"], ...categories.map((c) => [c, c] as [string, string])]} />
          <FilterSelect label="Status" value={status} onChange={setStatus}
            options={[["all", "All statuses"], ["active", "Active"], ["inactive", "Archived"]]} />
        </div>
      </SectionCard>

      <SectionCard
        noPadding
        title={`Catalogue (${filtered.length})`}
        description="Register once — reuse everywhere. Archived items stay visible in history but cannot join new curricula."
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="min-w-45 pl-4">Academic item</TableHead>
              <TableHead className="w-20">Code</TableHead>
              <TableHead className="w-28">Type</TableHead>
              <TableHead className="w-32">Category</TableHead>
              <TableHead className="min-w-36">Available sections</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-44 pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="pl-4">
                  <p className="text-compact font-medium text-foreground">{item.name}</p>
                  <p className="max-w-md truncate text-xs text-muted-foreground">{item.description}</p>
                </TableCell>
                <TableCell className="font-mono text-xs">{item.code}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    {item.type === "subject" ? "Subject" : "Learning Area"}
                  </Badge>
                </TableCell>
                <TableCell className="text-compact text-muted-foreground">{item.category}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {item.sections.map((s) => (
                      <Badge key={s} variant="secondary" className="font-normal">{s}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {item.status === "active" ? (
                    <span className="inline-flex items-center gap-1.5 text-compact text-foreground">
                      <span className="size-1.5 rounded-full bg-emerald-500" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-compact text-muted-foreground">
                      <Archive className="size-3.5" /> Archived
                    </span>
                  )}
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs"
                      onClick={() => setUsageOf(item)}>
                      <Layers className="size-3.5" /> Usage
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7"
                      onClick={() => openEdit(item)} aria-label={`Edit ${item.name}`}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-foreground"
                      onClick={() => onArchive(item)}
                      aria-label={item.status === "active" ? `Archive ${item.name}` : `Restore ${item.name}`}
                    >
                      {item.status === "active" ? <Archive className="size-3.5" /> : <ArchiveRestore className="size-3.5" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No academic items match the current filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </SectionCard>

      {/* Register / edit dialog */}
      <Dialog open={registerOpen} onOpenChange={(o) => { setRegisterOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "Register Academic Item"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Changes apply everywhere the item is used — curricula, allocations and registrations keep their history."
                : "Register the item once. It becomes selectable in curricula for its applicable sections."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid gap-1.5">
              <Label htmlFor="item-name">Academic item name</Label>
              <Input id="item-name" value={draft.name} maxLength={80}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="item-code">Unique code</Label>
                <Input id="item-code" value={draft.code} maxLength={10} className="font-mono uppercase"
                  onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))} />
              </div>
              <div className="grid gap-1.5">
                <Label>Item type</Label>
                <Select value={draft.type} onValueChange={(v) => setDraft((d) => ({ ...d, type: v as AcademicItemType }))}>
                  <SelectTrigger className="w-full" aria-label="Item type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subject">Subject</SelectItem>
                    <SelectItem value="learning-area">Learning Area</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="item-category">Category</Label>
              <Input id="item-category" value={draft.category} maxLength={40}
                list="catalogue-categories"
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} />
              <datalist id="catalogue-categories">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="item-description">Description</Label>
              <Textarea id="item-description" rows={2} value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label>Applicable school sections</Label>
              <div className="flex flex-wrap gap-4">
                {SECTIONS.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={draft.sections.includes(s)} onCheckedChange={() => toggleSection(s)} />
                    {s}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRegisterOpen(false); setEditing(null); }}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save changes" : "Register item"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usage side drawer */}
      <Sheet open={!!usageOf} onOpenChange={(o) => !o && setUsageOf(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Curriculum usage — {usageOf?.name}</SheetTitle>
            <SheetDescription>
              Where this item appears across curricula, class allocations, teacher assignments and student registrations.
            </SheetDescription>
          </SheetHeader>
          {usageOf ? <UsageView itemId={usageOf.id} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function UsageView({ itemId }: { itemId: string }) {
  const curricula = useAcademicAdminStore((s) => s.curricula);
  const adoptions = useAcademicAdminStore((s) => s.adoptions);
  const assignments = useAcademicAdminStore((s) => s.assignments);
  const registrations = useAcademicAdminStore((s) => s.registrations);
  const usage = itemUsage(
    { curricula, adoptions, assignments, registrations },
    itemId,
  );
  return (
    <div className="space-y-4 px-4 pb-6">
      <UsageBlock icon={BookOpen} title="Curricula" count={usage.curricula.length}
        empty="Not part of any curriculum yet.">
        {usage.curricula.map((c) => (
          <p key={c.id} className="text-compact">{c.name} <span className="text-xs text-muted-foreground">· v{c.version} {c.status}</span></p>
        ))}
      </UsageBlock>
      <UsageBlock icon={Layers} title="Class allocations" count={usage.adoptions.length}
        empty="Not allocated to any class.">
        {usage.adoptions.map((a) => (
          <p key={a.classId} className="text-compact">{a.classId} <span className="text-xs text-muted-foreground">· via {a.curriculumId}</span></p>
        ))}
      </UsageBlock>
      <UsageBlock icon={Lock} title="Teacher assignments" count={usage.assignments}
        empty="No teacher assignments.">
        <p className="text-compact">{usage.assignments} active assignment(s)</p>
      </UsageBlock>
      <UsageBlock icon={BookOpen} title="Active student registrations" count={usage.registrations}
        empty="No student registrations.">
        <p className="text-compact">{usage.registrations} student(s) registered</p>
      </UsageBlock>
      <p className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        Deletion is restricted while registrations, assignments or marks history exist. Archive the item to withdraw it
        from new curricula while keeping historical records accessible.
      </p>
    </div>
  );
}

function UsageBlock({ icon: Icon, title, count, empty, children }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; count: number; empty: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> {title} <span className="ml-auto font-mono">{count}</span>
      </p>
      {count === 0 ? <p className="text-compact text-muted-foreground">{empty}</p> : (
        <div className="space-y-1">{children}</div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-2xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-full min-w-0" aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
