import { studentById, getComponents, classSubjectsFor, subjectById, commentFor, isPrimaryClass } from "../src/lib/demo-data";
const st = studentById("p5a-01")!;
console.log("p5a-01:", st.name, "class", st.classId, "primary:", isPrimaryClass(st.classId));
for (const cs of classSubjectsFor(st.classId)) {
  const c = getComponents(st.classId, cs.subjectId)[st.id];
  console.log(subjectById(cs.subjectId)!.name.padEnd(28), "ca:", String(c?.ca).padStart(4), "exam:", String(c?.exam).padStart(4), "caMarks:", cs.caMarks, "examMarks:", cs.examMarks, "enrolled:", c?.enrolled);
}
console.log("comment:", JSON.stringify(commentFor(st.classId, st.id)).slice(0, 400));
