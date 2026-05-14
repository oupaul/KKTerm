export function shouldRunStartupUpdateCheck({
  autoUpdateChecksEnabled,
  hasCheckedThisLaunch,
  isTauriRuntime,
}: {
  autoUpdateChecksEnabled: boolean;
  hasCheckedThisLaunch: boolean;
  isTauriRuntime: boolean;
}) {
  return isTauriRuntime && autoUpdateChecksEnabled && !hasCheckedThisLaunch;
}

