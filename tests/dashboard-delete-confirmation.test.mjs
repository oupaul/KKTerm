import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Dashboard View deletion is edit-mode only and uses the shared delete confirmation dialog", async () => {
  const page = await readFile(new URL("../src/modules/dashboard/DashboardPage.tsx", import.meta.url), "utf8");

  assert.match(page, /import \{ DeleteConfirmationDialog \} from "\.\.\/\.\.\/app\/DeleteConfirmationDialog";/);
  assert.match(page, /const \[deleteViewTarget, setDeleteViewTarget\]/);
  assert.match(page, /\{editMode && views\.length > 1 && \(/);
  assert.match(page, /setDeleteViewTarget\(v\)/);
  assert.doesNotMatch(page, /onClick=\{\(\) => void removeView\(v\.id\)\}/);
  assert.match(page, /<DeleteConfirmationDialog[\s\S]*message=\{t\("dashboard\.deleteViewBody"/);
  assert.match(page, /onConfirm=\{\(\) => \{[\s\S]*void removeView\(target\.id\);/);
});

test("Dashboard widget deletion uses the shared delete confirmation dialog", async () => {
  // Widget deletion confirmation moved out of WidgetFrame: the frame now raises a
  // delete request that DashboardPage resolves through the shared dialog.
  const page = await readFile(new URL("../src/modules/dashboard/DashboardPage.tsx", import.meta.url), "utf8");
  const frame = await readFile(new URL("../src/modules/dashboard/view/WidgetFrame.tsx", import.meta.url), "utf8");

  assert.match(page, /const \[deleteWidgetTarget, setDeleteWidgetTarget\] = useState/);
  assert.match(page, /onRequestWidgetDelete=\{setDeleteWidgetTarget\}/);
  assert.match(page, /<DeleteConfirmationDialog[\s\S]*message=\{t\("dashboard\.deleteWidgetBody"/);
  assert.match(page, /onConfirm=\{\(\) => \{[\s\S]*void removeInstance\(target\.instanceId\);/);
  // The frame must delegate rather than run its own click-twice confirm timer.
  assert.doesNotMatch(frame, /removeConfirmHint/);
  assert.doesNotMatch(frame, /confirmTimerRef/);
});
