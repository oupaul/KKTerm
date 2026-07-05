import manifest from "../assets/file-icons/material-icon-theme/manifest.json";
import { buildIconSearchGroups, iconSearchGroupsMatch } from "./iconSearchAliases";

export const MATERIAL_ICON_REF_PREFIX = "material:";
export const REICON_ICON_REF_PREFIX = "reicon:";
export const LUCIDE_ICON_REF_PREFIX = "lucide:";
const MATERIAL_ICON_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,95}$/;
const ICON_NAME_PATTERN = /^[A-Z][A-Za-z0-9]{0,63}$/;

type MaterialIconManifest = {
  iconIds: string[];
  iconFiles: Record<string, string>;
  fileExtensions: Record<string, string>;
  fileNames: Record<string, string>;
  folderNames: Record<string, string>;
};

export type MaterialIconSearchItem = {
  id: string;
  fileName: string;
  label: string;
  tags: string[];
  searchText: string;
};

const materialIconManifest = manifest as MaterialIconManifest;

function iconLabel(id: string) {
  return id
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function pushTag(tagsById: Map<string, Set<string>>, iconId: string, tag: string) {
  if (!materialIconManifest.iconFiles[iconId]) {
    return;
  }
  const normalized = tag.trim().toLowerCase();
  if (!normalized) {
    return;
  }
  let tags = tagsById.get(iconId);
  if (!tags) {
    tags = new Set<string>();
    tagsById.set(iconId, tags);
  }
  tags.add(normalized);
}

function createMaterialIconSearchItems() {
  const tagsById = new Map<string, Set<string>>();
  const aliasRecords = [
    materialIconManifest.fileExtensions,
    materialIconManifest.fileNames,
    materialIconManifest.folderNames,
  ];

  for (const record of aliasRecords) {
    for (const [alias, iconId] of Object.entries(record)) {
      pushTag(tagsById, iconId, alias);
    }
  }

  return materialIconManifest.iconIds
    .filter((id) => Boolean(materialIconManifest.iconFiles[id]))
    .map((id): MaterialIconSearchItem => {
      const tags = Array.from(tagsById.get(id) ?? []);
      const label = iconLabel(id);
      const searchText = [id, label, ...id.split(/[_-]+/), ...tags].join(" ").toLowerCase();
      return {
        id,
        fileName: materialIconManifest.iconFiles[id] ?? `${id}.svg`,
        label,
        tags,
        searchText,
      };
    });
}

export const MATERIAL_ICON_SEARCH_ITEMS = createMaterialIconSearchItems();

export function materialIconRefForId(iconId: string) {
  return `${MATERIAL_ICON_REF_PREFIX}${iconId}`;
}

export function materialIconIdFromRef(value: string) {
  if (!value.startsWith(MATERIAL_ICON_REF_PREFIX)) {
    return null;
  }
  const iconId = value.slice(MATERIAL_ICON_REF_PREFIX.length);
  return MATERIAL_ICON_ID_PATTERN.test(iconId) ? iconId : null;
}

export function isMaterialIconRef(value: string | null | undefined) {
  return typeof value === "string" && materialIconIdFromRef(value) !== null;
}

export function reiconIconRefForName(iconName: string) {
  return `${REICON_ICON_REF_PREFIX}${iconName}`;
}

export function reiconIconNameFromRef(value: string | null | undefined) {
  if (typeof value !== "string" || !value.startsWith(REICON_ICON_REF_PREFIX)) {
    return null;
  }
  const iconName = value.slice(REICON_ICON_REF_PREFIX.length);
  return ICON_NAME_PATTERN.test(iconName) ? iconName : null;
}

export function isReiconIconRef(value: string | null | undefined) {
  return typeof value === "string" && reiconIconNameFromRef(value) !== null;
}

export function lucideIconRefForName(iconName: string) {
  return `${LUCIDE_ICON_REF_PREFIX}${iconName}`;
}

export function lucideIconNameFromRef(value: string | null | undefined) {
  if (typeof value !== "string" || !value.startsWith(LUCIDE_ICON_REF_PREFIX)) {
    return null;
  }
  const iconName = value.slice(LUCIDE_ICON_REF_PREFIX.length);
  return ICON_NAME_PATTERN.test(iconName) ? iconName : null;
}

export function materialIconFileNameForId(iconId: string) {
  return materialIconManifest.iconFiles[iconId] ?? null;
}

export function searchMaterialIcons(query: string, limit = 120, language?: string) {
  // Groups are AND-ed; each group holds the typed token plus any English
  // catalog keywords it maps to in the current UI language (OR-ed within a
  // group). With no language (or English) each group is just the raw token.
  const groups = buildIconSearchGroups(query, language);
  const scoreTokens = groups.flat();
  const source = groups.length === 0
    ? MATERIAL_ICON_SEARCH_ITEMS
    : MATERIAL_ICON_SEARCH_ITEMS
        .filter((icon) => iconSearchGroupsMatch(icon.searchText, groups))
        .sort((left, right) => scoreMaterialIcon(right, scoreTokens) - scoreMaterialIcon(left, scoreTokens));

  return source.slice(0, limit);
}

function scoreMaterialIcon(icon: MaterialIconSearchItem, tokens: string[]) {
  let score = 0;
  for (const token of tokens) {
    if (icon.id === token) {
      score += 8;
    } else if (icon.id.includes(token)) {
      score += 4;
    }
    if (icon.label.toLowerCase().includes(token)) {
      score += 3;
    }
    if (icon.tags.some((tag) => tag === token || tag.includes(token))) {
      score += 1;
    }
  }
  return score;
}
