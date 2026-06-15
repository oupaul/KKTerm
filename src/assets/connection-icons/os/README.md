# OS / distribution logos

These SVGs back the SSH remote-OS icon auto-detection and the OS section of the
connection icon picker (see `src/lib/osIcons.ts`).

- Source: [Simple Icons](https://github.com/simple-icons/simple-icons), released
  into the public domain under **CC0 1.0** (no attribution or license file
  required to bundle).
- Each file was recolored from the upstream monochrome path to its brand color
  (a few near-black brand colors were lightened so the glyph stays visible on the
  dark UI). The recoloring is applied as a `fill` on the root `<svg>` element.
- `windows.svg` is an app-authored four-tile glyph (Microsoft's logo is not part
  of Simple Icons), drawn as plain geometry in Windows blue.

To add another distribution: drop `<id>.svg` here, then register the `<id>`,
label, and search keywords in `OS_ICON_ENTRIES` (and, if it is detectable, add an
`/etc/os-release` ID mapping in `OS_RELEASE_ID_TO_ICON`) in `src/lib/osIcons.ts`.
The bundled-URL resolution in `src/lib/osIconUrls.ts` picks up new files
automatically via `import.meta.glob`.
