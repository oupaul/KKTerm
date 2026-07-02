import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const widgetSource = await readFile(
  new URL("../src/modules/dashboard/widgets/builtin/pc-info/PcInfoWidget.tsx", import.meta.url),
  "utf8",
);

test("PC Info summary uses the Graphics tab GPU ordering", () => {
  const summaryStart = widgetSource.indexOf("function SummarySection(");
  const summaryEnd = widgetSource.indexOf("function OsSection(", summaryStart);
  const summarySource = widgetSource.slice(summaryStart, summaryEnd);

  assert.match(summarySource, /const gpu = orderGpus\(snapshot\.graphics\)\[0\];/);
  assert.doesNotMatch(summarySource, /const gpu = snapshot\.graphics\[0\];/);
});
