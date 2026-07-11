use std::collections::HashSet;

use super::types::RackItemMetadata;

fn trim_string(value: &mut Option<String>) {
    *value = value
        .as_ref()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
}

fn normalize_speed(value: &str) -> String {
    match value.trim().to_ascii_lowercase().as_str() {
        "1g" | "gigabit" => "gigabit".to_string(),
        "10g" => "10g".to_string(),
        "25g" => "25g".to_string(),
        "40g" => "40g".to_string(),
        "100g" => "100g".to_string(),
        _ => "custom".to_string(),
    }
}

pub fn normalize_metadata(mut metadata: RackItemMetadata) -> RackItemMetadata {
    trim_string(&mut metadata.accent);
    trim_string(&mut metadata.icon);
    trim_string(&mut metadata.notes);
    trim_string(&mut metadata.status);
    trim_string(&mut metadata.shell);
    trim_string(&mut metadata.expiry);
    trim_string(&mut metadata.vendor);
    trim_string(&mut metadata.form_factor);
    trim_string(&mut metadata.server_panel_style);
    trim_string(&mut metadata.kuaiguai_size);
    trim_string(&mut metadata.host_id);

    metadata.form_factor = metadata
        .form_factor
        .filter(|value| matches!(value.as_str(), "rack" | "tower"));
    metadata.server_panel_style = metadata
        .server_panel_style
        .filter(|value| matches!(value.as_str(), "default" | "style1" | "style2"));

    if let Some(tags) = metadata.tags.take() {
        let tags = tags
            .into_iter()
            .map(|tag| tag.trim().to_string())
            .filter(|tag| !tag.is_empty())
            .collect::<Vec<_>>();
        metadata.tags = (!tags.is_empty()).then_some(tags);
    }

    if let Some(ids) = metadata.connection_ids.take() {
        let mut seen = HashSet::new();
        let ids = ids
            .into_iter()
            .map(|id| id.trim().to_string())
            .filter(|id| !id.is_empty() && seen.insert(id.clone()))
            .collect::<Vec<_>>();
        metadata.connection_ids = (!ids.is_empty()).then_some(ids);
    }

    if let Some(ports) = metadata.network_ports.take() {
        let ports = ports
            .into_iter()
            .filter_map(|mut port| {
                port.name = port.name.trim().to_string();
                if port.name.is_empty() {
                    return None;
                }
                port.speed = normalize_speed(&port.speed);
                trim_string(&mut port.state);
                trim_string(&mut port.oid);
                trim_string(&mut port.note);
                Some(port)
            })
            .collect::<Vec<_>>();
        metadata.network_ports = (!ports.is_empty()).then_some(ports);
    }

    if let Some(mut snmp) = metadata.snmp.take() {
        snmp.target = snmp.target.trim().to_string();
        trim_string(&mut snmp.oid);
        trim_string(&mut snmp.community_secret_ref);
        trim_string(&mut snmp.last_refreshed_at);
        trim_string(&mut snmp.last_error);
        metadata.snmp = (!snmp.target.is_empty()).then_some(snmp);
    }

    // A 0 W draw carries no information for the power heatmap; store as unset.
    metadata.power_w = metadata.power_w.filter(|watts| *watts > 0);
    metadata.rack_top_corner = metadata.rack_top_corner.filter(|corner| *corner <= 3);

    metadata
}

#[cfg(test)]
mod inventory_tests {
    use super::normalize_metadata;
    use crate::itops::types::RackItemMetadata;

    #[test]
    fn normalizes_legacy_rack_inventory_metadata() {
        let metadata: RackItemMetadata = serde_json::from_value(serde_json::json!({
            "tags": [" core ", "", "edge"],
            "connectionIds": ["conn-1", "conn-1", "conn-2"],
            "networkPorts": ["1:gigabit", "2:10g"],
            "snmp": "public@192.0.2.10:1.3.6.1.2.1.2",
            "vendor": "Dell",
            "formFactor": "tower",
            "serverPanelStyle": "style1",
            "rackTopCorner": 3
        }))
        .expect("legacy metadata should deserialize");

        let normalized = normalize_metadata(metadata);

        assert_eq!(normalized.tags.unwrap(), vec!["core", "edge"]);
        assert_eq!(normalized.connection_ids.unwrap(), vec!["conn-1", "conn-2"]);
        assert_eq!(normalized.network_ports.unwrap()[1].speed, "10g");
        assert_eq!(normalized.snmp.unwrap().target, "192.0.2.10");
        assert_eq!(normalized.vendor.unwrap(), "Dell");
        assert_eq!(normalized.form_factor.as_deref(), Some("tower"));
        assert_eq!(normalized.server_panel_style.as_deref(), Some("style1"));
        assert_eq!(normalized.rack_top_corner, Some(3));
    }
}
