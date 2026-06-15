import { isKnownOsIconId, osIconIdFromRef } from "./osIcons";

// Bundle every OS logo SVG and map canonical id -> built asset URL. Kept apart
// from `osIcons.ts` because `import.meta.glob` is Vite-only and would break the
// pure frontend test runner that imports the registry/detection logic.
const osIconModules = import.meta.glob("../assets/connection-icons/os/*.svg", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

const osIconUrlById = Object.fromEntries(
  Object.entries(osIconModules).map(([path, url]) => {
    const fileName = path.slice(path.lastIndexOf("/") + 1).replace(/\.svg$/, "");
    return [fileName, url];
  }),
);

export function osIconUrlForId(id: string): string | null {
  return isKnownOsIconId(id) ? osIconUrlById[id] ?? null : null;
}

export function osIconRefToUrl(value: string | null | undefined): string | null {
  const id = osIconIdFromRef(value);
  return id ? osIconUrlForId(id) : null;
}
