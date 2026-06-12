import assert from "node:assert/strict";
import test from "node:test";
import {
  SPEEDTEST_TARGETS,
  buildSpeedtestDownloadUrl,
  buildSpeedtestLatencyUrl,
} from "../src/modules/dashboard/widgets/builtin/speedtest/speedtestRunner.ts";

test("speedtest targets include regional choices and keep Cloudflare as the default", () => {
  assert.equal(SPEEDTEST_TARGETS[0]?.id, "cloudflare-auto");
  assert.ok(SPEEDTEST_TARGETS.some((target) => target.region === "Asia"));
  assert.ok(SPEEDTEST_TARGETS.some((target) => target.region === "Europe"));
  assert.ok(SPEEDTEST_TARGETS.some((target) => target.region === "North America"));
});

test("speedtest URL builders use the selected target's latency and download endpoints", () => {
  const tokyo = SPEEDTEST_TARGETS.find((target) => target.id === "librespeed-tokyo");
  assert.ok(tokyo);

  const latencyUrl = buildSpeedtestLatencyUrl(tokyo, 2, 12345);
  assert.equal(
    latencyUrl,
    "https://librespeed.a573.net/backend/empty.php?cacheBust=12345-2",
  );

  const downloadUrl = buildSpeedtestDownloadUrl(tokyo, 5_000_000, 67890);
  assert.equal(
    downloadUrl,
    "https://librespeed.a573.net/backend/garbage.php?ckSize=5&cacheBust=67890",
  );
});
