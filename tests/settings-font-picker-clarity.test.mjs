import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const OPEN_CUSTOM_FONTS_FOLDER_MARKER = 'aria-label={t("settings.openCustomFontsFolder")}';
const FONT_PICKER_TUTORIAL_IDS = {
  appearance: 'data-tutorial-id="settings.appUiFontFamily"',
  terminal: 'data-tutorial-id="settings.terminalFontFamily"',
};

async function readSources() {
  const [appearanceSource, terminalSource, localeSource] = await Promise.all([
    readFile(new URL("../src/modules/settings/AppearanceSettings.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/modules/settings/TerminalSettings.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/i18n/locales/en.json", import.meta.url), "utf8"),
  ]);

  return {
    appearanceSource,
    terminalSource,
    locale: JSON.parse(localeSource),
  };
}

function extractLabelScope(source, tutorialId) {
  const start = source.indexOf(tutorialId);
  assert.ok(start >= 0, `expected label with ${tutorialId}`);
  const labelStart = source.lastIndexOf("<label", start);
  assert.ok(labelStart >= 0, `expected enclosing label for ${tutorialId}`);
  const labelEnd = source.indexOf("</label>", start);
  assert.ok(labelEnd > start, `expected closing label for ${tutorialId}`);
  return source.slice(labelStart, labelEnd + "</label>".length);
}

function extractFontPickerSelect(labelScope, tutorialId) {
  const selectStart = labelScope.indexOf("<select");
  assert.ok(selectStart >= 0, `expected select inside ${tutorialId}`);
  const selectEnd = labelScope.indexOf("</select>", selectStart);
  assert.ok(selectEnd > selectStart, `expected closing select inside ${tutorialId}`);
  return labelScope.slice(selectStart, selectEnd + "</select>".length);
}

function extractHintBody(labelScope, tutorialId) {
  const smallStart = labelScope.indexOf('<small className="field-hint">');
  assert.ok(smallStart >= 0, `expected hint small inside ${tutorialId}`);
  const smallEnd = labelScope.indexOf("</small>", smallStart);
  assert.ok(smallEnd > smallStart, `expected closing hint small inside ${tutorialId}`);
  return labelScope.slice(smallStart + '<small className="field-hint">'.length, smallEnd);
}

function extractOpenFontsFolderButton(source, tutorialId) {
  const ariaStart = source.indexOf(OPEN_CUSTOM_FONTS_FOLDER_MARKER);
  assert.ok(ariaStart >= 0, `expected open-folder button marker inside ${tutorialId}`);
  const buttonStart = source.lastIndexOf("<button", ariaStart);
  assert.ok(buttonStart >= 0, `expected button start before aria marker inside ${tutorialId}`);
  const buttonEnd = source.indexOf("</button>", ariaStart);
  assert.ok(buttonEnd > ariaStart, `expected closing button inside ${tutorialId}`);
  return source.slice(buttonStart, buttonEnd + "</button>".length);
}

function assertSelectOptgroups(selectSource, tutorialId) {
  const optgroupLabels = [...selectSource.matchAll(/<optgroup label=\{t\("settings\.([^)"]+)"\)\}>/g)].map((match) =>
    match[1],
  );
  assert.deepEqual(optgroupLabels, ["customFonts", "recommendedFonts", "systemFonts"], `expected optgroups in custom/recommended/system order inside ${tutorialId}`);
}

test("settings font picker locale text is ready for the presentation change", async () => {
  const { locale } = await readSources();

  assert.equal(
    locale.settings.customFontsHint,
    "Press the refresh button to get system fonts. To use custom fonts, put them in the fonts folder.",
  );
  assert.equal(locale.settings.recommendedFonts, "Recommended");
});

test("settings font picker hints are unconditional inside the anchored labels", async () => {
  const { appearanceSource, terminalSource } = await readSources();

  for (const [tutorialId, source] of [
    [FONT_PICKER_TUTORIAL_IDS.appearance, appearanceSource],
    [FONT_PICKER_TUTORIAL_IDS.terminal, terminalSource],
  ]) {
    const labelScope = extractLabelScope(source, tutorialId);
    const hintBody = extractHintBody(labelScope, tutorialId);
    const selectClose = labelScope.indexOf("</select>");
    assert.ok(selectClose >= 0, `expected select close inside ${tutorialId}`);

    assert.equal(hintBody.trim(), '{t("settings.customFontsHint")}');
    assert.doesNotMatch(labelScope.slice(selectClose), /customFonts\.length/);
  }
});

test("settings font picker optgroups are present in the right order", async () => {
  const { appearanceSource, terminalSource } = await readSources();

  for (const [tutorialId, source] of [
    [FONT_PICKER_TUTORIAL_IDS.appearance, appearanceSource],
    [FONT_PICKER_TUTORIAL_IDS.terminal, terminalSource],
  ]) {
    const labelScope = extractLabelScope(source, tutorialId);
    const selectSource = extractFontPickerSelect(labelScope, tutorialId);

    assertSelectOptgroups(selectSource, tutorialId);
  }
});

test("settings font picker buttons are icon-only", async () => {
  const { appearanceSource, terminalSource } = await readSources();

  for (const [tutorialId, source] of [
    [FONT_PICKER_TUTORIAL_IDS.appearance, appearanceSource],
    [FONT_PICKER_TUTORIAL_IDS.terminal, terminalSource],
  ]) {
    const buttonSource = extractOpenFontsFolderButton(source, tutorialId);
    const buttonPattern = new RegExp("^\\s*<button[\\s\\S]*>\\s*<FolderOpen size=\\{15\\} \\/>\\s*<\\/button>\\s*$");

    assert.match(buttonSource, buttonPattern);
  }
});
