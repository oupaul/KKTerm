import type { RuntimePlatform } from "../../lib/platform";
import type { KeychainStatus, SecretStoreKind } from "../../types";

const SECRET_STORE_KINDS: readonly SecretStoreKind[] = ["os", "file"];

type SecretStatusLike = Pick<KeychainStatus, "available" | "selectedStore" | "availableStores">;

export type CredentialStorageSelectionAction = "select" | "setup-file";

export function normalizeSecretStoreKind(value: unknown): SecretStoreKind {
  return SECRET_STORE_KINDS.includes(value as SecretStoreKind)
    ? (value as SecretStoreKind)
    : "os";
}

export function normalizeAvailableSecretStores(
  stores: readonly unknown[] | null | undefined,
  selectedStore: unknown,
): SecretStoreKind[] {
  const normalized = (stores ?? [])
    .map(normalizeSecretStoreKind)
    .filter((store, index, values) => values.indexOf(store) === index);
  const selected = normalizeSecretStoreKind(selectedStore);
  if (!normalized.includes(selected)) {
    normalized.unshift(selected);
  }
  return normalized.length > 0 ? normalized : [selected];
}

export function credentialStorageSelectionAction({
  currentStore,
  nextStore,
  secretStatus,
}: {
  currentStore: SecretStoreKind;
  nextStore: SecretStoreKind;
  secretStatus: SecretStatusLike | null | undefined;
}): CredentialStorageSelectionAction {
  if (nextStore !== "file") {
    return "select";
  }
  if (
    currentStore !== "file" ||
    normalizeSecretStoreKind(secretStatus?.selectedStore) !== "file" ||
    !secretStatus?.available
  ) {
    return "setup-file";
  }
  return "select";
}

export function shouldPromptForEncryptedFileSetup({
  platform,
  selectedStore,
  secretStatus,
}: {
  platform: RuntimePlatform;
  selectedStore: SecretStoreKind;
  secretStatus: SecretStatusLike | null | undefined;
}): boolean {
  return (
    platform === "linux" &&
    selectedStore === "file" &&
    normalizeSecretStoreKind(secretStatus?.selectedStore) === "file" &&
    !secretStatus?.available
  );
}
