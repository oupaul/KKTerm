// SF-Symbols-ish line glyphs for the Git Browser, ported from the redesign
// mockup (`git-icons.jsx`). Drawn on a 24×24 grid in currentColor. These match
// the mockup's bespoke look more closely than lucide equivalents.
import type { JSX } from "react";

export type GitIconName =
  | "branch" | "commit" | "merge" | "tag" | "remote" | "stash"
  | "fetch" | "pull" | "push" | "repo" | "search"
  | "chevronR" | "chevronD" | "check" | "copy" | "plus"
  | "more" | "dot" | "pencil" | "history" | "file"
  | "sync" | "worktree" | "trash" | "reset";

const GLYPHS: Record<GitIconName, JSX.Element> = {
  branch: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6.5" cy="5" r="2.3" /><circle cx="6.5" cy="19" r="2.3" /><circle cx="17.5" cy="7.5" r="2.3" />
      <path d="M6.5 7.3v9.4" /><path d="M17.5 9.8c0 4-3 4.7-6.4 5.6-2 .5-3.1 1.2-3.1 2.6" />
    </g>
  ),
  commit: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.4" /><path d="M3 12h5.6M15.4 12H21" />
    </g>
  ),
  merge: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6.5" cy="5" r="2.3" /><circle cx="6.5" cy="19" r="2.3" /><circle cx="17.5" cy="12" r="2.3" />
      <path d="M6.5 7.3v9.4" /><path d="M6.5 11c0-2.4 2.6-3.5 6.5-3.5h2.1" />
    </g>
  ),
  tag: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.6 3.5H5.5A2 2 0 0 0 3.5 5.5v7.1c0 .53.21 1.04.59 1.41l6.9 6.9a2 2 0 0 0 2.82 0l6.6-6.6a2 2 0 0 0 0-2.82l-6.9-6.9a2 2 0 0 0-1.41-.59Z" />
      <circle cx="8.3" cy="8.3" r="1.4" fill="currentColor" stroke="none" />
    </g>
  ),
  remote: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 18.5a4 4 0 0 1-.6-7.96 5 5 0 0 1 9.65-1.3A3.8 3.8 0 0 1 17 18.5H7Z" />
    </g>
  ),
  stash: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 13.5 5 5.6A2 2 0 0 1 6.97 4h10.06A2 2 0 0 1 19 5.6l1.5 7.9" />
      <path d="M3.5 13.5V18a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4.5" />
      <path d="M3.5 13.5h4.2l1.1 2h6.4l1.1-2h4.2" />
    </g>
  ),
  fetch: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5v10.5m0 0 3.4-3.4M12 14l-3.4-3.4" /><path d="M5 18.5h14" />
    </g>
  ),
  pull: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6.5" cy="6" r="2.3" /><path d="M6.5 8.3v7.2" /><path d="M6.5 19.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M17.5 5.5v8m0 0 2.6-2.6M17.5 13.5 14.9 11" />
    </g>
  ),
  push: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6.5" cy="18" r="2.3" /><path d="M6.5 15.7V8.5" /><path d="M6.5 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M17.5 18.5v-8m0 0 2.6 2.6M17.5 10.5 14.9 13" />
    </g>
  ),
  repo: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4.5h11.5a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2V4.5Z" />
      <path d="M5 16.5a2 2 0 0 1 2-2h11.5" /><path d="M9 4.5v8l2-1.4 2 1.4v-8" />
    </g>
  ),
  search: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <circle cx="10.5" cy="10.5" r="6.3" /><path d="M15.2 15.2 20 20" />
    </g>
  ),
  chevronR: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5.5 15.5 12 9 18.5" />
    </g>
  ),
  chevronD: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 9 12 15.5 18.5 9" />
    </g>
  ),
  check: (
    <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5 10 17.5 19 6.5" />
    </g>
  ),
  copy: (
    <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.2" />
      <path d="M5.5 15.5h-.5A1.5 1.5 0 0 1 3.5 14V5A1.5 1.5 0 0 1 5 3.5h9A1.5 1.5 0 0 1 15.5 5v.5" />
    </g>
  ),
  plus: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5.5v13M5.5 12h13" />
    </g>
  ),
  more: (
    <g fill="currentColor">
      <circle cx="5.5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="18.5" cy="12" r="1.7" />
    </g>
  ),
  dot: (
    <g fill="currentColor"><circle cx="12" cy="12" r="4" /></g>
  ),
  pencil: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 5 19 9.5M4 20l1-4 11-11 4 4-11 11-5 1Z" />
    </g>
  ),
  history: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.8 9.5A8.3 8.3 0 1 1 4 14.5" /><path d="M3.5 5v4.5H8" /><path d="M12 8v4.3l3 1.8" />
    </g>
  ),
  file: (
    <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 3.5h7l5 5v12a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" />
      <path d="M13 3.5V8a1 1 0 0 0 1 1h4.5" />
    </g>
  ),
  sync: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 9A7.5 7.5 0 0 1 18 6.5l2 2" /><path d="M20 3.5v5h-5" />
      <path d="M19.5 15A7.5 7.5 0 0 1 6 17.5l-2-2" /><path d="M4 20.5v-5h5" />
    </g>
  ),
  worktree: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="5" r="2.2" /><path d="M6 7.2v3.3a2 2 0 0 0 2 2h9" />
      <circle cx="18.5" cy="12.5" r="2.2" /><circle cx="18.5" cy="19" r="2.2" />
      <path d="M6 10.5v6a2 2 0 0 0 2 2h8.3" />
    </g>
  ),
  trash: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 6.5h15" /><path d="M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5" />
      <path d="M6.5 6.5 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.5" />
      <path d="M10 10v6.5M14 10v6.5" />
    </g>
  ),
  reset: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11a8 8 0 1 1 1.6 5.3" /><path d="M3.5 5.5V11H9" />
    </g>
  ),
};

export function GitIcon({
  name,
  size = 17,
}: {
  name: GitIconName;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {GLYPHS[name] ?? GLYPHS.dot}
    </svg>
  );
}
