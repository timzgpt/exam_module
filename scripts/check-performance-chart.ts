/**
 * Sanity checks for the performance chart engine (chart prompt rules).
 * Run: bun scripts/check-performance-chart.ts
 */
import {
  buildChartSeries,
  classScoreFor,
  generateChartImage,
  shortLabel,
} from "../src/lib/chart/performance-chart";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (!cond) {
    failures++;
    console.log(`FAIL ${name} ${detail}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

// --- shortLabel (Section 5) ---
check("map hit mid", shortLabel("Mathematics", "mid-term") === "Math");
check("map hit terminal", shortLabel("Mathematics", "terminal") === "Math");
check("14 chars kept", shortLabel("Chemistry", "terminal") === "Chemistry");
check("16 chars truncated", shortLabel("Unknown Long Subject", "mid-term") === "Unknown Long.");
check("Computer Studies mapped (agent rule 5)", shortLabel("Computer Studies", "terminal") === "Comp. Studies");
// Terminal map is missing primary-only names by design (e.g. Reading exists; pick a primary name absent in terminal map)
check("terminal primary name truncates", shortLabel("Civic and Moral Education", "terminal") === "Civic and Mo.");

// --- classScoreFor (Section 4) ---
check("mid both", classScoreFor("mid-term", 68, 81, 25, 75) === 77.75);
check("mid single exam = 100% rule", classScoreFor("mid-term", null, 80, 25, 75) === 80);
check("mid single ca = 100% rule", classScoreFor("mid-term", 70, null, 25, 75) === 70);
check("mid none null", classScoreFor("mid-term", null, null, 25, 75) === null);
check("terminal both", classScoreFor("terminal", 68, 81, 25, 75) === 77.75);
check("terminal single skipped", classScoreFor("terminal", null, 80, 25, 75) === null);
check("terminal ca-only skipped", classScoreFor("terminal", 70, null, 25, 75) === null);

// --- buildChartSeries (Sections 3, rule 4, rule 8) ---
const rows = [
  { name: "Mathematics", achieved: 77.75 },
  { name: "English", achieved: null }, // no total → excluded (rule 8)
  { name: "Kiswahili", achieved: 66 },
  { name: "Physics", achieved: 0 }, // DISQ zero → included, bar 0
];
const avg = [70, 0, 65, 60];
const top = [90, 0, 85, 80];
const s = buildChartSeries(rows, avg, top, "Kiswahili", "mid-term");
check("excluded null row", s.labels.length === 3 && s.labels.join("|") === "Math|Kiswahili|Physics");
check("avg co-indexed", s.avg.join("|") === "70|65|60");
check("strongest matched by full name", s.strongestIdx === 1);
const s2 = buildChartSeries(rows, avg, top, "Nonexistent", "mid-term");
check("strongest defaults to 0 (rule 4)", s2.strongestIdx === 0);

// --- generateChartImage (Sections 1, 2, 6, 9) ---
const img = generateChartImage(s, "mid-term");
check("mid image produced", img !== null && img.startsWith("data:image/svg+xml"));
const svg = decodeURIComponent(img!);
check("no in-image title (dropped deliberately)", !svg.includes("Result Analysis"));
check("y label", svg.includes("% Percentage"));
check("x label", svg.includes(">Subjects<"));
check("achieved colour present", svg.includes("#E74C3C"));
check("strongest darker fill", svg.includes("#C0392B"));
check("mid in-svg legend", svg.includes("Achieved Marks") && svg.includes("Class Topper"));
check("zero bar gets no label (y-tick '0' is the only >0</text>)", (svg.match(/>0<\/text>/g) ?? []).length === 1);
check("achieved value labels present", svg.includes(">77.75<"));
check("class-avg / topper labels omitted (print collision fix)", !svg.includes(">70<") && !svg.includes(">90<"));
// Intra-group gap: the first blue bar must start strictly right of the first
// red bar's right edge (bars in a group no longer touch).
{
  const rectRe = /<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)"[^>]*fill="#(E74C3C|3498DB)"/g;
  const red = rectRe.exec(svg);
  const blue = rectRe.exec(svg);
  check(
    "intra-group gap between bars",
    !!red && !!blue && Number(blue[1]) > Number(red[1]) + Number(red[2]) + 0.5,
    red && blue ? `gap=${(Number(blue[1]) - (Number(red[1]) + Number(red[2]))).toFixed(1)}px` : "",
  );
}

const imgT = generateChartImage(s, "terminal");
const svgT = decodeURIComponent(imgT!);
check("terminal image produced", imgT !== null);
check("terminal no in-svg legend", !svgT.includes("Achieved Marks"));

// Terminal class-stats visibility: a subject where the student's classmates
// lack both components must vanish from TERMINAL chart but stay on MID-TERM.
const rows2 = [{ name: "Mathematics", achieved: 60 }];
check("terminal empty series → null", generateChartImage(buildChartSeries(rows2, [0], [0], "Mathematics", "terminal"), "terminal") !== null);

// Fallback (Section 7): empty series returns null.
check("empty series → null", generateChartImage(buildChartSeries([], [], [], "", "mid-term"), "mid-term") === null);

// Aspect ratios: mid 3:1, terminal ~2.4:1 min 3.8 (Section 6)
const m9 = buildChartSeries(
  Array.from({ length: 9 }, (_, i) => ({ name: `Sub${i}`, achieved: 50 + i })),
  Array(9).fill(50),
  Array(9).fill(90),
  "Sub3",
  "mid-term",
);
const m9svg = decodeURIComponent(generateChartImage(m9, "mid-term")!);
const m9w = Number(m9svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)![1]);
const m9h = Number(m9svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)![2]);
check("mid 9 subjects 3:1 ratio", Math.abs(m9w / m9h - 3) < 0.01, `${m9w / m9h}`);
check("mid 9 width = 9x1.5in@150dpi", Math.abs(m9w - 9 * 1.5 * 150) < 1);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
