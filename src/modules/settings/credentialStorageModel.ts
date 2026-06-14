import type { SecretStoreKind } from "../../types";

const SECRET_STORE_KINDS: readonly SecretStoreKind[] = ["os", "file"];

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
