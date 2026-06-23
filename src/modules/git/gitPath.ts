// Split a forward-slash path into a trailing directory + file name for the
// two-tone path rendering used across the Git Browser file lists.
export function splitPath(path: string): { dir: string; name: string } {
  const normalized = path.replace(/\\/g, "/");
  const i = normalized.lastIndexOf("/");
  return i < 0
    ? { dir: "", name: normalized }
    : { dir: normalized.slice(0, i + 1), name: normalized.slice(i + 1) };
}
