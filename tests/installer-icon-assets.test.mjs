import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

for (const { id, asset } of [
  { id: "ffmpeg", asset: "ffmpeg.svg" },
  { id: "bentopdf", asset: "bentopdf.svg" },
]) {
  test(`${id} uses a bundled Install Helper icon`, async () => {
    const iconsSource = await readFile(
      new URL("../src/modules/installer/icons.ts", import.meta.url),
      "utf8",
    );
    const readmeSource = await readFile(
      new URL("../src/assets/installer-icons/README.md", import.meta.url),
      "utf8",
    );

    await access(new URL(`../src/assets/installer-icons/${asset}`, import.meta.url));
    assert.match(
      iconsSource,
      new RegExp(`import\\s+\\w+\\s+from\\s+"\\.\\./\\.\\./assets/installer-icons/${asset}\\?url"`),
      `${asset} should be fingerprinted through Vite`,
    );
    assert.match(
      iconsSource,
      new RegExp(`^\\s*${id},\\s*$`, "m"),
      `${id} should map directly to its bundled Install Helper icon`,
    );
    assert.match(
      readmeSource,
      new RegExp(`\`${asset}\``),
      `${asset} should have an icon provenance note`,
    );
  });
}
