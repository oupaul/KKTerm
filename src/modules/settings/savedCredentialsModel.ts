import type {
  ConnectionPasswordCredentialEntry,
  StoredCredentialSummary,
} from "../../types";

/** A stored-credential row that is a legacy per-Connection password secret. */
export function isLegacyConnectionPasswordRow(credential: StoredCredentialSummary): boolean {
  return (
    credential.kind === "connectionPassword" && credential.metadataSource === "connections"
  );
}

/** Case-insensitive search over the fields a user sees in the saved-credential list. */
export function filterSavedCredentials(
  credentials: ConnectionPasswordCredentialEntry[],
  query: string,
): ConnectionPasswordCredentialEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return credentials;
  }
  return credentials.filter((credential) =>
    [credential.label, credential.username, credential.host, credential.connectionType]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(needle)),
  );
}

export function sortSavedCredentials(
  credentials: ConnectionPasswordCredentialEntry[],
): ConnectionPasswordCredentialEntry[] {
  return [...credentials].sort(
    (left, right) =>
      left.label.localeCompare(right.label) ||
      left.username.localeCompare(right.username) ||
      left.createdAt.localeCompare(right.createdAt),
  );
}

/**
 * Merging deletes the source credentials' stored passwords, so whenever any
 * selected credential still has a stored password the kept credential must
 * have one too — otherwise every relinked Connection would be left without a
 * working password.
 */
export function mergeTargetMustHaveSecret(
  selected: ConnectionPasswordCredentialEntry[],
): boolean {
  return selected.some((credential) => credential.secretExists);
}

/** First selected credential that can be kept; prefers one with a stored password. */
export function defaultMergeTargetId(
  selected: ConnectionPasswordCredentialEntry[],
): string {
  return (
    (selected.find((credential) => credential.secretExists) ?? selected[0])?.id ?? ""
  );
}

/** Merge requires at least two credentials of one Connection type. */
export function mergeEligibility(
  selected: ConnectionPasswordCredentialEntry[],
): { ok: boolean; connectionType?: string } {
  if (selected.length < 2) {
    return { ok: false };
  }
  const connectionType = selected[0].connectionType;
  return selected.every((credential) => credential.connectionType === connectionType)
    ? { ok: true, connectionType }
    : { ok: false };
}
