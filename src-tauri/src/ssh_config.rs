use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportSshConfigRequest {
    content: String,
    folder_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SshConfigImportPreview {
    pub(crate) drafts: Vec<SshConfigConnectionDraft>,
    pub(crate) unsupported_directives: Vec<UnsupportedSshDirective>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SshConfigConnectionDraft {
    pub(crate) name: String,
    pub(crate) host: String,
    pub(crate) user: String,
    #[serde(rename = "type")]
    pub(crate) connection_type: &'static str,
    pub(crate) folder_id: Option<String>,
    pub(crate) port: Option<u16>,
    pub(crate) key_path: Option<String>,
    pub(crate) proxy_jump: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UnsupportedSshDirective {
    pub(crate) line: usize,
    pub(crate) host_pattern: Option<String>,
    pub(crate) directive: String,
    pub(crate) value: String,
}

#[derive(Default)]
struct HostBlock {
    patterns: Vec<String>,
    host_name: Option<String>,
    user: Option<String>,
    port: Option<u16>,
    key_path: Option<String>,
    proxy_jump: Option<String>,
}

pub fn import_ssh_config(
    request: ImportSshConfigRequest,
) -> Result<SshConfigImportPreview, String> {
    parse_ssh_config_text(&request.content, request.folder_id.as_deref())
}

pub(crate) fn parse_ssh_config_text(
    content: &str,
    folder_id: Option<&str>,
) -> Result<SshConfigImportPreview, String> {
    let mut unsupported_directives = Vec::new();
    let mut global_block = HostBlock {
        patterns: vec!["*".to_string()],
        ..HostBlock::default()
    };
    let mut blocks = Vec::new();
    let mut current_block: Option<HostBlock> = None;
    let folder_id = folder_id
        .map(|folder_id| required_field("folder id", folder_id.to_string()))
        .transpose()?;

    for (line_index, raw_line) in content.lines().enumerate() {
        let line_number = line_index + 1;
        let line = strip_inline_comment(raw_line).trim().to_string();
        if line.is_empty() {
            continue;
        }

        let tokens = split_config_line(&line)?;
        if tokens.is_empty() {
            continue;
        }

        let directive = tokens[0].to_ascii_lowercase();
        let values = &tokens[1..];
        if directive == "host" {
            if let Some(block) = current_block.take() {
                blocks.push(block);
            }

            current_block = Some(HostBlock {
                patterns: values.to_vec(),
                ..HostBlock::default()
            });
            continue;
        }

        if apply_supported_directive(
            current_block.as_mut().unwrap_or(&mut global_block),
            directive.as_str(),
            values,
            line_number,
        )? {
            continue;
        }

        let host_pattern = current_block.as_ref().map(|block| block.patterns.join(" "));
        unsupported_directives.push(UnsupportedSshDirective {
            line: line_number,
            host_pattern,
            directive: tokens[0].clone(),
            value: values.join(" "),
        });
    }

    if let Some(block) = current_block {
        blocks.push(block);
    }

    let aliases = importable_aliases(&blocks);
    let drafts = aliases
        .iter()
        .map(|alias| resolved_draft_for_alias(alias, &global_block, &blocks, folder_id.as_deref()))
        .collect();

    Ok(SshConfigImportPreview {
        drafts,
        unsupported_directives,
    })
}

fn apply_supported_directive(
    block: &mut HostBlock,
    directive: &str,
    values: &[String],
    line_number: usize,
) -> Result<bool, String> {
    match directive {
        "hostname" => set_first(&mut block.host_name, values),
        "user" => set_first(&mut block.user, values),
        "identityfile" => set_first(&mut block.key_path, values),
        "proxyjump" => set_first(&mut block.proxy_jump, values),
        "port" => {
            if block.port.is_none() {
                if let Some(value) = values.first() {
                    block.port = Some(parse_port(value, line_number)?);
                }
            }
        }
        _ => return Ok(false),
    }
    Ok(true)
}

fn set_first(slot: &mut Option<String>, values: &[String]) {
    if slot.is_none() {
        *slot = first_value(values);
    }
}

fn importable_aliases(blocks: &[HostBlock]) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut aliases = Vec::new();
    for block in blocks {
        for pattern in &block.patterns {
            if is_importable_host_pattern(pattern)
                && host_patterns_match(&block.patterns, pattern)
                && seen.insert(pattern.to_ascii_lowercase())
            {
                aliases.push(pattern.clone());
            }
        }
    }
    aliases
}

fn resolved_draft_for_alias(
    alias: &str,
    global_block: &HostBlock,
    blocks: &[HostBlock],
    folder_id: Option<&str>,
) -> SshConfigConnectionDraft {
    let mut resolved = HostBlock::default();
    for block in std::iter::once(global_block).chain(blocks.iter()) {
        if !host_patterns_match(&block.patterns, alias) {
            continue;
        }
        inherit_first(&mut resolved.host_name, &block.host_name);
        inherit_first(&mut resolved.user, &block.user);
        inherit_first(&mut resolved.port, &block.port);
        inherit_first(&mut resolved.key_path, &block.key_path);
        inherit_first(&mut resolved.proxy_jump, &block.proxy_jump);
    }

    SshConfigConnectionDraft {
        name: alias.to_string(),
        host: resolved.host_name.unwrap_or_else(|| alias.to_string()),
        user: resolved.user.unwrap_or_else(default_ssh_user),
        connection_type: "ssh",
        folder_id: folder_id.map(ToString::to_string),
        port: resolved.port,
        key_path: resolved.key_path,
        proxy_jump: resolved.proxy_jump,
    }
}

fn inherit_first<T: Clone>(target: &mut Option<T>, source: &Option<T>) {
    if target.is_none() {
        *target = source.clone();
    }
}

fn host_patterns_match(patterns: &[String], alias: &str) -> bool {
    let mut positive_match = false;
    for raw_pattern in patterns {
        let (negated, pattern) = raw_pattern
            .strip_prefix('!')
            .map(|pattern| (true, pattern))
            .unwrap_or((false, raw_pattern.as_str()));
        if wildcard_match(pattern, alias) {
            if negated {
                return false;
            }
            positive_match = true;
        }
    }
    positive_match
}

fn wildcard_match(pattern: &str, value: &str) -> bool {
    let pattern: Vec<char> = pattern.to_ascii_lowercase().chars().collect();
    let value: Vec<char> = value.to_ascii_lowercase().chars().collect();
    let mut previous = vec![false; value.len() + 1];
    previous[0] = true;

    for pattern_char in pattern {
        let mut current = vec![false; value.len() + 1];
        if pattern_char == '*' {
            current[0] = previous[0];
            for index in 1..=value.len() {
                current[index] = previous[index] || current[index - 1];
            }
        } else {
            for index in 1..=value.len() {
                current[index] = previous[index - 1]
                    && (pattern_char == '?' || pattern_char == value[index - 1]);
            }
        }
        previous = current;
    }

    previous[value.len()]
}

fn split_config_line(line: &str) -> Result<Vec<String>, String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut quote: Option<char> = None;

    for character in line.chars() {
        match (quote, character) {
            (Some(active_quote), quote_character) if active_quote == quote_character => {
                quote = None;
            }
            (None, '"' | '\'') => quote = Some(character),
            (None, '=') if tokens.is_empty() => {
                if !current.is_empty() {
                    tokens.push(std::mem::take(&mut current));
                }
            }
            (None, whitespace) if whitespace.is_whitespace() => {
                if !current.is_empty() {
                    tokens.push(std::mem::take(&mut current));
                }
            }
            _ => current.push(character),
        }
    }

    if quote.is_some() {
        return Err("SSH config line contains an unterminated quote".to_string());
    }

    if !current.is_empty() {
        tokens.push(current);
    }

    Ok(tokens)
}

fn strip_inline_comment(line: &str) -> String {
    let mut quote: Option<char> = None;
    let mut previous_was_whitespace = true;
    let mut output = String::new();

    for character in line.chars() {
        match (quote, character) {
            (Some(active_quote), quote_character) if active_quote == quote_character => {
                quote = None;
                output.push(character);
            }
            (None, '"' | '\'') => {
                quote = Some(character);
                output.push(character);
            }
            (None, '#') if previous_was_whitespace => break,
            _ => {
                previous_was_whitespace = character.is_whitespace();
                output.push(character);
            }
        }
    }

    output
}

fn first_value(values: &[String]) -> Option<String> {
    values
        .first()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn parse_port(value: &str, line_number: usize) -> Result<u16, String> {
    value
        .parse::<u16>()
        .map_err(|_| format!("SSH config line {line_number} has an invalid port"))
}

fn is_importable_host_pattern(pattern: &str) -> bool {
    !pattern.contains('*') && !pattern.contains('?') && !pattern.starts_with('!')
}

fn default_ssh_user() -> String {
    std::env::var("USER")
        .or_else(|_| std::env::var("USERNAME"))
        .unwrap_or_else(|_| "local".to_string())
}

fn required_field(field: &str, value: String) -> Result<String, String> {
    let trimmed = value.trim().to_string();
    if trimmed.is_empty() {
        Err(format!("{field} is required"))
    } else {
        Ok(trimmed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn imports_supported_ssh_config_directives_as_connection_drafts() {
        let preview = parse_ssh_config_text(
            r#"
Host bastion-east
  HostName bastion-east.internal
  User admin
  Port 2222
  IdentityFile "C:\Users\example\.ssh\id_ed25519"
  ProxyJump jump.internal
"#,
            Some("imported"),
        )
        .expect("SSH config parses");

        assert_eq!(preview.drafts.len(), 1);
        assert_eq!(preview.drafts[0].name, "bastion-east");
        assert_eq!(preview.drafts[0].host, "bastion-east.internal");
        assert_eq!(preview.drafts[0].user, "admin");
        assert_eq!(preview.drafts[0].port, Some(2222));
        assert_eq!(
            preview.drafts[0].key_path.as_deref(),
            Some("C:\\Users\\example\\.ssh\\id_ed25519")
        );
        assert_eq!(
            preview.drafts[0].proxy_jump.as_deref(),
            Some("jump.internal")
        );
    }

    #[test]
    fn reports_unsupported_directives_without_blocking_supported_hosts() {
        let preview = parse_ssh_config_text(
            r#"
Include ~/.ssh/conf.d/*

Host api-stage *.internal
  HostName api-stage.internal
  User ops
  ForwardAgent yes
"#,
            None,
        )
        .expect("SSH config parses");

        assert_eq!(preview.drafts.len(), 1);
        assert_eq!(preview.drafts[0].name, "api-stage");
        assert_eq!(preview.unsupported_directives.len(), 2);
        assert_eq!(preview.unsupported_directives[0].directive, "Include");
        assert_eq!(preview.unsupported_directives[1].directive, "ForwardAgent");
        assert_eq!(
            preview.unsupported_directives[1].host_pattern.as_deref(),
            Some("api-stage *.internal")
        );
    }

    #[test]
    fn wildcard_blocks_fill_missing_values_for_each_concrete_host() {
        let preview = parse_ssh_config_text(
            r#"
Host myserver
  HostName 192.168.1.50
  User admin
  Port 2222

Host github.com
  User git
  IdentityFile ~/.ssh/github_key

Host *
  Port 22
  IdentityFile ~/.ssh/id_ed25519
  ProxyJump bastion
"#,
            None,
        )
        .expect("SSH config parses");

        assert_eq!(preview.drafts.len(), 2);
        let myserver = preview
            .drafts
            .iter()
            .find(|draft| draft.name == "myserver")
            .expect("myserver draft missing");
        assert_eq!(myserver.host, "192.168.1.50");
        assert_eq!(myserver.user, "admin");
        assert_eq!(myserver.port, Some(2222));
        assert_eq!(myserver.key_path.as_deref(), Some("~/.ssh/id_ed25519"));
        assert_eq!(myserver.proxy_jump.as_deref(), Some("bastion"));

        let github = preview
            .drafts
            .iter()
            .find(|draft| draft.name == "github.com")
            .expect("github draft missing");
        assert_eq!(github.host, "github.com");
        assert_eq!(github.user, "git");
        assert_eq!(github.port, Some(22));
        assert_eq!(github.key_path.as_deref(), Some("~/.ssh/github_key"));
        assert_eq!(github.proxy_jump.as_deref(), Some("bastion"));
    }

    #[test]
    fn wildcard_resolution_uses_openssh_first_value_wins_ordering() {
        let preview = parse_ssh_config_text(
            r#"
User global-user

Host *
  Port 2200
  IdentityFile ~/.ssh/global_key

Host app
  HostName app.internal
  User app-user
  Port 2222
  IdentityFile ~/.ssh/app_key
"#,
            None,
        )
        .expect("SSH config parses");

        let app = &preview.drafts[0];
        assert_eq!(app.host, "app.internal");
        assert_eq!(app.user, "global-user");
        assert_eq!(app.port, Some(2200));
        assert_eq!(app.key_path.as_deref(), Some("~/.ssh/global_key"));
    }

    #[test]
    fn wildcard_blocks_honor_negated_and_question_mark_patterns() {
        let preview = parse_ssh_config_text(
            r#"
Host node1 node2 github.com

Host node? !node2
  User cluster-user
  ProxyJump cluster-bastion

Host * !github.com
  Port 2022
"#,
            None,
        )
        .expect("SSH config parses");

        let node1 = preview
            .drafts
            .iter()
            .find(|draft| draft.name == "node1")
            .expect("node1 draft missing");
        assert_eq!(node1.user, "cluster-user");
        assert_eq!(node1.proxy_jump.as_deref(), Some("cluster-bastion"));
        assert_eq!(node1.port, Some(2022));

        let node2 = preview
            .drafts
            .iter()
            .find(|draft| draft.name == "node2")
            .expect("node2 draft missing");
        assert_eq!(node2.proxy_jump, None);
        assert_eq!(node2.port, Some(2022));

        let github = preview
            .drafts
            .iter()
            .find(|draft| draft.name == "github.com")
            .expect("github draft missing");
        assert_eq!(github.port, None);
    }

    #[test]
    fn negated_concrete_aliases_do_not_create_drafts() {
        let preview = parse_ssh_config_text(
            r#"
Host included excluded !excluded
  User deploy
"#,
            None,
        )
        .expect("SSH config parses");

        assert_eq!(preview.drafts.len(), 1);
        assert_eq!(preview.drafts[0].name, "included");
    }

    #[test]
    fn rejects_invalid_ports_with_line_context() {
        let error = parse_ssh_config_text(
            r#"
Host bad-port
  Port nope
"#,
            None,
        )
        .expect_err("invalid port is rejected");

        assert_eq!(error, "SSH config line 3 has an invalid port");
    }
}
