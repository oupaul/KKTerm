# Diff Viewer Activity Rail Stacking Fix

## Problem

The shared advanced diff backdrop (`.git-adv-backdrop`) is portalled to
`document.body`, but its `z-index` is 70 while the Activity Rail uses 120. The
recent increase in the diff panel width from 92vw to 96vw places the panel's
left edge within the rail's 48px column on narrower displays, allowing the rail
to paint over and visually cut off the viewer.

## Design

Treat the File Compare, Folder Compare, and Git advanced diff surfaces as
blocking app-window overlays, consistent with the existing dialog and overlay
architecture. Raise the shared `.git-adv-backdrop` above the Activity Rail
without changing panel dimensions, responsive sizing, or component structure.

Extend the existing dialog portal policy test so `.git-adv-backdrop` is covered
by the invariant that every blocking backdrop has a higher stacking level than
`.activity-rail`. This checks the shared CSS used by all three affected diff
surfaces.

## Success Criteria

- The Activity Rail cannot paint over the shared advanced diff viewer.
- File Compare, Folder Compare, and Git advanced diff retain their existing
  dimensions and behavior.
- The focused dialog portal policy test fails with the current stacking level
  and passes after the CSS correction.
- No unrelated UI, localization, or manual behavior changes are introduced.

