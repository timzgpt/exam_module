"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useClassTemplateConfig } from "@/hooks/use-class-template";
import { allClasses, classById, teacherById } from "@/lib/demo-data";
import { NURSERY_TEMPLATE_META, assignableKindsFor } from "@/lib/nursery";
import {
  defaultTemplateKindFor,
  isPeriodVaryingKind,
  templateConfigKey,
  templateKindLabel,
} from "@/lib/report-templates";
import { useTemplateStore } from "@/lib/template-store";
import type {
  NurseryPeriod,
  NurseryTemplateConfig,
  ReportTemplateKind,
  SchoolSection,
} from "@/lib/types";
import {
  ArrowDown,
  ArrowUp,
  GraduationCap,
  ListTree,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import Link from "next/link";

/** Small unique id for admin-added areas / benchmarks / signature slots. */
const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`;

const SECTIONS: SchoolSection[] = ["Early Years", "Primary", "Secondary"];

function move<T>(xs: T[], i: number, delta: -1 | 1): T[] {
  const j = i + delta;
  if (j < 0 || j >= xs.length) return xs;
  const copy = [...xs];
  const [item] = copy.splice(i, 1);
  copy.splice(j, 0, item);
  return copy;
}

/**
 * Report templates admin (task §4): assign a report template to a class,
 * choose between the two Baby Class templates, configure learning areas and
 * benchmarks (add / edit / reorder / remove), edit the competency grading
 * scale, the comment captions and the authorizing signature slots.
 *
 * Configuration is stored PER CLASS (persisted), so templates are reusable
 * across academic terms without duplicating the design.
 */
export default function ReportTemplatesPage() {
  const { toast } = useToast();
  const assignments = useTemplateStore((s) => s.assignments);
  const assign = useTemplateStore((s) => s.assign);
  const saveConfig = useTemplateStore((s) => s.saveConfig);
  const resetConfig = useTemplateStore((s) => s.resetConfig);

  const [selectedId, setSelectedId] = useState<string>("cls-baby");
  // KG3 maintains a separate benchmark set per period; this toggle selects
  // which one the editor loads and saves. Ignored for every other template.
  const [period, setPeriod] = useState<NurseryPeriod>("terminal");
  const selected = classById(selectedId)!;
  const resolved = useClassTemplateConfig(selectedId, period);
  const kinds = assignableKindsFor(selectedId);
  const isNursery = kinds.length > 0;
  const periodVarying = isPeriodVaryingKind(resolved.kind);

  // Working copy of the config — only "Save" writes it to the store.
  const [working, setWorking] = useState<NurseryTemplateConfig>(resolved);
  useEffect(() => {
    setWorking(structuredClone(resolved));
  }, [resolved]);

  const setKind = (kind: ReportTemplateKind) => {
    assign(selectedId, kind);
    toast({
      title: "Template assigned",
      description: `${selected.name} now uses ${templateKindLabel(kind)}.`,
    });
  };

  const save = () => {
    const key = templateConfigKey(selectedId, working.kind, period);
    // KG3 edits are per-period and never rewrite the class assignment.
    const assignmentClassId = periodVarying ? undefined : selectedId;
    saveConfig(key, working, assignmentClassId);
    toast({
      title: "Template saved",
      description: periodVarying
        ? `${selected.name}'s ${period === "midterm" ? "Midterm" : "End-of-Term"} benchmarks were updated.`
        : `${selected.name}'s report template was updated. It applies to every academic term.`,
    });
  };

  const reset = () => {
    const key = templateConfigKey(selectedId, working.kind, period);
    resetConfig(key, periodVarying ? undefined : selectedId);
    toast({
      title: "Template reset",
      description: `${selected.name} falls back to its default template configuration.`,
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Report templates"
        description="One reporting system, multiple class-specific templates: assign each class its report card, then configure its learning areas, benchmarks, competency scale and signatures."
      />

      <div className="grid gap-5 lg:grid-cols-12">
        {/* ------- Class list grouped by school section ------- */}
        <SectionCard className="lg:col-span-4">
          <p className="text-compact font-medium text-foreground">Classes</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pick a class to assign or configure its report template.
          </p>
          <div className="mt-3 space-y-4">
            {SECTIONS.map((sec) => (
              <div key={sec}>
                <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {sec}
                </p>
                <div className="mt-1.5 space-y-1">
                  {allClasses
                    .filter((c) => defaultTemplateKindFor(c.id) !== "secondary" || sec === "Secondary")
                    .filter((c) => {
                      const kind = assignments[c.id] ?? defaultTemplateKindFor(c.id);
                      return (
                        (sec === "Early Years" && kind !== "primary" && kind !== "secondary") ||
                        (sec === "Primary" && kind === "primary") ||
                        (sec === "Secondary" && kind === "secondary")
                      );
                    })
                    .map((c) => {
                      const kind = assignments[c.id] ?? defaultTemplateKindFor(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedId(c.id)}
                          className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-compact transition-colors ${
                            c.id === selectedId
                              ? "border-primary/40 bg-secondary"
                              : "border-transparent hover:bg-muted"
                          }`}
                        >
                          <span className="font-medium text-foreground">{c.name}</span>
                          <Badge variant="outline" className="text-2xs">
                            {templateKindLabel(kind)}
                          </Badge>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ------- Editor / info panel ------- */}
        <div className="space-y-4 lg:col-span-8">
          <SectionCard>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-compact font-medium text-foreground">
                  {selected.name} · {selected.level}
                </p>
                <p className="text-xs text-muted-foreground">
                  Class teacher: {teacherById(selected.classTeacherId)?.name ?? "—"}
                </p>
              </div>
              {isNursery ? (
                <div className="flex items-center gap-2">
                  <Label htmlFor="template-kind" className="text-xs text-muted-foreground">
                    Template
                  </Label>
                  <Select
                    value={working.kind}
                    onValueChange={(v) => setKind(v as ReportTemplateKind)}
                  >
                    <SelectTrigger
                      id="template-kind"
                      className="h-8 w-72 text-compact"
                      aria-label="Report template"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {kinds.map((k) => (
                        <SelectItem key={k} value={k}>
                          {NURSERY_TEMPLATE_META[k].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            {isNursery && periodVarying ? (
              <div className="mt-3 rounded-lg border border-border/80 bg-muted/40 p-2.5">
                <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Assessment period
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  KG3 keeps a separate benchmark set for each period. Edit and save them
                  independently.
                </p>
                <div className="mt-2 inline-flex rounded-md border border-border p-0.5">
                  {(["midterm", "terminal"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPeriod(p)}
                      className={`rounded px-3 py-1 text-compact transition-colors ${
                        period === p
                          ? "bg-[#5C0A14] font-medium text-white"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {p === "midterm" ? "Midterm" : "End of Term"}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {isNursery ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {NURSERY_TEMPLATE_META[working.kind].description}
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                {selected.level.startsWith("Form")
                  ? "Secondary classes use the existing NECTA CSEE report card (A–F subject points, best-7 Division). Its grade bands and division scale are configured on the Grading schemes page."
                  : "Primary classes use the existing marks-based report card (A–E bands, no points or division). Its grade bands are configured on the Grading schemes page; KG templates are never reused for primary classes."}
              </p>
            )}
          </SectionCard>

          {isNursery ? (
            <>
              {/* Titles & captions */}
              <SectionCard>
                <p className="flex items-center gap-1.5 text-compact font-medium text-foreground">
                  <Settings2 className="size-4 text-muted-foreground" /> Titles &amp; captions
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="tpl-title" className="text-xs text-muted-foreground">
                      Title band text
                    </Label>
                    <Input
                      id="tpl-title"
                      value={working.title}
                      onChange={(e) => setWorking({ ...working, title: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="tpl-date" className="text-xs text-muted-foreground">
                      Assessment-date caption
                    </Label>
                    <Input
                      id="tpl-date"
                      value={working.assessmentDateLabel}
                      onChange={(e) =>
                        setWorking({ ...working, assessmentDateLabel: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="tpl-ct" className="text-xs text-muted-foreground">
                      Class teacher&apos;s comment caption
                    </Label>
                    <Input
                      id="tpl-ct"
                      value={working.classTeacherCommentLabel}
                      onChange={(e) =>
                        setWorking({ ...working, classTeacherCommentLabel: e.target.value })
                      }
                    />
                  </div>
                  {working.areaRemarkLabel !== null ? (
                    <div className="grid gap-1.5">
                      <Label htmlFor="tpl-remark" className="text-xs text-muted-foreground">
                        Area remark column caption
                      </Label>
                      <Input
                        id="tpl-remark"
                        value={working.areaRemarkLabel}
                        onChange={(e) =>
                          setWorking({ ...working, areaRemarkLabel: e.target.value })
                        }
                      />
                    </div>
                  ) : null}
                  {working.areaCommentLabel !== null ? (
                    <div className="grid gap-1.5">
                      <Label htmlFor="tpl-areac" className="text-xs text-muted-foreground">
                        Area comment caption
                      </Label>
                      <Input
                        id="tpl-areac"
                        value={working.areaCommentLabel}
                        onChange={(e) =>
                          setWorking({ ...working, areaCommentLabel: e.target.value })
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </SectionCard>

              {/* Learning areas & benchmarks */}
              <SectionCard>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-compact font-medium text-foreground">
                    <ListTree className="size-4 text-muted-foreground" /> Learning areas &amp;
                    benchmarks
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() =>
                      setWorking({
                        ...working,
                        areas: [
                          ...working.areas,
                          {
                            id: uid("area"),
                            name: "New learning area",
                            benchmarks: [{ id: uid("bm"), text: "New benchmark" }],
                          },
                        ],
                      })
                    }
                  >
                    <Plus className="size-4" /> Add learning area
                  </Button>
                </div>

                <div className="mt-3 space-y-4">
                  {working.areas.map((area, ai) => (
                    <div key={area.id} className="rounded-lg border border-border/80 p-3">
                      <div className="flex items-center gap-2">
                        <span className="w-4 shrink-0 text-2xs font-semibold text-muted-foreground">
                          {ai + 1}
                        </span>
                        <Input
                          value={area.name}
                          aria-label={`Learning area ${ai + 1} name`}
                          onChange={(e) =>
                            setWorking({
                              ...working,
                              areas: working.areas.map((a, i) =>
                                i === ai ? { ...a, name: e.target.value } : a,
                              ),
                            })
                          }
                        />
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Move area ${ai + 1} up`}
                            disabled={ai === 0}
                            onClick={() =>
                              setWorking({ ...working, areas: move(working.areas, ai, -1) })
                            }
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Move area ${ai + 1} down`}
                            disabled={ai === working.areas.length - 1}
                            onClick={() =>
                              setWorking({ ...working, areas: move(working.areas, ai, 1) })
                            }
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Remove area ${ai + 1}`}
                            onClick={() =>
                              setWorking({
                                ...working,
                                areas: working.areas.filter((_, i) => i !== ai),
                              })
                            }
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 space-y-1.5 pl-6">
                        {area.benchmarks.map((b, bi) => (
                          <div key={b.id} className="flex items-center gap-2">
                            <Input
                              value={b.text}
                              className="h-8 text-compact"
                              aria-label={`Benchmark ${bi + 1} of area ${ai + 1}`}
                              onChange={(e) =>
                                setWorking({
                                  ...working,
                                  areas: working.areas.map((a, i) =>
                                    i === ai
                                      ? {
                                          ...a,
                                          benchmarks: a.benchmarks.map((bb, j) =>
                                            j === bi ? { ...bb, text: e.target.value } : bb,
                                          ),
                                        }
                                      : a,
                                  ),
                                })
                              }
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              aria-label={`Move benchmark ${bi + 1} up`}
                              disabled={bi === 0}
                              onClick={() =>
                                setWorking({
                                  ...working,
                                  areas: working.areas.map((a, i) =>
                                    i === ai
                                      ? { ...a, benchmarks: move(a.benchmarks, bi, -1) }
                                      : a,
                                  ),
                                })
                              }
                            >
                              <ArrowUp className="size-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              aria-label={`Move benchmark ${bi + 1} down`}
                              disabled={bi === area.benchmarks.length - 1}
                              onClick={() =>
                                setWorking({
                                  ...working,
                                  areas: working.areas.map((a, i) =>
                                    i === ai
                                      ? { ...a, benchmarks: move(a.benchmarks, bi, 1) }
                                      : a,
                                  ),
                                })
                              }
                            >
                              <ArrowDown className="size-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              aria-label={`Remove benchmark ${bi + 1}`}
                              onClick={() =>
                                setWorking({
                                  ...working,
                                  areas: working.areas.map((a, i) =>
                                    i === ai
                                      ? { ...a, benchmarks: a.benchmarks.filter((_, j) => j !== bi) }
                                      : a,
                                  ),
                                })
                              }
                            >
                              <Trash2 className="size-3.5 text-destructive" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-1 gap-1.5 text-xs"
                          onClick={() =>
                            setWorking({
                              ...working,
                              areas: working.areas.map((a, i) =>
                                i === ai
                                  ? {
                                      ...a,
                                      benchmarks: [
                                        ...a.benchmarks,
                                        { id: uid("bm"), text: "New benchmark" },
                                      ],
                                    }
                                  : a,
                              ),
                            })
                          }
                        >
                          <Plus className="size-3.5" /> Add benchmark
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Competency scale (KG2 / KG3) */}
              {working.scale ? (
                <SectionCard>
                  <p className="flex items-center gap-1.5 text-compact font-medium text-foreground">
                    <GraduationCap className="size-4 text-muted-foreground" /> Competency grading
                    scale
                  </p>
                  <div className="mt-3 space-y-2">
                    {working.scale.levels.map((level, li) => (
                      <div key={level.code} className="flex flex-wrap items-center gap-2">
                        <Badge className="w-10 justify-center bg-[#5C0A14] text-white">
                          {level.code}
                        </Badge>
                        <Input
                          value={level.label}
                          className="w-44"
                          aria-label={`Label for ${level.code}`}
                          onChange={(e) =>
                            setWorking({
                              ...working,
                              scale: {
                                ...working.scale!,
                                levels: working.scale!.levels.map((l, i) =>
                                  i === li ? { ...l, label: e.target.value } : l,
                                ),
                              },
                            })
                          }
                        />
                        <Input
                          value={level.description}
                          className="min-w-56 flex-1"
                          aria-label={`Description for ${level.code}`}
                          onChange={(e) =>
                            setWorking({
                              ...working,
                              scale: {
                                ...working.scale!,
                                levels: working.scale!.levels.map((l, i) =>
                                  i === li ? { ...l, description: e.target.value } : l,
                                ),
                              },
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-2xs text-muted-foreground">
                    Codes (B/D/C/HC) are the stored values on benchmark grades; labels and
                    descriptions are printed on the cards.
                  </p>
                </SectionCard>
              ) : null}

              {/* Signatures */}
              <SectionCard>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-compact font-medium text-foreground">
                    Authorizing signatures
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() =>
                      setWorking({
                        ...working,
                        signatures: [
                          ...working.signatures,
                          { id: uid("sig"), title: "Title", name: "" },
                        ],
                      })
                    }
                  >
                    <Plus className="size-4" /> Add signature slot
                  </Button>
                </div>
                <div className="mt-3 space-y-2">
                  {working.signatures.map((sig, si) => (
                    <div key={sig.id} className="flex items-center gap-2">
                      <Input
                        value={sig.title}
                        placeholder="Title"
                        aria-label={`Signature ${si + 1} title`}
                        onChange={(e) =>
                          setWorking({
                            ...working,
                            signatures: working.signatures.map((s, i) =>
                              i === si ? { ...s, title: e.target.value } : s,
                            ),
                          })
                        }
                      />
                      <Input
                        value={sig.name}
                        placeholder="Name (optional)"
                        aria-label={`Signature ${si + 1} name`}
                        onChange={(e) =>
                          setWorking({
                            ...working,
                            signatures: working.signatures.map((s, i) =>
                              i === si ? { ...s, name: e.target.value } : s,
                            ),
                          })
                        }
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove signature ${si + 1}`}
                        onClick={() =>
                          setWorking({
                            ...working,
                            signatures: working.signatures.filter((_, i) => i !== si),
                          })
                        }
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Button className="gap-1.5" onClick={save}>
                  <Save className="size-4" /> Save template
                </Button>
                <Button variant="outline" className="gap-1.5" onClick={reset}>
                  <RotateCcw className="size-4" /> Reset to default
                </Button>
                <Button variant="ghost" className="gap-1.5" asChild>
                  <Link href={`/academic/report-cycles/cy1/classes/${selectedId}/marks`}>
                    Enter assessments
                  </Link>
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
