import assert from "node:assert/strict";
import test from "node:test";
import { useInstallerStore } from "../src/modules/installer/state";

function resetInstallerStore() {
  useInstallerStore.getState().reset();
}

test("every install starts with the shared three-stage progress template", () => {
  resetInstallerStore();
  useInstallerStore.getState().beginInFlight("future-tool", "install");

  const stepper = useInstallerStore.getState().stepperState["future-tool"];
  assert.equal(stepper.isDefaultPlan, true);
  assert.deepEqual(
    stepper.plan.map((step) => step.labelKey),
    [
      "installer.steps.resolveDependencyPlan",
      "installer.steps.installNamed",
      "installer.steps.verify",
    ],
  );
  assert.equal(stepper.status["prepare"], "running");
  assert.equal(stepper.status["apply"], "pending");
  assert.equal(stepper.status["verify"], "pending");
  assert.equal(stepper.activeStepId, "prepare");
});

test("legacy provider activity advances and completes the default template", () => {
  resetInstallerStore();
  const store = useInstallerStore.getState();
  store.beginInFlight("future-tool", "install");
  store.applyProgress({
    kind: "step",
    toolId: "future-tool",
    message: "Running package installer",
  });
  store.applyProgress({
    kind: "stdout",
    toolId: "future-tool",
    line: "installer output",
  });

  let stepper = useInstallerStore.getState().stepperState["future-tool"];
  assert.equal(stepper.status["prepare"], "done");
  assert.equal(stepper.status["apply"], "running");
  assert.equal(stepper.activeStepId, "apply");
  assert.deepEqual(stepper.logs["apply"], ["installer output"]);

  useInstallerStore.getState().applyProgress({
    kind: "completed",
    toolId: "future-tool",
    installedVersion: "1.0.0",
  });
  stepper = useInstallerStore.getState().stepperState["future-tool"];
  assert.equal(stepper.status["prepare"], "done");
  assert.equal(stepper.status["apply"], "done");
  assert.equal(stepper.status["verify"], "done");
  assert.equal(stepper.activeStepId, null);
});

test("declared provider plans replace the default template", () => {
  resetInstallerStore();
  const store = useInstallerStore.getState();
  store.beginInFlight("special-tool", "install");
  store.applyProgress({
    kind: "plan",
    toolId: "special-tool",
    steps: [
      { id: "download", labelKey: "installer.steps.download" },
      { id: "install", labelKey: "installer.steps.installNamed" },
    ],
  });

  const stepper = useInstallerStore.getState().stepperState["special-tool"];
  assert.equal(stepper.isDefaultPlan, false);
  assert.deepEqual(
    stepper.plan.map((step) => step.id),
    ["download", "install"],
  );
  assert.deepEqual(stepper.status, {
    download: "pending",
    install: "pending",
  });
});

test("uninstall operations use the same staged template with the uninstall action", () => {
  resetInstallerStore();
  useInstallerStore.getState().beginInFlight("future-tool", "uninstall");

  const stepper = useInstallerStore.getState().stepperState["future-tool"];
  assert.equal(stepper.isDefaultPlan, true);
  assert.deepEqual(
    stepper.plan.map((step) => step.labelKey),
    [
      "installer.steps.resolveDependencyPlan",
      "installer.dialog.uninstallingTitle",
      "installer.steps.verify",
    ],
  );
});

test("cancelled default progress marks the active stage as cancelled", () => {
  resetInstallerStore();
  const store = useInstallerStore.getState();
  store.beginInFlight("future-tool", "install");
  store.applyProgress({
    kind: "step",
    toolId: "future-tool",
    message: "Running package installer",
  });
  store.applyProgress({ kind: "cancelled", toolId: "future-tool" });

  const stepper = useInstallerStore.getState().stepperState["future-tool"];
  assert.equal(stepper.status["apply"], "cancelled");
  assert.equal(stepper.status["verify"], "pending");
  assert.equal(stepper.activeStepId, null);
});
