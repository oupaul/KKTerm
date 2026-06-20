# Install Helper Icons in the Connection Picker

## Goal

Make every distinct bundled Install Helper artwork selectable in Workspace Connection Properties. Users must be able to find the artwork by product name, English semantic keywords, and equivalent semantic terms in the active UI language.

## Scope

- Add one picker choice per distinct artwork under `src/assets/installer-icons/` that is used by the Install Helper.
- Keep existing Connection icon choices and persisted references valid.
- Do not show duplicate choices for recipes that share artwork.
- Do not change the picker layout or add visible UI copy.

## Design

Extend the existing `brand:` registry used by Connection icons. Each newly exposed Install Helper artwork receives a stable registry ID, an English product label, product aliases, and semantic English keywords. Existing registry entries remain unchanged when changing them would alter a saved Connection's artwork. If the Install Helper uses different artwork for a related product, expose that artwork under a new stable ID.

The URL resolver maps every new registry ID to its bundled Install Helper asset. `ConnectionIconPicker` already builds choices from the registry, and `ConnectionIcon` already resolves persisted `brand:` references, so no new persistence format or rendering path is required.

The registry is deduplicated by artwork rather than recipe. Shared recipe mappings such as Node bundles, generic package tools, and Codex variants produce one picker choice for each unique asset URL.

## Search Behavior

The picker continues to use `buildIconSearchGroups` and `iconSearchGroupsMatch`.

- Product labels and aliases support direct product-name searches.
- English semantic keywords support searches such as editor, terminal, package, AI, network, media, and utility.
- The localized search dictionary expands local-language terms into those same English semantic keywords.
- Raw English tokens remain in search groups under non-English UI locales, preserving bilingual search.

No locale JSON keys are added because labels are product names and search vocabulary follows the existing non-visible alias-dictionary convention.

## Verification

Focused automated tests will verify:

1. Every distinct Install Helper artwork used by the recipe icon map is represented by exactly one selectable registry entry.
2. Every new stable `brand:` reference resolves to its expected bundled artwork.
3. Representative English and localized semantic searches match Install Helper entries under a non-English locale.
4. Existing brand-reference validation behavior remains intact.

The relevant Connection manual chapter will describe the expanded selectable icon set and bilingual search behavior using existing i18n key references.
