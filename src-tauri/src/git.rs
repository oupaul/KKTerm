//! Backend git operations for the Git Browser overlay.
//!
//! KKTerm drives git by shelling out to the user's installed `git` binary with
//! structured (`-z` / `--porcelain` / custom-separator) output rather than
//! linking libgit2. The CLI inherits the user's git config, OS credential
//! manager, and SSH agent, so authenticated `fetch`/`pull`/`push` work without
//! KKTerm reimplementing credential handling.
//!
//! Every function here is a blocking process call: each Tauri command that
//! calls one MUST run it from a background worker (`run_blocking_command` /
//! `spawn_blocking`) per the UI-liveness invariant in `docs/ARCHITECTURE.md`.
//! `git` is in the Install Helper catalog; when it is missing,
//! [`detect_repo`] reports `available: false` so the frontend can show an
//! install gate instead of failing.

use serde::{Deserialize, Serialize};
use std::process::Command;

use crate::installer::proc::no_window;

/// ASCII Unit Separator — field delimiter inside a `git log` record.
const US: char = '\u{1f}';
/// ASCII Record Separator — terminates each `git log` record.
const RS: char = '\u{1e}';

/// Default number of commits loaded for the graph. Deep histories are paged by
/// raising this; the graph stays responsive because lane routing is frontend
/// work over the returned slice.
const DEFAULT_LOG_LIMIT: u32 = 400;

fn git_program() -> &'static str {
    // `git` resolves to git.exe on Windows; the binary is the same name on all
    // supported targets.
    "git"
}

struct GitOutput {
    code: i32,
    stdout: Vec<u8>,
    stderr: String,
}

/// Run `git` once, optionally scoped to `repo` via `-C`, capturing output. The
/// process inherits KKTerm's environment so credential helpers and PATH resolve
/// the same way they would for the user's own shell.
fn run_git(repo: Option<&str>, args: &[&str]) -> Result<GitOutput, String> {
    let mut cmd = Command::new(git_program());
    if let Some(repo) = repo {
        cmd.arg("-C").arg(repo);
    }
    cmd.args(args);
    no_window(&mut cmd);
    let out = cmd
        .output()
        .map_err(|error| format!("failed to run git: {error}"))?;
    Ok(GitOutput {
        code: out.status.code().unwrap_or(-1),
        stdout: out.stdout,
        stderr: String::from_utf8_lossy(&out.stderr).trim().to_string(),
    })
}

/// Run a git command that is expected to succeed, returning stdout as text.
fn git_text(repo: &str, args: &[&str]) -> Result<String, String> {
    let out = run_git(Some(repo), args)?;
    if out.code != 0 {
        return Err(git_error(&out));
    }
    Ok(String::from_utf8_lossy(&out.stdout).into_owned())
}

/// Run a git command for its side effect; surface stderr on failure so the UI
/// can show the real git message.
fn git_run(repo: &str, args: &[&str]) -> Result<String, String> {
    let out = run_git(Some(repo), args)?;
    if out.code != 0 {
        return Err(git_error(&out));
    }
    let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
    Ok(stdout)
}

fn git_error(out: &GitOutput) -> String {
    if !out.stderr.is_empty() {
        out.stderr.clone()
    } else {
        format!("git exited with code {}", out.code)
    }
}

// ── Detection ───────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PathRequest {
    pub path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitDetect {
    /// Whether a `git` binary could be invoked at all.
    pub available: bool,
    /// Absolute repository working-tree root, or `None` when `path` is not in a
    /// repo.
    pub repo_root: Option<String>,
    pub current_branch: Option<String>,
}

pub fn detect_repo(request: PathRequest) -> GitDetect {
    // Availability is independent of the path: `git --version` confirms the
    // binary resolves on PATH before we probe the directory.
    let available = run_git(None, &["--version"]).is_ok();
    if !available {
        return GitDetect {
            available: false,
            repo_root: None,
            current_branch: None,
        };
    }
    let repo_root = run_git(Some(&request.path), &["rev-parse", "--show-toplevel"])
        .ok()
        .filter(|out| out.code == 0)
        .map(|out| String::from_utf8_lossy(&out.stdout).trim().to_string())
        .filter(|root| !root.is_empty());
    let current_branch = repo_root.as_ref().and_then(|root| {
        run_git(Some(root), &["rev-parse", "--abbrev-ref", "HEAD"])
            .ok()
            .filter(|out| out.code == 0)
            .map(|out| String::from_utf8_lossy(&out.stdout).trim().to_string())
            .filter(|branch| !branch.is_empty())
    });
    GitDetect {
        available: true,
        repo_root,
        current_branch,
    }
}

// ── Commit log / graph ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitRef {
    /// `head` (current branch), `branch` (other local), `remote`, or `tag`.
    #[serde(rename = "type")]
    pub ref_type: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitCommit {
    pub id: String,
    pub short_id: String,
    pub parents: Vec<String>,
    pub author_name: String,
    pub author_email: String,
    pub subject: String,
    pub body: String,
    /// ISO-8601 committer date for exact display.
    pub iso_date: String,
    /// Relative committer date (e.g. "2 hours ago") for the row.
    pub when: String,
    pub refs: Vec<GitRef>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogRequest {
    pub repo_root: String,
    #[serde(default)]
    pub limit: Option<u32>,
    /// Include commits reachable from all refs, not just HEAD.
    #[serde(default = "default_true")]
    pub all_refs: bool,
}

fn default_true() -> bool {
    true
}

pub fn log_graph(request: LogRequest) -> Result<Vec<GitCommit>, String> {
    let limit = request.limit.unwrap_or(DEFAULT_LOG_LIMIT).to_string();
    // Custom separators keep multi-line commit bodies parseable without -z:
    // fields joined by US (\x1f), records terminated by RS (\x1e).
    let format = format!(
        "--pretty=tformat:%H{US}%P{US}%an{US}%ae{US}%cI{US}%cr{US}%D{US}%s{US}%b{RS}"
    );
    let mut args = vec!["log", "--no-color", "-n", limit.as_str(), format.as_str()];
    if request.all_refs {
        args.push("--all");
    }
    let stdout = git_text(&request.repo_root, &args)?;
    Ok(parse_log(&stdout))
}

fn parse_log(stdout: &str) -> Vec<GitCommit> {
    stdout
        .split(RS)
        .map(|record| record.trim_matches(['\n', '\r']))
        .filter(|record| !record.is_empty())
        .filter_map(parse_commit_record)
        .collect()
}

fn parse_commit_record(record: &str) -> Option<GitCommit> {
    let mut fields = record.split(US);
    let id = fields.next()?.trim().to_string();
    if id.is_empty() {
        return None;
    }
    let parents_raw = fields.next().unwrap_or("");
    let author_name = fields.next().unwrap_or("").to_string();
    let author_email = fields.next().unwrap_or("").to_string();
    let iso_date = fields.next().unwrap_or("").to_string();
    let when = fields.next().unwrap_or("").to_string();
    let decorations = fields.next().unwrap_or("");
    let subject = fields.next().unwrap_or("").to_string();
    let body = fields.next().unwrap_or("").trim_end().to_string();

    let parents = parents_raw
        .split_whitespace()
        .map(|s| s.to_string())
        .collect();
    let short_id = id.chars().take(7).collect();
    Some(GitCommit {
        short_id,
        refs: parse_decorations(decorations),
        id,
        parents,
        author_name,
        author_email,
        iso_date,
        when,
        subject,
        body,
    })
}

/// Parse the `%D` decoration string (e.g. `HEAD -> main, origin/main, tag: v1`)
/// into typed refs. The branch that HEAD points at becomes the `head` ref so it
/// can take the lane accent color in the graph.
fn parse_decorations(decorations: &str) -> Vec<GitRef> {
    let mut refs = Vec::new();
    for token in decorations.split(',') {
        let token = token.trim();
        if token.is_empty() {
            continue;
        }
        if let Some(branch) = token.strip_prefix("HEAD -> ") {
            refs.push(GitRef {
                ref_type: "head".to_string(),
                name: branch.trim().to_string(),
            });
        } else if token == "HEAD" {
            refs.push(GitRef {
                ref_type: "head".to_string(),
                name: "HEAD".to_string(),
            });
        } else if let Some(tag) = token.strip_prefix("tag: ") {
            refs.push(GitRef {
                ref_type: "tag".to_string(),
                name: tag.trim().to_string(),
            });
        } else if token.contains('/') {
            refs.push(GitRef {
                ref_type: "remote".to_string(),
                name: token.to_string(),
            });
        } else {
            refs.push(GitRef {
                ref_type: "branch".to_string(),
                name: token.to_string(),
            });
        }
    }
    refs
}

// ── Repository overview (sidebar) ───────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoRequest {
    pub repo_root: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitBranch {
    pub name: String,
    pub current: bool,
    pub ahead: i64,
    pub behind: i64,
    pub upstream: Option<String>,
    pub lane: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitRemote {
    pub name: String,
    pub branches: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStash {
    pub index: u32,
    pub name: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitWorktree {
    /// Absolute path to the worktree's working directory.
    pub path: String,
    /// Checked-out branch (short name), or `None` for a detached HEAD.
    pub branch: Option<String>,
    /// Commit the worktree's HEAD points at.
    pub head: Option<String>,
    /// True for the worktree that owns `repo_root` in this overview.
    pub is_current: bool,
    /// True when the worktree is locked (`git worktree lock`).
    pub locked: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitOverview {
    pub current_branch: Option<String>,
    /// Repository default branch (short name), e.g. `main`. Used to pin it to the
    /// top of the sidebar branch list.
    pub default_branch: Option<String>,
    pub local_branches: Vec<GitBranch>,
    pub remotes: Vec<GitRemote>,
    pub tags: Vec<String>,
    pub stashes: Vec<GitStash>,
    pub worktrees: Vec<GitWorktree>,
}

pub fn repo_overview(request: RepoRequest) -> Result<GitOverview, String> {
    let repo = request.repo_root.as_str();
    let current_branch = run_git(Some(repo), &["rev-parse", "--abbrev-ref", "HEAD"])
        .ok()
        .filter(|out| out.code == 0)
        .map(|out| String::from_utf8_lossy(&out.stdout).trim().to_string())
        .filter(|branch| !branch.is_empty() && branch != "HEAD");

    let mut local_branches = parse_local_branches(repo)?;
    let default_branch = detect_default_branch(repo, &local_branches);
    sort_branches_default_first(&mut local_branches, default_branch.as_deref());
    let remotes = parse_remotes(repo)?;
    let tags = parse_tags(repo)?;
    let stashes = parse_stashes(repo)?;
    let worktrees = parse_worktrees(repo, repo);

    Ok(GitOverview {
        current_branch,
        default_branch,
        local_branches,
        remotes,
        tags,
        stashes,
        worktrees,
    })
}

/// Resolve the repository's default branch. Prefer the remote's symbolic HEAD
/// (`origin/HEAD -> origin/<branch>`); fall back to a local `main` then `master`
/// when there is no remote HEAD. Returns the short branch name.
fn detect_default_branch(repo: &str, local: &[GitBranch]) -> Option<String> {
    if let Ok(out) = run_git(
        Some(repo),
        &["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"],
    ) {
        if out.code == 0 {
            let full = String::from_utf8_lossy(&out.stdout).trim().to_string();
            // `origin/main` -> `main`
            let short = full.rsplit('/').next().unwrap_or(&full).to_string();
            if local.iter().any(|b| b.name == short) {
                return Some(short);
            }
        }
    }
    for candidate in ["main", "master"] {
        if local.iter().any(|b| b.name == candidate) {
            return Some(candidate.to_string());
        }
    }
    None
}

/// Reorder `branches` so the default branch is first, preserving the relative
/// order of the rest. No-op when there is no default or it is already first.
fn sort_branches_default_first(branches: &mut Vec<GitBranch>, default_branch: Option<&str>) {
    let Some(default) = default_branch else {
        return;
    };
    if let Some(index) = branches.iter().position(|b| b.name == default) {
        let branch = branches.remove(index);
        branches.insert(0, branch);
    }
}

fn parse_local_branches(repo: &str) -> Result<Vec<GitBranch>, String> {
    // `%(field)` placeholders give a stable, parseable record per branch.
    let format =
        "%(refname:short)\u{1f}%(HEAD)\u{1f}%(upstream:short)\u{1f}%(upstream:track)";
    let stdout = git_text(
        repo,
        &["for-each-ref", "--format", format, "refs/heads"],
    )?;
    let mut branches = Vec::new();
    for (lane, line) in stdout.lines().enumerate() {
        let mut fields = line.split('\u{1f}');
        let name = fields.next().unwrap_or("").trim().to_string();
        if name.is_empty() {
            continue;
        }
        let current = fields.next().unwrap_or("").trim() == "*";
        let upstream = fields
            .next()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        let track = fields.next().unwrap_or("");
        let (ahead, behind) = parse_track(track);
        branches.push(GitBranch {
            name,
            current,
            ahead,
            behind,
            upstream,
            lane: lane as u32,
        });
    }
    Ok(branches)
}

/// Parse `%(upstream:track)` like `[ahead 3, behind 1]` into counts.
fn parse_track(track: &str) -> (i64, i64) {
    let mut ahead = 0;
    let mut behind = 0;
    let inner = track.trim().trim_start_matches('[').trim_end_matches(']');
    for part in inner.split(',') {
        let part = part.trim();
        if let Some(n) = part.strip_prefix("ahead ") {
            ahead = n.trim().parse().unwrap_or(0);
        } else if let Some(n) = part.strip_prefix("behind ") {
            behind = n.trim().parse().unwrap_or(0);
        }
    }
    (ahead, behind)
}

fn parse_remotes(repo: &str) -> Result<Vec<GitRemote>, String> {
    let names = git_text(repo, &["remote"])?;
    let mut remotes = Vec::new();
    for name in names.lines().map(str::trim).filter(|n| !n.is_empty()) {
        let prefix = format!("refs/remotes/{name}/");
        // `lstrip=3` drops the `refs/remotes/<remote>` prefix, leaving the bare
        // branch name (including any nested path). The remote's symbolic HEAD
        // (`refs/remotes/<remote>/HEAD`) becomes the literal `HEAD`, which
        // `parse_remote_branches` filters out — using `%(refname:short)` instead
        // would shorten it to the bare remote name and surface a phantom branch.
        let stdout = git_text(
            repo,
            &["for-each-ref", "--format", "%(refname:lstrip=3)", prefix.as_str()],
        )
        .unwrap_or_default();
        let branches = parse_remote_branches(&stdout);
        remotes.push(GitRemote {
            name: name.to_string(),
            branches,
        });
    }
    Ok(remotes)
}

/// Turn `for-each-ref --format %(refname:lstrip=3)` output for one remote into
/// branch names, dropping blanks and the remote's symbolic `HEAD` pointer.
fn parse_remote_branches(stdout: &str) -> Vec<String> {
    stdout
        .lines()
        .map(str::trim)
        .filter(|b| !b.is_empty() && *b != "HEAD")
        .map(|b| b.to_string())
        .collect()
}

fn parse_tags(repo: &str) -> Result<Vec<String>, String> {
    let stdout = git_text(repo, &["tag", "--sort=-creatordate"])?;
    Ok(stdout
        .lines()
        .map(str::trim)
        .filter(|t| !t.is_empty())
        .map(|t| t.to_string())
        .collect())
}

fn parse_stashes(repo: &str) -> Result<Vec<GitStash>, String> {
    // `stash list` is empty (exit 0) when there is no stash.
    let stdout = git_text(repo, &["stash", "list", "--format=%gd\u{1f}%s"])?;
    let mut stashes = Vec::new();
    for (index, line) in stdout.lines().filter(|l| !l.trim().is_empty()).enumerate() {
        let mut fields = line.split('\u{1f}');
        let name = fields.next().unwrap_or("").trim().to_string();
        let message = fields.next().unwrap_or("").trim().to_string();
        stashes.push(GitStash {
            index: index as u32,
            name,
            message,
        });
    }
    Ok(stashes)
}

/// List linked worktrees via `git worktree list --porcelain`. Returns an empty
/// list (not an error) when the command fails so a worktree probe never blocks
/// the rest of the overview.
fn parse_worktrees(repo: &str, current_root: &str) -> Vec<GitWorktree> {
    let stdout = git_text(repo, &["worktree", "list", "--porcelain"]).unwrap_or_default();
    parse_worktree_porcelain(&stdout, current_root)
}

/// Parse the blank-line-delimited `worktree list --porcelain` records.
fn parse_worktree_porcelain(stdout: &str, current_root: &str) -> Vec<GitWorktree> {
    let current = normalize_path(current_root);
    let mut worktrees = Vec::new();
    for record in stdout.split("\n\n") {
        let mut path: Option<String> = None;
        let mut head: Option<String> = None;
        let mut branch: Option<String> = None;
        let mut locked = false;
        for line in record.lines().map(str::trim).filter(|l| !l.is_empty()) {
            if let Some(rest) = line.strip_prefix("worktree ") {
                path = Some(rest.trim().to_string());
            } else if let Some(rest) = line.strip_prefix("HEAD ") {
                head = Some(rest.trim().to_string());
            } else if let Some(rest) = line.strip_prefix("branch ") {
                // `branch refs/heads/main` -> `main`
                branch = Some(
                    rest.trim()
                        .strip_prefix("refs/heads/")
                        .unwrap_or(rest.trim())
                        .to_string(),
                );
            } else if line == "locked" || line.starts_with("locked ") {
                locked = true;
            }
        }
        if let Some(path) = path {
            let is_current = normalize_path(&path) == current;
            worktrees.push(GitWorktree {
                path,
                branch,
                head,
                is_current,
                locked,
            });
        }
    }
    worktrees
}

/// Normalize a path for equality comparison: unify separators and drop a single
/// trailing slash. Case is preserved (git paths are already canonical).
fn normalize_path(path: &str) -> String {
    let unified = path.replace('\\', "/");
    unified.trim_end_matches('/').to_string()
}

// ── Changed files for a commit ──────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitChangedFile {
    /// Single-letter status: M, A, D, R, C, T, U, or ? (untracked).
    pub status: String,
    pub path: String,
    pub old_path: Option<String>,
    /// Lines added; -1 for binary files.
    pub add: i64,
    /// Lines deleted; -1 for binary files.
    pub del: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitFilesRequest {
    pub repo_root: String,
    pub sha: String,
}

pub fn commit_files(request: CommitFilesRequest) -> Result<Vec<GitChangedFile>, String> {
    let repo = request.repo_root.as_str();
    // `--root` lets the very first commit (no parent) still list its files.
    let name_status = git_text(
        repo,
        &[
            "show",
            "--root",
            "--no-color",
            "--pretty=format:",
            "--name-status",
            &request.sha,
        ],
    )?;
    let numstat = git_text(
        repo,
        &[
            "show",
            "--root",
            "--no-color",
            "--pretty=format:",
            "--numstat",
            &request.sha,
        ],
    )?;
    Ok(merge_changed_files(&name_status, &numstat))
}

fn merge_changed_files(name_status: &str, numstat: &str) -> Vec<GitChangedFile> {
    // numstat: "<add>\t<del>\t<path>" (binary uses "-"); rename paths look like
    // "old => new" or ".../{old => new}/..." which we normalize for the churn key.
    let mut churn: std::collections::HashMap<String, (i64, i64)> = std::collections::HashMap::new();
    for line in numstat.lines().filter(|l| !l.trim().is_empty()) {
        let mut parts = line.splitn(3, '\t');
        let add = parse_count(parts.next().unwrap_or(""));
        let del = parse_count(parts.next().unwrap_or(""));
        let path = normalize_rename_path(parts.next().unwrap_or("").trim());
        churn.insert(path, (add, del));
    }

    let mut files = Vec::new();
    for line in name_status.lines().filter(|l| !l.trim().is_empty()) {
        let mut parts = line.split('\t');
        let status_raw = parts.next().unwrap_or("").trim();
        let status = status_raw.chars().next().unwrap_or('M').to_string();
        let (path, old_path) = if status.starts_with('R') || status.starts_with('C') {
            let old = parts.next().unwrap_or("").trim().to_string();
            let new = parts.next().unwrap_or("").trim().to_string();
            (new, Some(old))
        } else {
            (parts.next().unwrap_or("").trim().to_string(), None)
        };
        if path.is_empty() {
            continue;
        }
        let (add, del) = churn.get(&path).copied().unwrap_or((0, 0));
        files.push(GitChangedFile {
            status,
            path,
            old_path,
            add,
            del,
        });
    }
    files
}

fn parse_count(raw: &str) -> i64 {
    let raw = raw.trim();
    if raw == "-" {
        -1
    } else {
        raw.parse().unwrap_or(0)
    }
}

/// Reduce a numstat rename path (`a/{b => c}/d` or `old => new`) to the new path
/// so it keys against name-status output.
fn normalize_rename_path(path: &str) -> String {
    if let (Some(open), Some(close)) = (path.find('{'), path.find('}')) {
        if let Some(arrow) = path[open..close].find(" => ") {
            let prefix = &path[..open];
            let new_seg = &path[open + arrow + 4..close];
            let suffix = &path[close + 1..];
            return format!("{prefix}{new_seg}{suffix}").replace("//", "/");
        }
    }
    if let Some(arrow) = path.find(" => ") {
        return path[arrow + 4..].to_string();
    }
    path.to_string()
}

// ── Diffs ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitDiffLine {
    /// `hunk`, `ctx`, `add`, or `del`.
    pub t: String,
    /// Old-file line number (ctx/del).
    pub o: Option<u32>,
    /// New-file line number (ctx/add).
    pub n: Option<u32>,
    pub c: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffCommitRequest {
    pub repo_root: String,
    pub sha: String,
    pub path: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffWorktreeRequest {
    pub repo_root: String,
    pub path: String,
    /// Diff the staged (index) version instead of the working-tree version.
    #[serde(default)]
    pub staged: bool,
    /// File is untracked: diff it against an empty blob so new content shows.
    #[serde(default)]
    pub untracked: bool,
}

pub fn diff_commit(request: DiffCommitRequest) -> Result<Vec<GitDiffLine>, String> {
    let repo = request.repo_root.as_str();
    let stdout = git_text(
        repo,
        &[
            "show",
            "--root",
            "--no-color",
            "--format=",
            &request.sha,
            "--",
            &request.path,
        ],
    )?;
    Ok(parse_unified_diff(&stdout))
}

pub fn diff_worktree(request: DiffWorktreeRequest) -> Result<Vec<GitDiffLine>, String> {
    let repo = request.repo_root.as_str();
    if request.untracked && !request.staged {
        // Untracked files are not in any tree; `--no-index` against the null
        // device renders the whole file as additions. It exits 1 when the files
        // differ, which is expected here, so do not treat that as an error.
        let out = run_git(
            Some(repo),
            &["diff", "--no-color", "--no-index", "--", "/dev/null", &request.path],
        )?;
        return Ok(parse_unified_diff(&String::from_utf8_lossy(&out.stdout)));
    }
    let mut args = vec!["diff", "--no-color"];
    if request.staged {
        args.push("--cached");
    }
    args.push("--");
    args.push(&request.path);
    let stdout = git_text(repo, &args)?;
    Ok(parse_unified_diff(&stdout))
}

/// Parse a unified diff into renderer line records. Header noise before the
/// first `@@` hunk is skipped; line numbers track old/new sides.
fn parse_unified_diff(diff: &str) -> Vec<GitDiffLine> {
    let mut lines = Vec::new();
    let mut old_ln = 0u32;
    let mut new_ln = 0u32;
    let mut in_hunk = false;
    for raw in diff.lines() {
        if raw.starts_with("@@") {
            if let Some((o, n)) = parse_hunk_header(raw) {
                old_ln = o;
                new_ln = n;
            }
            in_hunk = true;
            lines.push(GitDiffLine {
                t: "hunk".to_string(),
                o: None,
                n: None,
                c: raw.to_string(),
            });
            continue;
        }
        if !in_hunk {
            continue;
        }
        if let Some(rest) = raw.strip_prefix('+') {
            lines.push(GitDiffLine {
                t: "add".to_string(),
                o: None,
                n: Some(new_ln),
                c: rest.to_string(),
            });
            new_ln += 1;
        } else if let Some(rest) = raw.strip_prefix('-') {
            lines.push(GitDiffLine {
                t: "del".to_string(),
                o: Some(old_ln),
                n: None,
                c: rest.to_string(),
            });
            old_ln += 1;
        } else if let Some(rest) = raw.strip_prefix(' ') {
            lines.push(GitDiffLine {
                t: "ctx".to_string(),
                o: Some(old_ln),
                n: Some(new_ln),
                c: rest.to_string(),
            });
            old_ln += 1;
            new_ln += 1;
        }
        // "\ No newline at end of file" and other markers are ignored.
    }
    lines
}

fn parse_hunk_header(header: &str) -> Option<(u32, u32)> {
    // @@ -<old>[,<n>] +<new>[,<n>] @@ ...
    let body = header.trim_start_matches('@').trim();
    let mut parts = body.split_whitespace();
    let old = parts.next()?.trim_start_matches('-');
    let new = parts.next()?.trim_start_matches('+');
    let old_start = old.split(',').next()?.parse().ok()?;
    let new_start = new.split(',').next()?.parse().ok()?;
    Some((old_start, new_start))
}

// ── Working-tree status ─────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub staged: Vec<GitChangedFile>,
    pub unstaged: Vec<GitChangedFile>,
}

pub fn status(request: RepoRequest) -> Result<GitStatus, String> {
    let repo = request.repo_root.as_str();
    let stdout = git_text(
        repo,
        &[
            "status",
            "--porcelain=v2",
            "-z",
            "--untracked-files=all",
            "--no-renames",
        ],
    )?;
    let staged_churn = numstat_map(repo, true);
    let unstaged_churn = numstat_map(repo, false);
    Ok(parse_status(&stdout, &staged_churn, &unstaged_churn))
}

fn numstat_map(repo: &str, staged: bool) -> std::collections::HashMap<String, (i64, i64)> {
    let mut args = vec!["diff", "--numstat", "--no-color"];
    if staged {
        args.push("--cached");
    }
    let stdout = git_text(repo, &args).unwrap_or_default();
    let mut map = std::collections::HashMap::new();
    for line in stdout.lines().filter(|l| !l.trim().is_empty()) {
        let mut parts = line.splitn(3, '\t');
        let add = parse_count(parts.next().unwrap_or(""));
        let del = parse_count(parts.next().unwrap_or(""));
        let path = normalize_rename_path(parts.next().unwrap_or("").trim());
        map.insert(path, (add, del));
    }
    map
}

fn parse_status(
    stdout: &str,
    staged_churn: &std::collections::HashMap<String, (i64, i64)>,
    unstaged_churn: &std::collections::HashMap<String, (i64, i64)>,
) -> GitStatus {
    let mut staged = Vec::new();
    let mut unstaged = Vec::new();
    // porcelain=v2 -z: records are NUL-separated. `--no-renames` keeps every
    // ordinary entry to a single path token, so a simple split is unambiguous.
    for entry in stdout.split('\0').filter(|e| !e.is_empty()) {
        let mut tokens = entry.splitn(9, ' ');
        let kind = tokens.next().unwrap_or("");
        match kind {
            "1" => {
                let xy = tokens.next().unwrap_or("..");
                // Remaining metadata fields (sub, modes, hashes) are skipped;
                // the path is the 8th field after the kind.
                let path = entry.splitn(9, ' ').nth(8).unwrap_or("").to_string();
                let mut chars = xy.chars();
                let x = chars.next().unwrap_or('.');
                let y = chars.next().unwrap_or('.');
                if x != '.' {
                    let (add, del) = staged_churn.get(&path).copied().unwrap_or((0, 0));
                    staged.push(GitChangedFile {
                        status: x.to_string(),
                        path: path.clone(),
                        old_path: None,
                        add,
                        del,
                    });
                }
                if y != '.' {
                    let (add, del) = unstaged_churn.get(&path).copied().unwrap_or((0, 0));
                    unstaged.push(GitChangedFile {
                        status: y.to_string(),
                        path,
                        old_path: None,
                        add,
                        del,
                    });
                }
            }
            "?" => {
                let path = entry[1..].trim().to_string();
                unstaged.push(GitChangedFile {
                    status: "?".to_string(),
                    path,
                    old_path: None,
                    add: 0,
                    del: 0,
                });
            }
            _ => {}
        }
    }
    GitStatus { staged, unstaged }
}

// ── Mutating operations ─────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PathsRequest {
    pub repo_root: String,
    pub paths: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitRequest {
    pub repo_root: String,
    pub message: String,
    #[serde(default)]
    pub amend: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefRequest {
    pub repo_root: String,
    pub reference: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBranchRequest {
    pub repo_root: String,
    pub name: String,
    #[serde(default)]
    pub start_point: Option<String>,
    #[serde(default)]
    pub checkout: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteBranchRequest {
    pub repo_root: String,
    pub name: String,
    #[serde(default)]
    pub force: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameBranchRequest {
    pub repo_root: String,
    pub name: String,
    pub new_name: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscardRequest {
    pub repo_root: String,
    pub paths: Vec<String>,
    /// Paths that are untracked (`?`): removed with `git clean` instead of
    /// restored, since there is no tracked version to restore to.
    #[serde(default)]
    pub untracked: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResetRequest {
    pub repo_root: String,
    pub sha: String,
    /// `soft`, `mixed`, or `hard`. Defaults to `mixed` (git's own default).
    #[serde(default)]
    pub mode: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorktreeAddRequest {
    pub repo_root: String,
    pub path: String,
    /// Optional ref to check out in the new worktree (branch, tag, or commit).
    #[serde(default)]
    pub reference: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorktreeRemoveRequest {
    pub repo_root: String,
    pub path: String,
    #[serde(default)]
    pub force: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTagRequest {
    pub repo_root: String,
    pub name: String,
    #[serde(default)]
    pub sha: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShaRequest {
    pub repo_root: String,
    pub sha: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StashPushRequest {
    pub repo_root: String,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub include_untracked: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StashIndexRequest {
    pub repo_root: String,
    #[serde(default)]
    pub index: u32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchRequest {
    pub repo_root: String,
    #[serde(default)]
    pub remote: Option<String>,
    #[serde(default)]
    pub prune: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PullRequest {
    pub repo_root: String,
    #[serde(default)]
    pub remote: Option<String>,
    #[serde(default)]
    pub branch: Option<String>,
    /// Pull with `--rebase` for a linear history (used by the Sync action).
    #[serde(default)]
    pub rebase: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PushRequest {
    pub repo_root: String,
    #[serde(default)]
    pub remote: Option<String>,
    #[serde(default)]
    pub branch: Option<String>,
    #[serde(default)]
    pub force: bool,
    #[serde(default)]
    pub set_upstream: bool,
}

pub fn stage(request: PathsRequest) -> Result<String, String> {
    let mut args = vec!["add", "--"];
    let paths: Vec<&str> = request.paths.iter().map(String::as_str).collect();
    args.extend(paths);
    git_run(&request.repo_root, &args)
}

pub fn unstage(request: PathsRequest) -> Result<String, String> {
    let mut args = vec!["restore", "--staged", "--"];
    let paths: Vec<&str> = request.paths.iter().map(String::as_str).collect();
    args.extend(paths);
    git_run(&request.repo_root, &args)
}

pub fn stage_all(request: RepoRequest) -> Result<String, String> {
    git_run(&request.repo_root, &["add", "-A"])
}

pub fn unstage_all(request: RepoRequest) -> Result<String, String> {
    git_run(&request.repo_root, &["reset", "-q", "HEAD", "--"])
}

pub fn commit(request: CommitRequest) -> Result<String, String> {
    let mut args = vec!["commit", "-m", request.message.as_str()];
    if request.amend {
        args.push("--amend");
    }
    git_run(&request.repo_root, &args)
}

pub fn checkout(request: RefRequest) -> Result<String, String> {
    git_run(&request.repo_root, &["checkout", &request.reference])
}

pub fn create_branch(request: CreateBranchRequest) -> Result<String, String> {
    if request.checkout {
        let mut args = vec!["checkout", "-b", request.name.as_str()];
        if let Some(start) = request.start_point.as_deref() {
            args.push(start);
        }
        git_run(&request.repo_root, &args)
    } else {
        let mut args = vec!["branch", request.name.as_str()];
        if let Some(start) = request.start_point.as_deref() {
            args.push(start);
        }
        git_run(&request.repo_root, &args)
    }
}

pub fn delete_branch(request: DeleteBranchRequest) -> Result<String, String> {
    let flag = if request.force { "-D" } else { "-d" };
    git_run(&request.repo_root, &["branch", flag, &request.name])
}

pub fn rename_branch(request: RenameBranchRequest) -> Result<String, String> {
    git_run(
        &request.repo_root,
        &["branch", "-m", &request.name, &request.new_name],
    )
}

pub fn create_tag(request: CreateTagRequest) -> Result<String, String> {
    let mut args = vec!["tag"];
    if let Some(message) = request.message.as_deref() {
        args.push("-a");
        args.push("-m");
        args.push(message);
    }
    args.push(request.name.as_str());
    if let Some(sha) = request.sha.as_deref() {
        args.push(sha);
    }
    git_run(&request.repo_root, &args)
}

pub fn merge(request: RefRequest) -> Result<String, String> {
    git_run(&request.repo_root, &["merge", &request.reference])
}

pub fn cherry_pick(request: ShaRequest) -> Result<String, String> {
    git_run(&request.repo_root, &["cherry-pick", &request.sha])
}

pub fn revert(request: ShaRequest) -> Result<String, String> {
    git_run(&request.repo_root, &["revert", "--no-edit", &request.sha])
}

pub fn stash_push(request: StashPushRequest) -> Result<String, String> {
    let mut args = vec!["stash", "push"];
    if request.include_untracked {
        args.push("--include-untracked");
    }
    if let Some(message) = request.message.as_deref() {
        args.push("-m");
        args.push(message);
    }
    git_run(&request.repo_root, &args)
}

pub fn stash_pop(request: StashIndexRequest) -> Result<String, String> {
    let stash_ref = format!("stash@{{{}}}", request.index);
    git_run(&request.repo_root, &["stash", "pop", stash_ref.as_str()])
}

pub fn stash_apply(request: StashIndexRequest) -> Result<String, String> {
    let stash_ref = format!("stash@{{{}}}", request.index);
    git_run(&request.repo_root, &["stash", "apply", stash_ref.as_str()])
}

pub fn stash_drop(request: StashIndexRequest) -> Result<String, String> {
    let stash_ref = format!("stash@{{{}}}", request.index);
    git_run(&request.repo_root, &["stash", "drop", stash_ref.as_str()])
}

pub fn fetch(request: FetchRequest) -> Result<String, String> {
    let mut args = vec!["fetch"];
    if request.prune {
        args.push("--prune");
    }
    match request.remote.as_deref() {
        Some(remote) => args.push(remote),
        None => args.push("--all"),
    }
    git_run(&request.repo_root, &args)
}

pub fn pull(request: PullRequest) -> Result<String, String> {
    let mut args = vec!["pull"];
    if request.rebase {
        args.push("--rebase");
    }
    if let Some(remote) = request.remote.as_deref() {
        args.push(remote);
        if let Some(branch) = request.branch.as_deref() {
            args.push(branch);
        }
    }
    git_run(&request.repo_root, &args)
}

pub fn push(request: PushRequest) -> Result<String, String> {
    let mut args = vec!["push"];
    if request.force {
        args.push("--force-with-lease");
    }
    if request.set_upstream {
        args.push("--set-upstream");
    }
    if let Some(remote) = request.remote.as_deref() {
        args.push(remote);
        if let Some(branch) = request.branch.as_deref() {
            args.push(branch);
        }
    }
    git_run(&request.repo_root, &args)
}

/// Discard working-tree changes. Tracked paths are restored to HEAD; untracked
/// paths are deleted with `git clean -f`. Both run when each list is non-empty.
pub fn discard(request: DiscardRequest) -> Result<String, String> {
    if !request.paths.is_empty() {
        let mut args = vec!["restore", "--worktree", "--"];
        let paths: Vec<&str> = request.paths.iter().map(String::as_str).collect();
        args.extend(paths);
        git_run(&request.repo_root, &args)?;
    }
    if !request.untracked.is_empty() {
        let mut args = vec!["clean", "-f", "--"];
        let paths: Vec<&str> = request.untracked.iter().map(String::as_str).collect();
        args.extend(paths);
        git_run(&request.repo_root, &args)?;
    }
    Ok(String::new())
}

pub fn reset(request: ResetRequest) -> Result<String, String> {
    let mode = match request.mode.as_deref() {
        Some("soft") => "--soft",
        Some("hard") => "--hard",
        // git's own default is mixed; treat anything else as mixed too.
        _ => "--mixed",
    };
    git_run(&request.repo_root, &["reset", mode, &request.sha])
}

pub fn worktree_list(request: RepoRequest) -> Result<Vec<GitWorktree>, String> {
    let repo = request.repo_root.as_str();
    let stdout = git_text(repo, &["worktree", "list", "--porcelain"])?;
    Ok(parse_worktree_porcelain(&stdout, repo))
}

pub fn worktree_add(request: WorktreeAddRequest) -> Result<String, String> {
    let mut args = vec!["worktree", "add", request.path.as_str()];
    if let Some(reference) = request.reference.as_deref() {
        args.push(reference);
    }
    git_run(&request.repo_root, &args)
}

pub fn worktree_remove(request: WorktreeRemoveRequest) -> Result<String, String> {
    let mut args = vec!["worktree", "remove"];
    if request.force {
        args.push("--force");
    }
    args.push(request.path.as_str());
    git_run(&request.repo_root, &args)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_log_records() {
        let record = format!(
            "abc123{US}p1 p2{US}Ryan Tsai{US}ryan@kkterm.dev{US}2026-06-22T14:08:00+08:00{US}2 minutes ago{US}HEAD -> feature/git, origin/feature/git, tag: v1{US}Curve bezier connectors{US}Body line one\nBody line two{RS}"
        );
        let commits = parse_log(&record);
        assert_eq!(commits.len(), 1);
        let c = &commits[0];
        assert_eq!(c.id, "abc123");
        assert_eq!(c.short_id, "abc123");
        assert_eq!(c.parents, vec!["p1", "p2"]);
        assert_eq!(c.author_name, "Ryan Tsai");
        assert_eq!(c.when, "2 minutes ago");
        assert_eq!(c.subject, "Curve bezier connectors");
        assert!(c.body.contains("Body line two"));
        assert_eq!(c.refs.len(), 3);
        assert_eq!(c.refs[0].ref_type, "head");
        assert_eq!(c.refs[0].name, "feature/git");
        assert_eq!(c.refs[1].ref_type, "remote");
        assert_eq!(c.refs[2].ref_type, "tag");
        assert_eq!(c.refs[2].name, "v1");
    }

    #[test]
    fn parses_track_counts() {
        assert_eq!(parse_track("[ahead 3]"), (3, 0));
        assert_eq!(parse_track("[behind 2]"), (0, 2));
        assert_eq!(parse_track("[ahead 3, behind 1]"), (3, 1));
        assert_eq!(parse_track(""), (0, 0));
    }

    #[test]
    fn remote_branches_skip_symbolic_head() {
        // `%(refname:lstrip=3)` yields bare branch names plus the literal HEAD
        // for the remote's symbolic pointer, which must not become a branch.
        let stdout = "HEAD\nmain\nfeature/login\nclaude/fix-x\n";
        assert_eq!(
            parse_remote_branches(stdout),
            vec!["main", "feature/login", "claude/fix-x"],
        );
    }

    #[test]
    fn merges_name_status_with_numstat() {
        let name_status = "M\tsrc/app.rs\nA\tsrc/new.rs\nR100\tsrc/old.rs\tsrc/renamed.rs";
        let numstat = "10\t2\tsrc/app.rs\n5\t0\tsrc/new.rs\n0\t0\tsrc/{old.rs => renamed.rs}";
        let files = merge_changed_files(name_status, numstat);
        assert_eq!(files.len(), 3);
        assert_eq!(files[0].status, "M");
        assert_eq!(files[0].add, 10);
        assert_eq!(files[0].del, 2);
        assert_eq!(files[1].status, "A");
        assert_eq!(files[2].status, "R");
        assert_eq!(files[2].path, "src/renamed.rs");
        assert_eq!(files[2].old_path.as_deref(), Some("src/old.rs"));
    }

    #[test]
    fn parses_worktree_porcelain() {
        let stdout = "worktree /repo/main\nHEAD aaaa1111\nbranch refs/heads/main\n\nworktree /repo/feature\nHEAD bbbb2222\nbranch refs/heads/feature/login\nlocked\n\nworktree /repo/detached\nHEAD cccc3333\ndetached\n";
        let worktrees = parse_worktree_porcelain(stdout, "/repo/main");
        assert_eq!(worktrees.len(), 3);
        assert_eq!(worktrees[0].path, "/repo/main");
        assert_eq!(worktrees[0].branch.as_deref(), Some("main"));
        assert!(worktrees[0].is_current);
        assert!(!worktrees[0].locked);
        assert_eq!(worktrees[1].branch.as_deref(), Some("feature/login"));
        assert!(worktrees[1].locked);
        assert!(!worktrees[1].is_current);
        // Detached HEAD has no branch.
        assert_eq!(worktrees[2].branch, None);
        assert_eq!(worktrees[2].head.as_deref(), Some("cccc3333"));
    }

    #[test]
    fn worktree_current_match_is_separator_insensitive() {
        let stdout = "worktree C:/repo/main\nHEAD aaaa\nbranch refs/heads/main\n";
        // A backslash-style current root must still match git's forward-slash path.
        let worktrees = parse_worktree_porcelain(stdout, "C:\\repo\\main");
        assert!(worktrees[0].is_current);
    }

    #[test]
    fn default_branch_sorts_to_top() {
        let mk = |name: &str| GitBranch {
            name: name.to_string(),
            current: false,
            ahead: 0,
            behind: 0,
            upstream: None,
            lane: 0,
        };
        let mut branches = vec![mk("feature"), mk("main"), mk("hotfix")];
        sort_branches_default_first(&mut branches, Some("main"));
        assert_eq!(branches[0].name, "main");
        assert_eq!(branches[1].name, "feature");
        assert_eq!(branches[2].name, "hotfix");

        // Missing / no default leaves order untouched.
        let mut branches2 = vec![mk("feature"), mk("hotfix")];
        sort_branches_default_first(&mut branches2, Some("main"));
        assert_eq!(branches2[0].name, "feature");
        sort_branches_default_first(&mut branches2, None);
        assert_eq!(branches2[0].name, "feature");
    }

    #[test]
    fn parses_binary_numstat_as_negative() {
        assert_eq!(parse_count("-"), -1);
        assert_eq!(parse_count("7"), 7);
    }

    #[test]
    fn parses_unified_diff_line_numbers() {
        let diff = "diff --git a/f b/f\nindex 000..111\n--- a/f\n+++ b/f\n@@ -10,3 +10,4 @@ ctx header\n unchanged\n-removed\n+added one\n+added two\n more ctx";
        let lines = parse_unified_diff(diff);
        assert_eq!(lines[0].t, "hunk");
        assert_eq!(lines[1].t, "ctx");
        assert_eq!(lines[1].o, Some(10));
        assert_eq!(lines[1].n, Some(10));
        assert_eq!(lines[2].t, "del");
        assert_eq!(lines[2].o, Some(11));
        assert_eq!(lines[3].t, "add");
        assert_eq!(lines[3].n, Some(11));
        assert_eq!(lines[4].t, "add");
        assert_eq!(lines[4].n, Some(12));
        assert_eq!(lines[5].t, "ctx");
        assert_eq!(lines[5].o, Some(12));
        assert_eq!(lines[5].n, Some(13));
    }

    #[test]
    fn parses_porcelain_v2_status() {
        // One staged-modified, one unstaged-modified, one untracked.
        let staged = std::collections::HashMap::from([("a.rs".to_string(), (3i64, 1i64))]);
        let unstaged = std::collections::HashMap::from([("b.rs".to_string(), (4i64, 0i64))]);
        let stdout = "1 M. N... 100644 100644 100644 aaa bbb a.rs\u{0}1 .M N... 100644 100644 100644 ccc ddd b.rs\u{0}? new.rs\u{0}";
        let status = parse_status(stdout, &staged, &unstaged);
        assert_eq!(status.staged.len(), 1);
        assert_eq!(status.staged[0].path, "a.rs");
        assert_eq!(status.staged[0].status, "M");
        assert_eq!(status.staged[0].add, 3);
        assert_eq!(status.unstaged.len(), 2);
        assert_eq!(status.unstaged[0].path, "b.rs");
        assert_eq!(status.unstaged[0].status, "M");
        assert_eq!(status.unstaged[1].path, "new.rs");
        assert_eq!(status.unstaged[1].status, "?");
    }
}
