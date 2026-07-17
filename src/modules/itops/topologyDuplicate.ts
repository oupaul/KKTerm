function duplicateNameBase(name: string): string {
  const trimmed = name.trim();
  const match = /^(.*)#(\d+)$/.exec(trimmed);
  if (!match || !match[1] || Number(match[2]) < 2) {
    return trimmed;
  }
  return match[1];
}

export function nextTopologyDuplicateName(sourceName: string, existingNames: string[]): string {
  const base = duplicateNameBase(sourceName);
  let highest = 1;
  for (const existingName of existingNames) {
    const trimmed = existingName.trim();
    if (trimmed.localeCompare(base, undefined, { sensitivity: "accent" }) === 0) {
      continue;
    }
    const match = /^(.*)#(\d+)$/.exec(trimmed);
    if (
      match &&
      match[1].localeCompare(base, undefined, { sensitivity: "accent" }) === 0
    ) {
      highest = Math.max(highest, Number(match[2]));
    }
  }
  return `${base}#${highest + 1}`;
}
