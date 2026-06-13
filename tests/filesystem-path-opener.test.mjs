import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("local file browser opens filesystem paths through the typed Tauri command", async () => {
  const [tauriSource, rustSource, sftpSource] = await Promise.all([
    readFile(new URL("../src/lib/tauri.ts", import.meta.url), "utf8"),
    readFile(new URL("../src-tauri/src/lib.rs", import.meta.url), "utf8"),
    readFile(
      new URL("../src/modules/workspace/connections/sftp/SftpWorkspace.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.doesNotMatch(
    tauriSource,
    /import \{[^}]*openPath[^}]*\} from "@tauri-apps\/plugin-opener"/,
    "filesystem paths should not use the frontend opener plugin path allowlist",
  );
  assert.match(
    tauriSource,
    /open_filesystem_path: \{[\s\S]*args: \{ path: string \};[\s\S]*result: null;/,
    "the typed command map should expose a backend filesystem-path opener",
  );
  assert.match(
    tauriSource,
    /export async function openFilesystemPath\(path: string\)[\s\S]*await invokeCommand\("open_filesystem_path", \{ path \}\);/,
    "the shared frontend wrapper should call the typed backend command",
  );
  assert.match(
    rustSource,
    /fn open_filesystem_path\(app: tauri::AppHandle, path: String\) -> Result<\(\), String>[\s\S]*canonicalize\(\)[\s\S]*\.open_path\(canonical_path\.to_string_lossy\(\), None::<&str>\)/,
    "the backend opener should canonicalize and open the requested filesystem path",
  );
  assert.match(
    rustSource,
    /open_filesystem_path,/,
    "the backend filesystem-path opener should be registered with Tauri",
  );
  assert.match(
    sftpSource,
    /await openFilesystemPath\(joinLocalPath\(localPath, file\.name\)\)/,
    "double-clicking a local SFTP/File Explorer file should use the shared filesystem opener",
  );
});
