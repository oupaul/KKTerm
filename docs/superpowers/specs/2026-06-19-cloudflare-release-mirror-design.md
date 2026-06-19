# Cloudflare Release Mirror Design

## Objective

Provide a resilient, app-owned update and download endpoint at
`https://kkterm.ryantsai.com` without replacing GitHub Releases as KKTerm's
canonical release record. Cloudflare must mirror Windows, macOS, and Linux
artifacts even though those platform builds are published at different times.

The implementation succeeds when:

- packaged KKTerm builds can discover updates without consuming GitHub's
  unauthenticated REST API quota;
- every supported release artifact, checksum, and updater signature is mirrored
  to Cloudflare R2 after it appears on the corresponding GitHub Release;
- later macOS and Linux uploads safely enrich the same release without removing
  earlier Windows assets;
- interrupted or missed synchronization can be rerun without corrupting or
  duplicating release state; and
- `kkterm.ryantsai.com` remains available for a future homepage.

## Architecture

Use a dedicated private R2 bucket named `kkterm-releases` and a Worker as the
public front door for `kkterm.ryantsai.com`.

The Worker owns these paths:

- `/releases/latest.json` — current stable release metadata;
- `/releases/v<version>/<asset>` — immutable, versioned release artifacts; and
- all other paths — a small placeholder response initially, with room for a
  future Worker Static Assets homepage.

The R2 bucket is not exposed through `r2.dev` or a direct R2 custom domain. The
Worker reads objects through an R2 binding and streams them without buffering
entire installers in memory. Responses preserve content type, content length,
ETag, conditional requests, byte ranges, and download filenames. Versioned
artifacts receive long-lived immutable cache headers; `latest.json` receives a
short cache lifetime and must be revalidated.

GitHub Releases remains the source of truth for release existence, notes, draft
or prerelease state, and the list of published assets. Cloudflare is the primary
distribution endpoint used by installed applications. GitHub remains the
fallback and operator-facing release page.

## Mirrored Data

Objects use stable keys:

```text
releases/v0.1.93/kkterm-0.1.93-windows-x64-setup.exe
releases/v0.1.93/kkterm-0.1.93-windows-x64-setup.exe.sha256
releases/v0.1.93/kkterm-0.1.93-macos-arm64.dmg
releases/v0.1.93/kkterm-0.1.93-macos-arm64.dmg.sha256
releases/v0.1.93/kkterm-0.1.93-macos-arm64.app.tar.gz
releases/v0.1.93/kkterm-0.1.93-macos-arm64.app.tar.gz.sig
releases/v0.1.93/kkterm-0.1.93-linux-x86_64.AppImage
releases/v0.1.93/kkterm-0.1.93-linux-x86_64.AppImage.sha256
releases/v0.1.93/kkterm-0.1.93-linux-x86_64.AppImage.sig
releases/latest.json
```

The synchronizer mirrors only KKTerm's documented release filename families.
It does not copy release-note scratch files or arbitrary attachments.

`latest.json` is a KKTerm-owned manifest, independent of GitHub's REST response
shape. It contains the stable version, publication time, release notes and page
URL, plus a platform map whose entries name Cloudflare download, checksum, and
signature URLs when those files currently exist. Missing staggered platform
builds are omitted rather than represented as errors.

The manifest is generated from the complete current GitHub Release on every
sync. It is uploaded only after all referenced objects are successfully stored,
so clients never observe metadata pointing at incomplete uploads. A later
macOS or Linux run regenerates the manifest with the newly available platform
entry while preserving existing entries discovered from GitHub.

Draft and prerelease releases are mirrored only when explicitly requested for
operator testing and never replace the stable `latest.json` pointer.

## Synchronization Workflow

Add one GitHub Actions workflow dedicated to release synchronization. It
supports:

- `workflow_call` for the Windows GitHub Actions release workflow;
- `workflow_dispatch` with a release tag for local release scripts;
- `release: published` for releases created outside the Actions release job;
  and
- a daily schedule that reconciles the latest stable release as recovery.

The synchronization job performs these steps:

1. Resolve the requested tag, or the latest stable release for scheduled runs.
2. Read release metadata and assets with `gh` using the workflow token.
3. Reject drafts and prereleases unless the manual invocation explicitly allows
   them.
4. Download only recognized KKTerm assets into the Actions temporary directory.
5. Verify every available `.sha256` file against its matching artifact. A
   checksum mismatch fails the run before Cloudflare metadata changes.
6. Upload each artifact to its versioned R2 key. Repeated runs overwrite only
   the same versioned key and are therefore idempotent.
7. Generate the complete KKTerm manifest from assets proven present in this
   synchronization run.
8. Upload the version-scoped manifest for diagnostics, then upload
   `releases/latest.json` last for stable releases.
9. Probe the public Worker endpoint for the manifest and every referenced asset
   before reporting success.

The Windows release is always first:

- The existing Windows GitHub Actions release workflow invokes the reusable
  synchronization workflow after publication.
- The local Windows release script dispatches synchronization after creating
  the GitHub Release.
- The local macOS and Linux scripts dispatch synchronization after each has
  uploaded all of its assets and patched release metadata.

A failed mirror dispatch does not roll back a valid GitHub Release. The release
script reports the mirror failure and prints the exact manual workflow command
needed to retry. Daily reconciliation provides a second recovery path.

Concurrency is scoped by release tag. Runs for the same tag serialize rather
than cancel one another, preventing a macOS and Linux upload from racing while
they update `latest.json`.

## Application Update Behavior

Windows uses `https://kkterm.ryantsai.com/releases/latest.json` as its primary
update metadata endpoint. It retains the existing GitHub Releases API request
as a fallback for Cloudflare network failures, invalid metadata, or server
errors. A GitHub `403` or `429` must no longer prevent updates because normal
checks do not depend on the GitHub API.

macOS and Linux updater endpoint configuration also prefers the Cloudflare
manifest. Their existing GitHub-hosted `latest.json` endpoint remains a fallback
where supported by the Tauri updater configuration.

Client validation rejects malformed manifests, unsupported URL schemes,
version/tag mismatches, and asset URLs outside the expected HTTPS hosts. Update
installation keeps the existing checksum and Tauri-signature verification
boundaries; changing distribution hosts must not weaken artifact verification.

Startup checks should use the existing last-check timestamp to avoid unnecessary
requests. Manual checks always perform a fresh request. User-visible behavior
continues through the existing Settings update surface and Status Bar notices.

## Cloudflare Configuration and Security

The Worker and R2 bucket live in the authenticated Cloudflare account already
identified through Wrangler. `kkterm.ryantsai.com` is attached as the Worker's
custom domain. The hostname is not assigned directly to R2, preserving routing
control for a future homepage.

GitHub Actions receives narrowly scoped repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`; and
- `CLOUDFLARE_API_TOKEN`, limited to editing the dedicated R2 bucket and the
  release Worker resources required by deployment.

No Cloudflare credential is committed, added to release assets, or shipped in
the application. The Worker does not contain a GitHub token and does not fetch
GitHub dynamically. Only the CD workflow talks to GitHub and writes R2.

The implementation starts on Cloudflare's free plans. The current allowances
cover 10 GB-month of Standard R2 storage, one million monthly Class A
operations, ten million monthly Class B operations, free R2 egress, and 100,000
Worker requests per day. All release objects use Standard storage. Usage alerts
are preferred over automatic deletion; no retention policy is introduced yet.

## Testing and Verification

Automated tests cover:

- manifest generation with Windows-only, Windows-plus-macOS, and complete
  staggered asset sets;
- rejection of malformed names, mismatched versions, drafts, prereleases, and
  checksum failures;
- idempotent regeneration from the same release;
- Windows Cloudflare-primary/GitHub-fallback selection;
- startup check throttling and manual-check bypass; and
- Worker GET, HEAD, conditional request, and byte-range behavior.

The CD workflow includes a dry-run/manual validation path that generates and
checks metadata without uploading. Deployment verification fetches the public
manifest and performs lightweight HEAD or ranged probes rather than downloading
every full installer again.

The operation manual and `docs/RELEASE.md` are updated with the endpoint,
privacy posture, staggered synchronization behavior, required repository
secrets, manual retry command, and recovery procedure. The update check remains
non-telemetry network activity and is described accordingly.

## Rollout and Recovery

Deployment order is:

1. Create the private R2 bucket and deploy the Worker on its generated hostname.
2. Synchronize and verify the latest stable GitHub Release.
3. Attach `kkterm.ryantsai.com` and verify HTTPS, range requests, and metadata.
4. Add CD dispatches to all platform release paths.
5. Change application update endpoints to Cloudflare-primary.

If Cloudflare is unavailable, installed clients fall back to GitHub. If a bad
manifest is published, rerunning synchronization for the same stable tag
reconstructs and atomically replaces it. Existing versioned objects remain
available during recovery. Removing the custom domain or reverting the client
endpoint restores the current GitHub-only behavior without changing release
artifacts.
