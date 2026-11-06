"use client";

import { Suspense } from "react";
import { useClassContext, useCycleContext } from "@/hooks/use-academic-context";
import { useClassTemplateKind } from "@/hooks/use-class-template";
import { NurseryAssessmentEntry } from "@/components/features/nursery-reports/nursery-assessment-entry";
import { SubjectMarksEntry } from "@/components/features/marks-entry/subject-marks-entry";
import { isNurseryTemplateKind } from "@/lib/report-templates";

/**
 * Marks entry route (knowledge base B1.4). The learner's class selects the
 * entry surface: Early Years classes get the observation/competency
 * assessment editor; every other class gets the subject-by-subject marks
 * workspace — one subject loaded at a time, scoped to the viewer's role.
 */
export default function MarksEntryPage() {
  const { klass: cls } = useClassContext();
  const { cycle } = useCycleContext();
  const templateKind = useClassTemplateKind(cls.id);
  if (isNurseryTemplateKind(templateKind)) {
    return <NurseryAssessmentEntry classId={cls.id} cycle={cycle} />;
  }
  return (
    <Suspense fallback={null}>
      <SubjectMarksEntry cycle={cycle} classId={cls.id} />
    </Suspense>
  );
}
