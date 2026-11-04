import {
  BadgeCheck,
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarPlus,
  CalendarRange,
  CirclePause,
  ClipboardList,
  FileText,
  Globe,
  IdCard,
  Layers,
  LayoutDashboard,
  ListChecks,
  MessageSquareText,
  PenLine,
  ScanSearch,
  Send,
  SlidersHorizontal,
  Target,
  Timer,
  TrendingUp,
} from "lucide-react";
import type { NavItemDef } from "./types";

/**
 * Single source of truth for the module navigation. Href templates may
 * contain {cycleId} / {classId} / {studentId} placeholders that are resolved
 * from the contextual selection store (see lib/store.ts + demo-config.ts).
 */
export const NAV_GROUPS: { label: string; items: NavItemDef[] }[] = [
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
        key: "readiness",
        label: "Readiness check",
        group: "Report cards",
        hrefTemplate: "/academic/report-cycles/{cycleId}/readiness",
        icon: ListChecks,
        description: "Blocking issues and eligibility",
      },
      {
        key: "deadlines",
        label: "Marks deadline tracker",
        group: "Report cards",
        hrefTemplate: "/academic/report-cycles/{cycleId}/deadlines",
        icon: Timer,
        description: "Teacher submissions and overdue marks",
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
        description: "Teacher remarks and templates",
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
        key: "review",
        label: "Review & approval",
        group: "Report cards",
        hrefTemplate: "/academic/report-cycles/{cycleId}/review",
        icon: BadgeCheck,
        description: "Approval workflow and audit history",
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
        key: "release",
        label: "Release management",
        group: "Report cards",
        hrefTemplate: "/academic/report-cycles/{cycleId}/release",
        icon: Send,
        description: "Publication, holds and history",
      },
      {
        key: "departments",
        label: "HOD department summary",
        group: "Report cards",
        hrefTemplate: "/academic/report-cycles/{cycleId}/departments",
        icon: Building2,
        description: "Departmental performance overview",
      },
      {
        key: "dashboard",
        label: "Management dashboard",
        group: "Report cards",
        hrefTemplate: "/academic/report-cycles/{cycleId}/dashboard",
        icon: LayoutDashboard,
        description: "Executive academic analytics",
      },
      {
        key: "public-summary",
        label: "Public summary",
        group: "Report cards",
        hrefTemplate: "/academic/report-cycles/{cycleId}/public-summary",
        icon: Globe,
        description: "Controlled public academic summary",
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
        key: "class-results",
        label: "Class results",
        group: "Classes",
        hrefTemplate: "/academic/report-cycles/{cycleId}/classes/{classId}/results",
        icon: BarChart3,
        description: "Performance, grades and averages",
      },
      {
        key: "class-targets",
        label: "Next-term targets",
        group: "Classes",
        hrefTemplate: "/academic/report-cycles/{cycleId}/classes/{classId}/targets",
        icon: Target,
        description: "Improvement goals per student",
      },
    ],
  },
  {
    label: "Parent portal",
    items: [
      {
        key: "portal-report-cards",
        label: "Report card (parent view)",
        group: "Parent portal",
        hrefTemplate: "/portal/report-cards",
        icon: IdCard,
        description: "Mobile-friendly report card viewing",
      },
      {
        key: "portal-on-hold",
        label: "Card on hold (parent)",
        group: "Parent portal",
        hrefTemplate: "/portal/report-cards/on-hold",
        icon: CirclePause,
        description: "Why a card is unavailable and next steps",
      },
      {
        key: "portal-progress",
        label: "Progress & targets (parent)",
        group: "Parent portal",
        hrefTemplate: "/portal/progress",
        icon: TrendingUp,
        description: "Progress, goals and recommendations",
      },
      {
        key: "portal-parents-day",
        label: "Book parents' day (parent)",
        group: "Parent portal",
        hrefTemplate: "/portal/parents-day",
        icon: CalendarPlus,
        description: "Simple appointment booking",
      },
      {
        key: "verify",
        label: "Verify a report card (public)",
        group: "Parent portal",
        hrefTemplate: "/verify",
        icon: ScanSearch,
        description: "Secure report verification",
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
  if (group === "Report cards") return "Report cards";
  if (group === "Parent portal") return "Parent portal";
  if (group === "Classes") return "Classes";
  return "Exams";
}
