import fs from "node:fs";
import path from "node:path";

const dialogPath = path.join(
  process.cwd(),
  "src",
  "modules",
  "installer",
  "InstallerToolDialog.tsx",
);
const source = fs.readFileSync(dialogPath, "utf8");

const fallbackStart = source.indexOf("if (!hasPlan) {");
const fallbackEnd = source.indexOf("const active = stepper!.activeStepId;", fallbackStart);

if (fallbackStart === -1 || fallbackEnd === -1) {
  throw new Error("Could not locate the legacy stepper fallback block.");
}

const fallback = source.slice(fallbackStart, fallbackEnd);
if (fallback.includes("stepper?.logs[GENERAL_STEP_BUCKET]")) {
  throw new Error(
    "Legacy stepper fallback must not render both inFlight.log and the general stepper log bucket.",
  );
}

const queuedInstallStart = source.indexOf("for (const queuedRecipe of recipes) {");
if (queuedInstallStart === -1) {
  throw new Error("Could not locate the queued install loop.");
}
const queuedInstallBlock = source.slice(
  queuedInstallStart,
  source.indexOf("const prereqs = catalog", queuedInstallStart),
);
if (
  !queuedInstallBlock.includes(
    "openStepperDialog(queuedRecipe.id);\n      beginInFlight(queuedRecipe.id",
  )
) {
  throw new Error(
    "Queued installs must move the dialog to the currently running package before starting it.",
  );
}
if (!queuedInstallBlock.includes('if (terminalEvent.kind !== "completed")')) {
  throw new Error(
    "Queued installs must stop on failed or cancelled terminal events.",
  );
}

const updateAllPath = path.join(
  process.cwd(),
  "src",
  "modules",
  "installer",
  "InstallerPage.tsx",
);
const updateAllSource = fs.readFileSync(updateAllPath, "utf8");
const updateAllStart = updateAllSource.indexOf("async function confirmUpdateAll()");
if (updateAllStart === -1) {
  throw new Error("Could not locate confirmUpdateAll.");
}
const updateAllBlock = updateAllSource.slice(
  updateAllStart,
  updateAllSource.indexOf("return (", updateAllStart),
);
if (
  !updateAllBlock.includes(
    "openStepperDialog(recipe.id);\n      beginInFlight(recipe.id",
  )
) {
  throw new Error(
    "Update all must open the stepper for each package before starting it.",
  );
}
if (!updateAllBlock.includes('if (terminalEvent.kind !== "completed")')) {
  throw new Error(
    "Update all must stop on failed or cancelled terminal events.",
  );
}
