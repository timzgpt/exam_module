/**
 * Report content, part 2 (Sections 5-9 + Appendix A).
 */
module.exports = [
  // ------------------------------------------------------------------ 5
  { h1: "5. Page Consolidation Proposals" },
  { p: "Five merge candidates survived the evidence review. The selection criteria were: the pages share one data domain and one primary audience; their union forms a single coherent workflow moment; the merged host does not exceed a comfortable page complexity; and the existing routes can be preserved with the thin-wrapper pattern described in Section 6. Each proposal below states the evidence, the merged shape, and what remains unique to each side. Approvals are requested per proposal, not as a package." },

  { h2: "5.1 Proposal 1: Merge Readiness Check with Marks Deadline Tracker" },
  { p: "Pages: readiness (353 lines) and deadlines (251 lines), both scoped to a report cycle. Evidence: the two pages monitor the identical inputs, namely the marksDeadlines sheets, commentProgress and the approval state. The readiness page's blocking-issues list re-renders the deadlines page's overdue rows; its per-class eligibility table repeats the deadline tracker's per-class progress bars; and its per-class aggregation is the same computation the batch page re-implements as validationFor. The readiness page's Recalculate button is currently a toast-only no-op, so the gate is a view over the same data rather than a separate computation." },
  { p: "Merged shape: one host, Cycle readiness and deadlines, with two tabs. The Deadline tracker tab keeps the class-by-subject sheet table with its status tabs, filters and reminder action. The Readiness gate tab keeps the readiness donut, the blocking-issues list and the per-class eligibility table. The staff workflow becomes one continuous story: track submissions, open the gate, proceed to batch generation. Strength: strong. Routes preserved: /academic/report-cycles/{cycleId}/readiness opens the host on the gate tab; the deadlines route opens it on the tracker tab." },

  { h2: "5.2 Proposal 2: Merge Review and Approval with Release Management" },
  { p: "Pages: review (367 lines) and release (385 lines), both cycle-scoped admin gates. Evidence: the two pages share an identical component signature, four summary stat cards, a per-class table, AlertDialog-confirmed actions and status tabs, built on the same per-class state machine pattern. The release page re-displays the approval column that the review page owns, and the two stages are sequential in the real workflow (a class is approved, then released) by the same audience, the school administrator. Both maintain a history timeline (audit trail and release history respectively)." },
  { p: "Merged shape: one host, Approvals and release, presenting the pipeline Draft, Submitted, Approved, Released with per-class actions, plus two tabs for the detail views: Approvals (with the audit-trail dialog) and Release and holds (with hold reasons and the release timeline). Strength: strong. Routes preserved: the review route opens the approvals tab; the release route opens the release tab." },

  { h2: "5.3 Proposal 3: Merge the Parent Portal Report Cluster" },
  { p: "Pages: portal report-cards (277 lines), portal report-cards/on-hold (263 lines) and portal progress (298 lines). Evidence: this is the highest-duplication cluster in the module. The child-selector bundle (children list, firstName, initialsOf and the ChildChips component) is copy-pasted in all four portal pages, three of which this merge absorbs. The on-hold page is not an independent feature but a state of the report-card flow: the report-card page already renders a hold-warning strip that links to it, so a parent is currently sent to a second page to learn why the first page's document is unavailable. The progress page re-renders subject remarks and target data that the card page and the class results page already compute, via targetFor and subjectRemark." },
  { p: "Merged shape: one parent hub, My children's reports, with the existing child chips and two tabs: Report card and Progress and targets. When the selected child's card is held, the Report card tab renders the hold panel in place, with the reason, the three-step resolution guidance and the bursary contacts, removing a navigation hop in the most sensitive parent journey. Strength: strongest duplication payoff of the five. Routes preserved: /portal/report-cards opens the hub on the card tab; /portal/report-cards/on-hold is kept as a thin route that opens the hub with the hold state forced, so deep links from messages or letters keep working; /portal/progress opens the progress tab." },

  { h2: "5.4 Proposal 4: Merge the Cycle Analytics Cluster" },
  { p: "Pages: dashboard (307 lines), departments (224 lines) and public-summary (236 lines), all cycle-scoped. Evidence: all three pages are views over the same cycleStatsFor statistics object. The departments page's subject-averages bar duplicates the dashboard's chart; the public-summary page re-renders the dashboard's grade-distribution and class-average charts as its preview; and the dashboard, in turn, is the only consumer of the deltaLabel comparison against the previous-term baseline. The departments page has genuinely unique content, the HOD teacher-submission tables, which is the only reason this proposal is rated medium-strong rather than strong." },
  { p: "Merged shape: one host, Cycle analytics, with three tabs: Overview (the executive dashboard), Departments (HOD view), and Public summary (publication toggles with the live preview). Strength: medium-strong, because the audiences differ even though the data is identical. A lighter alternative is approved if preferred: merge only dashboard and public-summary and leave departments standalone, which yields a navigation of seventeen entries instead of sixteen. Routes preserved under either variant." },

  { h2: "5.5 Proposal 5: Merge Class Results with Next-term Targets" },
  { p: "Pages: results (286 lines) and targets (286 lines), both scoped to a class within a cycle. Evidence: both are views over classResults, subjectAveragesFor and the default grading scheme. The targets page duplicates the results page's key performance figures and its lowest-subject detection chain; functionally it is the results matrix plus two editable columns (target average and focus area) and a recommendation generator." },
  { p: "Merged shape: one host, Results and targets, with two tabs: Results analysis (order-of-merit matrix, charts, export) and Next-term targets (editable goal table). Strength: medium. Routes preserved: the results route opens the analysis tab; the targets route opens the targets tab." },

  { h2: "5.6 Pages That Should Not Be Merged" },
  { p: "The frontend-ui-engineering skill's purpose-driven-layout principle cuts both ways: pages whose jobs genuinely differ should stay separate even when they share data. The following were considered and are recommended against merging. Exams, Grading schemes and Report cycles are three distinct configuration domains with different interaction models. Marks entry is a keyboard-driven spreadsheet with cell navigation and dirty-state tracking, the module's most specialised interaction, and it must remain its own page. Comments is a two-pane editor of a different nature from any neighbouring page. The staff report-card preview owns a bespoke A4 print layout; rather than merging it with anything, the plan extracts its card renderer so the parent portal and the staff preview share one ReportCardSheet component, which alone removes the duplicated print plumbing recorded in Table 1. The staff parents-day scheduler and the parent booking page serve opposite sides of the same appointment data with deliberately different interfaces; the plan extracts the shared booking engine (slot helpers, conflict predicate, appointment list) rather than the interface. Class subjects is class-level configuration with a page-local allocation model. Verify is intentionally outside the application shell as a public page and should stay exactly as it is." },

  { h2: "5.7 Effect on Navigation" },
  { p: "Approving all five proposals, including the full analytics merge, reduces the sidebar from twenty-three entries to sixteen while all twenty-three routes remain reachable. The table below shows the resulting structure. The home-page module map and the command palette regenerate automatically because both derive from the single navigation registry." },
  { caption: "Table 2: Navigation before and after full consolidation", table: {
    widths: [22, 20, 18, 40],
    size: 18,
    header: ["Group", "Today", "After", "Change"],
    rows: [
      ["Exams", "2 entries", "2 entries", "No change"],
      ["Report cards", "13 entries", "9 entries", "Readiness and deadlines become one; review and release become one; dashboard, departments and public summary become one"],
      ["Classes", "3 entries", "2 entries", "Results and targets become one; class subjects unchanged"],
      ["Parent portal", "5 entries", "3 entries", "Report card, on-hold and progress become one hub; booking and verify unchanged"],
      ["Total", "23 entries", "16 entries", "All 23 URLs still resolve; 7 entries consolidated into 5 hosts"],
    ],
  }},

  // ------------------------------------------------------------------ 6
  { h1: "6. Route Preservation Strategy" },
  { p: "The original redesign brief makes route preservation a hard requirement: every existing route must keep working, directly by URL and on refresh, with no invented routes and no change of route pattern. The consolidation respects this with a host-plus-thin-wrapper pattern instead of redirects." },
  { p: "Each merged feature becomes a single host component, for example CycleReadinessHost, accepting an initialTab property. The existing page.tsx files remain in place at their existing paths and shrink to thin wrappers of roughly ten to fifteen lines that render the host with the appropriate tab preselected. Nothing moves in the URL space: no redirect, no new segment, no client-side rewrite, so deep links, browser history and refresh behave exactly as today. The current cycle, class and student context continues to come from the URL parameters with the existing DEMO_IDS fallback." },
  { p: "Two secondary behaviours are worth noting. First, the active tab can optionally be reflected in a query parameter (for example ?tab=gate) so that a staff member can bookmark or share not just a page but a view of it; this touches no route definitions. Second, the sidebar will show one entry per host, pointing at the primary route of that host. Breadcrumbs and command-palette entries are recomputed from the navigation registry and therefore update themselves. If a future requirement needs a nav entry per tab, the registry supports it without further refactoring." },

  // ------------------------------------------------------------------ 7
  { h1: "7. Implementation Roadmap and Effort" },
  { p: "The work is staged in three waves so that each step is independently verifiable and reversible. Wave 1 performs only behaviour-preserving extraction, which the code-simplification skill treats as the safest class of refactoring. Waves 2 and 3 perform the approved page consolidations on top of the extracted foundations, which makes each merge mechanically simpler than it would be today." },
  { caption: "Table 3: Implementation waves", table: {
    widths: [12, 44, 44],
    size: 18,
    header: ["Wave", "Content", "Verification gate"],
    rows: [
      ["Wave 1", "Extraction only, no behaviour change: useCycleContext and useClassContext hooks (removes the fourteen-site boilerplate); lib/format.ts (fmtLongDate, fmtStamp, slotStart); lib/csv.ts (one exportCsv); lib/status.ts (one submission classifier); shared child-chips component and useParentChildren for the portal; lib/booking.ts (conflict predicate); named constants for the approver, bursary contacts, baseline average and demo date; removal of dead code listed in Section 4.3", "Build passes; all 23 routes loaded and checked; no console errors; visual spot check of one page per group"],
      ["Wave 2", "The three strongest merges: Proposal 1 (readiness and deadlines), Proposal 2 (review and release), Proposal 3 (parent portal hub)", "Build passes; all 23 routes plus tab deep-links checked; portal flows walked end to end"],
      ["Wave 3", "Proposals 4 and 5; ReportCardSheet extraction shared by staff preview and portal; booking-engine adoption by both parents-day pages", "Build passes; all 23 routes checked; print preview checked on both report-card surfaces"],
    ],
  }},
  { p: "Effort is estimated in working sessions rather than hours: Wave 1 is one session, and Waves 2 and 3 are approximately one session each. The net effect on the codebase is an estimated reduction of 700 to 1,000 lines in the page layer, and a reduction of every pattern in Table 1 from multiple independent copies to one named definition. The demonstration identifiers, the design tokens, the permissions model and the backend-integration plan are untouched throughout." },

  // ------------------------------------------------------------------ 8
  { h1: "8. Risks and Mitigations" },
  { p: "The plan is deliberately conservative, and each risk below has a concrete mitigation that is part of the wave definition rather than an aspiration." },
  { caption: "Table 4: Risks and mitigations", table: {
    widths: [30, 70],
    size: 18,
    header: ["Risk", "Mitigation"],
    rows: [
      ["A regression in one of the 23 routes during consolidation", "Thin wrappers keep every route file in place; each wave ends with the same 23-URL checklist; any failed check blocks the wave"],
      ["Hidden behaviour drift during extraction", "Wave 1 is governed by the preserve-behaviour rule: refactor commits separate from any other change, thresholds and labels byte-identical, tests or build gate after each extraction"],
      ["Demo-identifier coupling breaks when the backend arrives", "demo-config.ts remains the single source; the new hooks resolve identifiers through it, so the backend swap still touches one file"],
      ["Parent confusion when the on-hold page becomes a tab state", "The /portal/report-cards/on-hold route is preserved verbatim and opens the hub with the hold panel forced; existing links and letters keep working"],
      ["Scope creep into feature changes", "This plan contains no feature work; new functionality is explicitly out of scope until the consolidation is verified"],
      ["Analytics merge dilutes an audience-specific view", "Proposal 4 offers a reduced variant (dashboard plus public summary only, departments standalone) if the HOD view is better kept isolated"],
    ],
  }},

  // ------------------------------------------------------------------ 9
  { h1: "9. Decision Requested" },
  { p: "The following decisions are requested. Each is independent; a go-ahead can cover any subset." },
  { numbered: { ref: "decision-list", items: [
    "Approve Wave 1, the shared-logic extraction. Recommended regardless of the merge decisions, because it removes the duplication that backend integration would otherwise multiply. No behaviour changes.",
    "Approve or reject Proposal 1: merge Readiness check and Marks deadline tracker into one host with two tabs.",
    "Approve or reject Proposal 2: merge Review and approval and Release management into one pipeline host.",
    "Approve or reject Proposal 3: merge the parent portal report cards, on-hold and progress pages into one parent hub, with the on-hold route preserved.",
    "Approve or reject Proposal 4: merge the analytics cluster into one host with Overview, Departments and Public summary tabs, or its lighter variant without Departments.",
    "Approve or reject Proposal 5: merge Class results and Next-term targets into one host.",
    "Confirm the navigation consolidation target: sixteen entries with all five proposals, or seventeen with departments kept standalone.",
    "Confirm the Wave 3 extractions: ReportCardSheet shared renderer and the shared booking engine.",
  ]}},
  { p: "On a go-ahead, implementation starts with Wave 1 and each wave closes with the verification gate in Table 3 before the next begins. If any proposal is rejected, the affected pages remain exactly as they are today; the extraction wave still removes their duplicated plumbing, and the sidebar keeps the current twenty-three entries." },

  // ------------------------------------------------------------------ Appendix
  { h1: "Appendix A: Page Inventory" },
  { p: "The inventory lists every page audited, its route as it exists today, its page-layer line count, and its principal data dependencies. Line counts are from the current working tree (4 November 2026)." },
  { caption: "Table 5: The twenty-three pages of the Exams and Report Cards module", table: {
    widths: [6, 21, 35, 8, 30],
    size: 16,
    header: ["#", "Page", "Route", "LOC", "Principal data dependencies"],
    rows: [
      ["1", "Exams", "/academic/exams", "379", "exams, subjectById, teacherById; status tabs; CSV export"],
      ["2", "Grading schemes", "/academic/grading-schemes", "326", "gradingSchemes, gradeFor; band visualiser and simulator"],
      ["3", "Report cycles", "/academic/report-cycles", "401", "cycles, currentCycle, parentsDayEvent; create-cycle dialog"],
      ["4", "Readiness check", "/academic/report-cycles/{cycleId}/readiness", "353", "marksDeadlines, commentProgress, approvalFor, cycleStatsFor"],
      ["5", "Marks deadline tracker", "/academic/report-cycles/{cycleId}/deadlines", "251", "marksDeadlines, classById, subjectById"],
      ["6", "Marks entry", "/academic/report-cycles/{cycleId}/classes/{classId}/marks", "375", "getMarks, studentsInClass, defaultScheme; keyboard grid"],
      ["7", "Comments", "/academic/report-cycles/{cycleId}/classes/{classId}/comments", "321", "commentFor, commentTemplates, studentsInClass"],
      ["8", "Report card preview", "/academic/report-cycles/{cycleId}/students/{studentId}/report-card", "289", "studentResultOf, studentAttendance, commentFor, verificationRecords; print layout"],
      ["9", "Review and approval", "/academic/report-cycles/{cycleId}/review", "367", "approvals, approvalFor; audit-trail state machine"],
      ["10", "Batch generation", "/academic/report-cycles/{cycleId}/batches", "516", "batchRuns, marksDeadlines, commentProgress, approvalFor; wizard"],
      ["11", "Release management", "/academic/report-cycles/{cycleId}/release", "385", "releaseFor, approvalFor; hold reasons and history"],
      ["12", "HOD department summary", "/academic/report-cycles/{cycleId}/departments", "224", "departmentStats, cycleStatsFor; bar chart"],
      ["13", "Management dashboard", "/academic/report-cycles/{cycleId}/dashboard", "307", "cycleStatsFor, marksDeadlines, defaultScheme; four charts"],
      ["14", "Public summary", "/academic/report-cycles/{cycleId}/public-summary", "236", "cycleStatsFor; publication toggles and preview"],
      ["15", "Parents' day schedule (staff)", "/academic/report-cycles/{cycleId}/parents-day", "370", "bookingSlots, parentsDayEvent; conflict-checked booking"],
      ["16", "Class subjects", "/academic/classes/{classId}/subjects", "345", "subjectTeacherOf, teachers, subjects; allocation editor"],
      ["17", "Class results", "/academic/report-cycles/{cycleId}/classes/{classId}/results", "286", "classResults, subjectAveragesFor, defaultScheme; matrix and charts"],
      ["18", "Next-term targets", "/academic/report-cycles/{cycleId}/classes/{classId}/targets", "286", "targetFor, classResults, subjectAveragesFor"],
      ["19", "Report card (parent)", "/portal/report-cards", "277", "studentResultOf, studentAttendance, commentFor, releaseFor; print"],
      ["20", "Card on hold (parent)", "/portal/report-cards/on-hold", "263", "releaseFor; hold reason, resolution steps, bursary contacts"],
      ["21", "Progress and targets (parent)", "/portal/progress", "298", "studentResultOf, targetFor, subjectRemark; previous-term deltas"],
      ["22", "Book parents' day (parent)", "/portal/parents-day", "373", "bookingSlots, parentsDayEvent; slot grid booking"],
      ["23", "Verify a report card (public)", "/verify", "232", "verifyCode, verificationRecords, classResults; standalone layout"],
    ],
  }},
];
