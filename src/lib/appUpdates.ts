import { relaunch } from "@tauri-apps/plugin-process";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import { isTauriRuntime } from "./tauri";

export type AppUpdate = Update;

export type AppUpdateInstallProgress =
  | { phase: "downloading"; downloadedBytes: number; contentLength?: number }
  | { phase: "installing" };

export async function checkForAppUpdate() {
  if (!isTauriRuntime()) {
    return null;
  }

  return check({ timeout: 30_000 });
}

export async function installAppUpdate(
  update: AppUpdate,
  onProgress: (progress: AppUpdateInstallProgress) => void,
) {
  let downloadedBytes = 0;
  let contentLength: number | undefined;

  await update.downloadAndInstall((event: DownloadEvent) => {
    if (event.event === "Started") {
      downloadedBytes = 0;
      contentLength = event.data.contentLength;
      onProgress({ phase: "downloading", downloadedBytes, contentLength });
      return;
    }

    if (event.event === "Progress") {
      downloadedBytes += event.data.chunkLength;
      onProgress({ phase: "downloading", downloadedBytes, contentLength });
      return;
    }

    onProgress({ phase: "installing" });
  });

  await relaunch();
}

