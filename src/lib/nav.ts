import {
  BadgeCheck,
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarPlus,
  CalendarRange,
  ClipboardList,
  FileText,
  GraduationCap,
  IdCard,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  ListChecks,
  MessageSquareText,
  PenLine,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import type { NavItemDef } from "./types";

/**
 * Single source of truth for the module navigation. Href templates may
 * contain {cycleId} / {classId} / {studentId} placeholders that are resolved
 * from the contextual selection store (see lib/store.ts + demo-config.ts).
 */
export const NAV_GROUPS: { label: string; items: NavItemDef[] }[] = [
  {
    label: "Academic management",
    items: [
      {
        key: "academic-dashboard",
        label: "Academic Dashboard",
        group: "Academic management",
        hrefTemplate: "/academic",
        icon: LayoutDashboard,
        description: "Configuration completeness across sections",
      },
      {
        key: "academic-years",
        label: "Academic Years & Terms",
        group: "Academic management",
        hrefTemplate: "/academic/years",
        icon: CalendarRange,
        description: "Academic years and their terms",
      },
      {
        key: "academic-catalogue",
        label: "Subject catalogue",
        group: "Academic management",
        hrefTemplate: "/academic/catalogue",
        icon: BookOpen,
        description: "Central subject & learning area catalogue",
      },
      {
        key: "academic-curricula",
        label: "Curriculum Management",
        group: "Academic management",
        hrefTemplate: "/academic/curricula",
        icon: Layers,
        description: "Section curricula, combinations and modes",
      },
      {
        key: "academic-allocation",
        label: "Class Subject Allocation",
        group: "Academic management",
        hrefTemplate: "/academic/allocation",
        icon: ClipboardList,
        description: "Apply curricula to class streams",
      },
      {
        key: "academic-teachers",
        label: "Teacher Allocation",
        group: "Academic management",
        hrefTemplate: "/academic/teacher-allocation",
        icon: Users,
        description: "Responsible teachers per class subject",
      },
      {
        key: "academic-registrations",
        label: "Student Registration",
        group: "Academic management",
        hrefTemplate: "/academic/registrations",
        icon: ListChecks,
        description: "Student subject registration and coverage",
      },
      {
        key: "academic-assessment",
        label: "Assessment Configuration",
        group: "Academic management",
        hrefTemplate: "/academic/assessment-config",
        icon: SlidersHorizontal,
        description: "Assessment types and weightings per class subject",
      },
    ],
  },
  {
    label: "Exams",
    items: [
      {
        key: "exams",
        label: "Exams",
        group: "Exams",
        hrefTemplate: "/academic/exams",
        icon: ClipboardList,
        description: "Exam administration and scheduling",
      },
      {
        key: "grading-schemes",
        label: "Grading schemes",
        group: "Exams",
        hrefTemplate: "/academic/grading-schemes",
        icon: SlidersHorizontal,
        description: "Grade boundaries and grading rules",
      },
    ],
  },
  {
    label: "Report cards",
    items: [
      {
        key: "report-cycles",
        label: "Report cycles",
        group: "Report cards",
        hrefTemplate: "/academic/report-cycles",
        icon: CalendarRange,
        description: "Academic cycle management",
      },
      {
        key: "readiness-deadlines",
        label: "Readiness & deadlines",
        group: "Report cards",
        // Primary route opens the deadline tracker; the readiness gate keeps
        // its original route as a thin wrapper on the same host.
        hrefTemplate: "/academic/report-cycles/{cycleId}/deadlines",
        matchTemplates: ["/academic/report-cycles/{cycleId}/readiness"],
        icon: ListChecks,
        description: "Mark-sheet tracker and batch readiness gate",
      },
      {
        key: "marks",
        label: "Marks entry",
        group: "Report cards",
        hrefTemplate: "/academic/report-cycles/{cycleId}/classes/{classId}/marks",
        icon: PenLine,
        description: "Spreadsheet-style marks entry",
      },
      {
        key: "comments",
        label: "Comments",
        group: "Report cards",
        hrefTemplate: "/academic/report-cycles/{cycleId}/classes/{classId}/comments",
        icon: MessageSquareText,
        description: "Teacher comments and templates",
      },
      {
        key: "report-templates",
        label: "Report templates",
        group: "Report cards",
        hrefTemplate: "/academic/report-templates",
        icon: LayoutTemplate,
        description: "Class template assignment and benchmark configuration",
      },
      {
        key: "report-card",
        label: "Report card preview",
        group: "Report cards",
        hrefTemplate: "/academic/report-cycles/{cycleId}/students/{studentId}/report-card",
        icon: FileText,
        description: "Printable report card with PDF export",
      },
      {
        key: "approvals-release",
        label: "Approvals & release",
        group: "Report cards",
        // Primary route opens the approvals pipeline; release management keeps
        // its original route as a thin wrapper on the same host.
        hrefTemplate: "/academic/report-cycles/{cycleId}/review",
        matchTemplates: ["/academic/report-cycles/{cycleId}/release"],
        icon: BadgeCheck,
        description: "Approval workflow, publication and holds",
      },
      {
        key: "batches",
        label: "Batch generation",
        group: "Report cards",
        hrefTemplate: "/academic/report-cycles/{cycleId}/batches",
        icon: Layers,
        description: "Guided batch report generation",
      },
      {
        key: "cycle-analytics",
        label: "Cycle analytics",
        group: "Report cards",
        // Primary route opens the executive overview; the HOD department view
        // and the public summary keep their original routes as thin wrappers
        // on the same host.
        hrefTemplate: "/academic/report-cycles/{cycleId}/dashboard",
        matchTemplates: [
          "/academic/report-cycles/{cycleId}/departments",
          "/academic/report-cycles/{cycleId}/public-summary",
        ],
        icon: LayoutDashboard,
        description: "Executive overview, departments and public summary",
      },
      {
        key: "parents-day",
        label: "Parents' day schedule",
        group: "Report cards",
        hrefTemplate: "/academic/report-cycles/{cycleId}/parents-day",
        icon: CalendarCheck,
        description: "Appointments and teacher availability",
      },
    ],
  },
  {
    label: "Classes",
    items: [
      {
        key: "class-subjects",
        label: "Class subjects",
        group: "Classes",
        hrefTemplate: "/academic/classes/{classId}/subjects",
        icon: BookOpen,
        description: "Subject allocation and teachers",
      },
      {
        key: "class-results-targets",
        label: "Results & targets",
        group: "Classes",
        // Primary route opens the results analysis; the next-term targets
        // editor keeps its original route as a thin wrapper on the same host.
        hrefTemplate: "/academic/report-cycles/{cycleId}/classes/{classId}/results",
        matchTemplates: ["/academic/report-cycles/{cycleId}/classes/{classId}/targets"],
        icon: BarChart3,
        description: "Marks analysis and next-term goals per student",
      },
    ],
  },
  {
    label: "Parent portal",
    items: [
      {
        key: "portal-reports",
        label: "Report cards (parent)",
        group: "Parent portal",
        // One parent hub; the on-hold explanation and progress views keep
        // their original routes as thin wrappers on the same host.
        hrefTemplate: "/portal/report-cards",
        matchTemplates: ["/portal/report-cards/on-hold", "/portal/progress"],
        icon: IdCard,
        description: "Card, hold status and progress for your children",
      },
      {
        key: "portal-parents-day",
        label: "Book parents' day (parent)",
        group: "Parent portal",
        hrefTemplate: "/portal/parents-day",
        icon: CalendarPlus,
        description: "Simple appointment booking",
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItemDef[] = NAV_GROUPS.flatMap((g) => g.items);

export function navItemByKey(key: string): NavItemDef | undefined {
  return ALL_NAV_ITEMS.find((i) => i.key === key);
}

/** Convert an href template into a regex, params matching any segment. */
function templateToRegex(template: string): RegExp {
  const source = template
    .split(/(\{cycleId\}|\{classId\}|\{studentId\})/)
    .map((seg) => {
      if (seg === "{cycleId}" || seg === "{classId}" || seg === "{studentId}")
        return "[^/]+";
      return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
  return new RegExp(`^${source}$`);
}

/**
 * Which nav item does this pathname belong to? Uses templates so active
 * highlighting works for any cycle/class/student id in the URL. Longest
 * template wins (e.g. on-hold beats report-cards).
 */
export function matchNavKey(pathname: string): string | undefined {
  let best: { key: string; score: number } | undefined;
  for (const item of ALL_NAV_ITEMS) {
    if (templateToRegex(item.hrefTemplate).test(pathname)) {
      const score = item.hrefTemplate.length;
      if (!best || score > best.score) best = { key: item.key, score };
    }
  }
  return best?.key;
}

/**
 * Resolve the breadcrumb trail for a pathname by matching it against the
 * resolved hrefs of every nav item (longest match first).
 */
export function breadcrumbFor(
  pathname: string,
  resolve: (template: string) => string,
): { label: string; href: string | null }[] {
  const trail: { label: string; href: string | null }[] = [];
  let best: NavItemDef | undefined;
  let bestLen = -1;
  for (const item of ALL_NAV_ITEMS) {
    const href = resolve(item.hrefTemplate);
    if (pathname === href || pathname.startsWith(href + "/")) {
      if (href.length > bestLen) {
        best = item;
        bestLen = href.length;
      }
    }
  }
  if (!best) return trail;
  if (best.hrefTemplate !== "/academic/exams" && best.group !== "") {
    trail.push({ label: groupTitle(best.group), href: null });
  }
  trail.push({ label: best.label, href: resolve(best.hrefTemplate) });
  return trail;
}

function groupTitle(group: string): string {
  if (group === "Academic management") return "Academic management";
  if (group === "Report cards") return "Report cards";
  if (group === "Parent portal") return "Parent portal";
  if (group === "Classes") return "Classes";
  return "Exams";
}
