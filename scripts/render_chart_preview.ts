/**
 * Render the performance chart to SVG files for visual comparison with the
 * user's reference image (upload/pasted_image_1793863899054.png).
 */
import { writeFileSync } from "node:fs";
import {
  buildChartSeries,
  generateChartImage,
} from "../src/lib/chart/performance-chart";

// --- Mid-Term primary card, the exact values from the reference image ---
const names = [
  "Arithmetic",
  "English Language Skills",
  "Kiswahili",
  "Reading",
  "Writing",
  "Culture, Arts & Sports",
  "Health & Environment",
];
const achieved = [88, 65, 72, 82, 73, 64, 77];
const avg = [78, 61, 74, 73, 74, 57, 80];
const top = [94, 88, 90, 88, 96, 86, 99];

const rows = names.map((name, i) => ({ name, achieved: achieved[i] }));
const series = buildChartSeries(rows, avg, top, "Arithmetic", "mid-term");
const svgMid = generateChartImage(series, "mid-term");
if (!svgMid) throw new Error("mid-term chart came back null");

// --- Terminal secondary card sanity render (HTML legend variant) ---
const namesT = [
  "Mathematics",
  "English",
  "Kiswahili",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
];
const rowsT = namesT.map((name, i) => ({
  name,
  achieved: [72, 58, 81, 64, 69, 77, 85, 61][i],
}));
const seriesT = buildChartSeries(
  rowsT,
  [65, 52, 74, 60, 63, 70, 78, 55],
  [91, 84, 95, 88, 90, 93, 97, 86],
  "History",
  "terminal",
);
const svgTerm = generateChartImage(seriesT, "terminal");
if (!svgTerm) throw new Error("terminal chart came back null");

const decode = (uri: string) =>
  decodeURIComponent(uri.replace("data:image/svg+xml;charset=utf-8,", ""));
writeFileSync("/tmp/render/chart-mid.svg", decode(svgMid));
writeFileSync("/tmp/render/chart-term.svg", decode(svgTerm));
console.log(
  `mid: ${series.labels.length} subjects strongestIdx=${series.strongestIdx}; term: ${seriesT.labels.length}`,
);
