import type { StoredCredentialKind, StoredCredentialSummary } from "../../types";

export type CredentialKindGroup = {
  kind: StoredCredentialKind;
  rows: StoredCredentialSummary[];
};

export function groupCredentialsForSettings(credentials: StoredCredentialSummary[]): {
  storedCredentials: StoredCredentialSummary[];
  widgetCredentials: StoredCredentialSummary[];
} {
  return {
    storedCredentials: credentials.filter((credential) => credential.kind !== "widgetSecret"),
    widgetCredentials: credentials.filter((credential) => credential.kind === "widgetSecret"),
  };
}

export function groupCredentialsByKind(
  credentials: StoredCredentialSummary[],
): CredentialKindGroup[] {
  const groups = new Map<StoredCredentialKind, StoredCredentialSummary[]>();
  for (const credential of credentials) {
    const values = groups.get(credential.kind) ?? [];
    values.push(credential);
    groups.set(credential.kind, values);
  }
  return Array.from(groups.entries()).map(([kind, rows]) => ({ kind, rows }));
}
