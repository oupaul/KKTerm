use base64::{engine::general_purpose::STANDARD, Engine as _};
use reqwest::{header, Client};
use std::time::Duration;
use url::Url;

const MAX_ICON_BYTES: u64 = 256 * 1024;
const MAX_HTML_BYTES: u64 = 512 * 1024;

pub async fn fetch_favicon_data_url(page_url: &str) -> Option<String> {
    let page_url = Url::parse(page_url).ok()?;
    if !matches!(page_url.scheme(), "http" | "https") {
        return None;
    }
    let client = Client::builder()
        .timeout(Duration::from_secs(4))
        .redirect(reqwest::redirect::Policy::limited(5))
        .user_agent("KKTerm favicon fetcher")
        .build()
        .ok()?;

    let mut candidates = favicon_candidates_from_page(&client, &page_url).await;
    if let Ok(fallback) = page_url.join("/favicon.ico") {
        candidates.push(fallback);
    }
    for url in dedupe_urls(candidates) {
        if let Some(data_url) = fetch_icon_data_url(&client, url).await {
            return Some(data_url);
        }
    }
    None
}

async fn favicon_candidates_from_page(client: &Client, page_url: &Url) -> Vec<Url> {
    let response = match client.get(page_url.clone()).send().await {
        Ok(response) if response.status().is_success() => response,
        _ => return Vec::new(),
    };
    let content_type = response
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .to_ascii_lowercase();
    if !content_type.contains("text/html") && !content_type.contains("application/xhtml") {
        return Vec::new();
    }
    let bytes = match response.bytes().await {
        Ok(bytes) if bytes.len() as u64 <= MAX_HTML_BYTES => bytes,
        _ => return Vec::new(),
    };
    let html = String::from_utf8_lossy(&bytes);
    parse_icon_links(&html)
        .into_iter()
        .filter_map(|href| page_url.join(&href).ok())
        .collect()
}

async fn fetch_icon_data_url(client: &Client, url: Url) -> Option<String> {
    let response = client.get(url.clone()).send().await.ok()?;
    if !response.status().is_success() {
        return None;
    }
    let mime_type = response
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .and_then(normalize_image_mime_type)
        .or_else(|| image_mime_type_for_path(url.path()))?;
    let bytes = response.bytes().await.ok()?;
    if bytes.is_empty() || bytes.len() as u64 > MAX_ICON_BYTES {
        return None;
    }
    Some(format!(
        "data:{mime_type};base64,{}",
        STANDARD.encode(bytes)
    ))
}

fn dedupe_urls(urls: Vec<Url>) -> Vec<Url> {
    let mut deduped = Vec::new();
    for url in urls {
        if !deduped.iter().any(|existing| existing == &url) {
            deduped.push(url);
        }
    }
    deduped
}

fn parse_icon_links(html: &str) -> Vec<String> {
    let mut links = Vec::new();
    let lower = html.to_ascii_lowercase();
    let mut offset = 0;
    while let Some(start) = lower[offset..].find("<link") {
        let tag_start = offset + start;
        let Some(tag_end_offset) = lower[tag_start..].find('>') else {
            break;
        };
        let tag_end = tag_start + tag_end_offset + 1;
        let tag = &html[tag_start..tag_end];
        let lower_tag = &lower[tag_start..tag_end];
        if attribute_value(lower_tag, tag, "rel")
            .map(|rel| rel.to_ascii_lowercase().contains("icon"))
            .unwrap_or(false)
        {
            if let Some(href) = attribute_value(lower_tag, tag, "href") {
                links.push(href);
            }
        }
        offset = tag_end;
    }
    links
}

fn attribute_value(lower_tag: &str, original_tag: &str, name: &str) -> Option<String> {
    let pattern = format!("{name}=");
    let index = lower_tag.find(&pattern)? + pattern.len();
    let bytes = original_tag.as_bytes();
    let quote = *bytes.get(index)?;
    if quote == b'\'' || quote == b'\"' {
        let rest = &original_tag[index + 1..];
        let end = rest.find(quote as char)?;
        return Some(rest[..end].trim().to_string()).filter(|value| !value.is_empty());
    }
    let rest = &original_tag[index..];
    let end = rest
        .find(|ch: char| ch.is_ascii_whitespace() || ch == '>')
        .unwrap_or(rest.len());
    Some(rest[..end].trim().to_string()).filter(|value| !value.is_empty())
}

fn normalize_image_mime_type(value: &str) -> Option<&'static str> {
    match value
        .split(';')
        .next()?
        .trim()
        .to_ascii_lowercase()
        .as_str()
    {
        "image/png" => Some("image/png"),
        "image/jpeg" | "image/jpg" => Some("image/jpeg"),
        "image/gif" => Some("image/gif"),
        "image/svg+xml" => Some("image/svg+xml"),
        "image/x-icon" | "image/vnd.microsoft.icon" => Some("image/x-icon"),
        "image/webp" => Some("image/webp"),
        _ => None,
    }
}

fn image_mime_type_for_path(path: &str) -> Option<&'static str> {
    match path.rsplit('.').next()?.to_ascii_lowercase().as_str() {
        "png" => Some("image/png"),
        "jpg" | "jpeg" => Some("image/jpeg"),
        "gif" => Some("image/gif"),
        "svg" => Some("image/svg+xml"),
        "ico" => Some("image/x-icon"),
        "webp" => Some("image/webp"),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_icon_links_reads_rel_icon_hrefs() {
        let html = r#"<html><head>
            <link rel="stylesheet" href="app.css">
            <link href="/favicon.png" rel="shortcut icon">
            <link rel='apple-touch-icon' href='/apple.png'>
        </head></html>"#;

        assert_eq!(parse_icon_links(html), vec!["/favicon.png", "/apple.png"]);
    }

    #[test]
    fn normalizes_common_icon_mime_types() {
        assert_eq!(
            normalize_image_mime_type("image/vnd.microsoft.icon"),
            Some("image/x-icon")
        );
        assert_eq!(
            normalize_image_mime_type("image/png; charset=binary"),
            Some("image/png")
        );
        assert_eq!(
            image_mime_type_for_path("/favicon.ico"),
            Some("image/x-icon")
        );
    }
}
