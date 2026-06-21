import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const baseStyles = readFileSync("src/styles/base.css", "utf8");
const connectionStyles = readFileSync("src/modules/workspace/connections/connections.css", "utf8");

const inputButtonRule = baseStyles.match(/\.connection-dialog\s+\.input-with-button\s+\.toolbar-button\s*\{(?<body>[^}]*)\}/s);
assert.ok(inputButtonRule, "connection dialog input action buttons should have a scoped height rule");
assert.match(inputButtonRule.groups.body, /height:\s*32px;/, "input action buttons should match connection dialog input height");

const selectRowRule = connectionStyles.match(/\.connection-option-fields\s*>\s*label:has\(\.option-glyph\)\s*\{(?<body>[^}]*)\}/s);
assert.ok(selectRowRule, "option select rows should define the glyph, label, and control columns");
assert.match(
  selectRowRule.groups.body,
  /grid-template-columns:\s*auto\s+minmax\(0,\s*1fr\)\s+minmax\(120px,\s*168px\);/,
  "option select rows should keep a stable label start"
);

const toggleRowRule = connectionStyles.match(
  /\.connection-specific-options-panel\s+\.connection-session-toggle:has\(\.option-glyph\)\s*\{(?<body>[^}]*)\}/s,
);
assert.ok(toggleRowRule, "two-column option panel toggles should align with option select rows");
assert.match(
  toggleRowRule.groups.body,
  /grid-template-columns:\s*auto\s+minmax\(0,\s*1fr\)\s+minmax\(120px,\s*168px\);/,
  "option panel toggle rows should use the same label start as select rows"
);

const optionToggleSwitchRule = connectionStyles.match(
  /\.connection-option-fields\s*>\s*\.connection-session-toggle:has\(\.option-glyph\)\s*>\s*input\[type="checkbox"\]\s*\{(?<body>[^}]*)\}/s,
);
assert.ok(optionToggleSwitchRule, "option-field toggle switches should have a right-alignment rule");
assert.match(
  optionToggleSwitchRule.groups.body,
  /justify-self:\s*end;/,
  "the psmux toggle switch should sit flush with the right edge of its control column"
);
