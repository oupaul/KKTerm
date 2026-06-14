import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importTypeScriptModule(path) {
  const source = await readFile(path, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2020,
      target: ts.ScriptTarget.ES2020,
      verbatimModuleSyntax: true,
    },
  });
  const encoded = encodeURIComponent(transpiled.outputText);
  return import(`data:text/javascript;charset=utf-8,${encoded}`);
}

test("startup update check only runs once when enabled in the Tauri runtime", async () => {
  const { shouldRunStartupUpdateCheck, selectInstallerAssets } = await importTypeScriptModule(
    new URL("../src/lib/appUpdatesModel.ts", import.meta.url),
  );

  assert.equal(
    shouldRunStartupUpdateCheck({
      autoUpdateChecksEnabled: true,
      hasCheckedThisLaunch: false,
      isTauriRuntime: true,
    }),
    true,
  );
  assert.equal(
    shouldRunStartupUpdateCheck({
      autoUpdateChecksEnabled: true,
      hasCheckedThisLaunch: true,
      isTauriRuntime: true,
    }),
    false,
  );
  assert.equal(
    shouldRunStartupUpdateCheck({
      autoUpdateChecksEnabled: false,
      hasCheckedThisLaunch: false,
      isTauriRuntime: true,
    }),
    false,
  );
  assert.equal(
    shouldRunStartupUpdateCheck({
      autoUpdateChecksEnabled: true,
      hasCheckedThisLaunch: false,
      isTauriRuntime: false,
    }),
    false,
  );
});

test("installer asset selection requires matching installer and checksum assets", async () => {
  const { selectWindowsInstallerAssets } = await importTypeScriptModule(
    new URL("../src/lib/appUpdatesModel.ts", import.meta.url),
  );

  const assets = [
    {
      name: "kkterm-0.1.54-windows-x64-setup.exe",
      browser_download_url: "https://github.com/ryantsai/KKTerm/releases/download/v0.1.54/kkterm-0.1.54-windows-x64-setup.exe",
    },
    {
      name: "kkterm-0.1.54-windows-x64-setup.exe.sha256",
      browser_download_url: "https://github.com/ryantsai/KKTerm/releases/download/v0.1.54/kkterm-0.1.54-windows-x64-setup.exe.sha256",
    },
    {
      name: "kkterm-0.1.54-windows-arm64-setup.exe",
      browser_download_url: "https://github.com/ryantsai/KKTerm/releases/download/v0.1.54/kkterm-0.1.54-windows-arm64-setup.exe",
    },
  ];

  assert.deepEqual(selectWindowsInstallerAssets(assets, "windows-x64"), {
    assetName: "kkterm-0.1.54-windows-x64-setup.exe",
    downloadUrl: "https://github.com/ryantsai/KKTerm/releases/download/v0.1.54/kkterm-0.1.54-windows-x64-setup.exe",
    checksumUrl: "https://github.com/ryantsai/KKTerm/releases/download/v0.1.54/kkterm-0.1.54-windows-x64-setup.exe.sha256",
  });
  assert.equal(selectWindowsInstallerAssets(assets, "windows-arm64"), null);
});

test("app update install strategy keeps Windows installer flow separate from macOS Tauri updater", async () => {
  const { appUpdateInstallStrategy } = await importTypeScriptModule(
    new URL("../src/lib/appUpdatesModel.ts", import.meta.url),
  );

  assert.equal(appUpdateInstallStrategy("windows"), "windows-installer");
  assert.equal(appUpdateInstallStrategy("macos"), "tauri-updater");
  assert.equal(appUpdateInstallStrategy("linux"), "tauri-updater");
  assert.equal(appUpdateInstallStrategy("unknown"), "download-page");
});

test("app update install command is exposed across the frontend and backend boundary", async () => {
  const [tauriSource, libSource, promptSource, localeSource, releaseDoc, manualSource] =
    await Promise.all([
      readFile(new URL("../src/lib/tauri.ts", import.meta.url), "utf8"),
      readFile(new URL("../src-tauri/src/lib.rs", import.meta.url), "utf8"),
      readFile(new URL("../src/app/AppUpdatePrompt.tsx", import.meta.url), "utf8"),
      readFile(new URL("../src/i18n/locales/en.json", import.meta.url), "utf8"),
      readFile(new URL("../docs/RELEASE.md", import.meta.url), "utf8"),
      readFile(new URL("../docs/manual/15-settings.md", import.meta.url), "utf8"),
    ]);
  const locale = JSON.parse(localeSource);

  assert.match(tauriSource, /download_and_install_app_update/);
  assert.match(libSource, /download_and_install_app_update/);
  assert.match(promptSource, /settings\.updateDownloadAndInstall/);
  assert.equal(locale.settings.updateDownloadAndInstall, "Download and Install");
  assert.match(releaseDoc, /Download and Install/);
  assert.match(manualSource, /settings\.updateDownloadAndInstall/);
});
