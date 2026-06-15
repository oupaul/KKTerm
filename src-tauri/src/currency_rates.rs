use serde::Serialize;
use serde_json::Value;
use std::time::Duration;

const CURRENCIES: &[&str] = &[
    "USD", "EUR", "TWD", "JPY", "CNY", "HKD", "KRW", "GBP", "CAD", "AUD", "SGD", "THB", "IDR",
    "VND", "CHF", "SEK", "MXN", "BRL",
];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CurrencyRatesResponse {
    base: String,
    date: String,
    rates: std::collections::BTreeMap<String, f64>,
    source: &'static str,
}

#[tauri::command]
pub async fn fetch_currency_rates() -> Result<CurrencyRatesResponse, String> {
    tauri::async_runtime::spawn_blocking(fetch_currency_rates_blocking)
        .await
        .map_err(|e| format!("Currency refresh task failed: {e}"))?
}

fn fetch_currency_rates_blocking() -> Result<CurrencyRatesResponse, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(10))
        .user_agent("KKTerm/0.1 currency converter")
        .build()
        .map_err(|e| format!("Currency refresh client failed: {e}"))?;

    let sources: &[(
        &str,
        &str,
        fn(Value) -> Result<CurrencyRatesResponse, String>,
    )] = &[
        (
            "Frankfurter",
            "https://api.frankfurter.dev/v1/latest?base=USD",
            parse_frankfurter_rates,
        ),
        (
            "Frankfurter legacy",
            "https://api.frankfurter.app/latest?from=USD",
            parse_frankfurter_rates,
        ),
        (
            "ExchangeRate-API open",
            "https://open.er-api.com/v6/latest/USD",
            parse_exchange_rate_api_rates,
        ),
        (
            "FloatRates",
            "https://www.floatrates.com/daily/usd.json",
            parse_floatrates_rates,
        ),
    ];

    let mut errors = Vec::new();
    for (name, url, parser) in sources {
        match client.get(*url).send() {
            Ok(response) if response.status().is_success() => match response.json::<Value>() {
                Ok(value) => match parser(value) {
                    Ok(rates) => return Ok(rates),
                    Err(error) => errors.push(format!("{name}: {error}")),
                },
                Err(error) => errors.push(format!("{name}: invalid JSON ({error})")),
            },
            Ok(response) => errors.push(format!("{name}: HTTP {}", response.status())),
            Err(error) => errors.push(format!("{name}: {error}")),
        }
    }

    Err(format!(
        "Currency refresh failed after trying {} sources: {}",
        sources.len(),
        errors.join("; ")
    ))
}

fn parse_frankfurter_rates(value: Value) -> Result<CurrencyRatesResponse, String> {
    let base = value
        .get("base")
        .and_then(Value::as_str)
        .unwrap_or("USD")
        .to_uppercase();
    let date = value
        .get("date")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();
    let rates = value.get("rates").ok_or("missing rates")?;
    build_rates(&base, &date, "Frankfurter", |code| {
        rates.get(code).and_then(Value::as_f64)
    })
}

fn parse_exchange_rate_api_rates(value: Value) -> Result<CurrencyRatesResponse, String> {
    if value.get("result").and_then(Value::as_str) != Some("success") {
        return Err("result was not success".to_string());
    }
    let date = value
        .get("time_last_update_utc")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();
    let rates = value.get("rates").ok_or("missing rates")?;
    build_rates("USD", &date, "ExchangeRate-API open", |code| {
        rates.get(code).and_then(Value::as_f64)
    })
}

fn parse_floatrates_rates(value: Value) -> Result<CurrencyRatesResponse, String> {
    build_rates("USD", "", "FloatRates", |code| {
        if code == "USD" {
            return Some(1.0);
        }
        value
            .get(code.to_lowercase())
            .and_then(|entry| entry.get("rate"))
            .and_then(|rate| rate.as_f64().or_else(|| rate.as_str()?.parse().ok()))
    })
}

fn build_rates(
    base: &str,
    date: &str,
    source: &'static str,
    rate_for: impl Fn(&str) -> Option<f64>,
) -> Result<CurrencyRatesResponse, String> {
    let mut rates = std::collections::BTreeMap::new();
    rates.insert(base.to_string(), 1.0);
    for code in CURRENCIES {
        if *code == base {
            continue;
        }
        if let Some(rate) = rate_for(code).filter(|rate| rate.is_finite() && *rate > 0.0) {
            rates.insert((*code).to_string(), rate);
        }
    }
    if rates.len() < CURRENCIES.len() {
        return Err("response did not include all supported currencies".to_string());
    }
    Ok(CurrencyRatesResponse {
        base: base.to_string(),
        date: date.to_string(),
        rates,
        source,
    })
}
