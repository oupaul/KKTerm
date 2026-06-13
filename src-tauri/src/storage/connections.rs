use super::*;

impl Storage {
    pub fn create_connection(
        &self,
        request: CreateConnectionRequest,
    ) -> Result<SavedConnection, String> {
        let connection_type = normalize_connection_type(&request.connection_type)?;
        let name = required_field("name", request.name)?;
        let url = normalize_url_field(request.url, &connection_type)?;
        let serial_line = normalize_serial_line(request.serial_line, &connection_type)?;
        let serial_speed = normalize_serial_speed(request.serial_speed, &connection_type)?;
        let port = normalize_connection_port(request.port, &connection_type);
        let host = if connection_type == "url" {
            url.as_deref()
                .and_then(|value| extract_url_host(value))
                .unwrap_or_default()
        } else if connection_type == "serial" {
            serial_line.clone().unwrap_or_else(|| "COM1".to_string())
        } else if connection_type == "localFiles" {
            // The local File Explorer has no remote host; it browses the local
            // filesystem starting from the local startup directory (or home).
            let trimmed = request.host.trim();
            if trimmed.is_empty() {
                "localhost".to_string()
            } else {
                trimmed.to_string()
            }
        } else {
            required_field("host", request.host)?
        };
        let user = normalize_connection_user(request.user, &connection_type)?;
        let folder_id = normalize_optional_id(request.folder_id);
        let key_path = normalize_ssh_optional_field(request.key_path, &connection_type);
        let proxy_jump = normalize_ssh_optional_field(request.proxy_jump, &connection_type);
        let auth_method = normalize_auth_method(request.auth_method, &connection_type, &key_path)?;
        let local_shell = normalize_local_shell(request.local_shell, &connection_type)?;
        let local_startup_directory =
            normalize_local_startup_directory(request.local_startup_directory, &connection_type)?;
        let local_startup_script =
            normalize_local_startup_script(request.local_startup_script, &connection_type)?;
        let data_partition = normalize_data_partition(request.data_partition, &connection_type)?;
        let rdp_options = normalize_rdp_connection_options(request.rdp_options, &connection_type)?;
        let vnc_options = normalize_vnc_connection_options(request.vnc_options, &connection_type)?;
        let ftp_options = normalize_ftp_connection_options(request.ftp_options, &connection_type)?;
        let rdp_options_json = serialize_connection_options(&rdp_options, "RDP")?;
        let vnc_options_json = serialize_connection_options(&vnc_options, "VNC")?;
        let ftp_options_json = serialize_connection_options(&ftp_options, "FTP")?;
        let id = make_connection_id(&name);
        let use_tmux_sessions =
            normalize_use_tmux_sessions(request.use_tmux_sessions, &connection_type);
        let tmux_connection_id = if use_tmux_sessions {
            Some(make_tmux_connection_id(&id))
        } else {
            None
        };
        let tags = Vec::new();

        let mut connection = self.lock()?;
        let transaction = connection.transaction().map_err(to_storage_error)?;
        if let Some(folder_id) = folder_id.as_deref() {
            ensure_folder_exists(&transaction, folder_id, folder_name_for(folder_id))?;
        }
        // A Connection inherits the Workspace of its target folder; root-level
        // Connections use the requested (active) Workspace, defaulting to Default.
        let workspace_id = match folder_id.as_deref() {
            Some(folder_id) => folder_workspace_id(&transaction, folder_id)?,
            None => normalize_workspace_id(request.workspace_id.unwrap_or_default()),
        };
        let next_sort_order = match folder_id.as_deref() {
            Some(folder_id) => next_connection_sort_order(&transaction, Some(folder_id))?,
            None => next_root_connection_sort_order_for_workspace(&transaction, &workspace_id)?,
        };

        transaction
            .execute(
                "INSERT INTO connections (
                    id, folder_id, name, host, username, port, key_path, proxy_jump, auth_method, local_shell, local_startup_directory, local_startup_script, url, data_partition, use_tmux_sessions, tmux_connection_id, serial_line, serial_speed, rdp_options, vnc_options, ftp_options, connection_type, status, sort_order, workspace_id
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, 'idle', ?23, ?24)",
                params![
                    id,
                    folder_id,
                    name,
                    host,
                    user,
                    port,
                    key_path,
                    proxy_jump,
                    auth_method,
                    local_shell,
                    local_startup_directory,
                    local_startup_script,
                    url,
                    data_partition,
                    use_tmux_sessions,
                    tmux_connection_id,
                    serial_line,
                    serial_speed,
                    rdp_options_json,
                    vnc_options_json,
                    ftp_options_json,
                    connection_type,
                    next_sort_order,
                    workspace_id
                ],
            )
            .map_err(to_storage_error)?;

        for (index, tag) in tags.iter().enumerate() {
            transaction
                .execute(
                    "INSERT INTO connection_tags (connection_id, tag, sort_order)
                     VALUES (?1, ?2, ?3)",
                    params![id, tag, index as i64],
                )
                .map_err(to_storage_error)?;
        }

        transaction.commit().map_err(to_storage_error)?;

        Ok(SavedConnection {
            id,
            name,
            tab_title: None,
            host,
            user,
            port,
            key_path,
            proxy_jump,
            auth_method,
            local_shell,
            local_startup_directory,
            local_startup_script,
            url,
            data_partition,
            use_tmux_sessions,
            tmux_connection_id,
            serial_line,
            serial_speed,
            url_credential_username: None,
            has_url_credential: false,
            rdp_options,
            vnc_options,
            ftp_options,
            password_credential_id: None,
            icon_data_url: None,
            icon_background_color: None,
            terminal_opacity: Some(DEFAULT_TERMINAL_OPACITY),
            terminal_background: None,
            connection_type,
            tags,
            status: "idle".to_string(),
        })
    }

    pub fn update_connection(
        &self,
        request: UpdateConnectionRequest,
    ) -> Result<SavedConnection, String> {
        let id = required_field("connection id", request.id)?;
        let connection_type = normalize_connection_type(&request.connection_type)?;
        let name = required_field("name", request.name)?;
        let url = normalize_url_field(request.url, &connection_type)?;
        let serial_line = normalize_serial_line(request.serial_line, &connection_type)?;
        let serial_speed = normalize_serial_speed(request.serial_speed, &connection_type)?;
        let port = normalize_connection_port(request.port, &connection_type);
        let host = if connection_type == "url" {
            url.as_deref()
                .and_then(|value| extract_url_host(value))
                .unwrap_or_default()
        } else if connection_type == "serial" {
            serial_line.clone().unwrap_or_else(|| "COM1".to_string())
        } else if connection_type == "localFiles" {
            // The local File Explorer has no remote host; it browses the local
            // filesystem starting from the local startup directory (or home).
            let trimmed = request.host.trim();
            if trimmed.is_empty() {
                "localhost".to_string()
            } else {
                trimmed.to_string()
            }
        } else {
            required_field("host", request.host)?
        };
        let user = normalize_connection_user(request.user, &connection_type)?;
        let target_folder_id = normalize_optional_id(request.folder_id);
        let key_path = normalize_ssh_optional_field(request.key_path, &connection_type);
        let proxy_jump = normalize_ssh_optional_field(request.proxy_jump, &connection_type);
        let auth_method = normalize_auth_method(request.auth_method, &connection_type, &key_path)?;
        let local_shell = normalize_local_shell(request.local_shell, &connection_type)?;
        let local_startup_directory =
            normalize_local_startup_directory(request.local_startup_directory, &connection_type)?;
        let local_startup_script =
            normalize_local_startup_script(request.local_startup_script, &connection_type)?;
        let data_partition = normalize_data_partition(request.data_partition, &connection_type)?;
        let rdp_options = normalize_rdp_connection_options(request.rdp_options, &connection_type)?;
        let vnc_options = normalize_vnc_connection_options(request.vnc_options, &connection_type)?;
        let ftp_options = normalize_ftp_connection_options(request.ftp_options, &connection_type)?;
        let rdp_options_json = serialize_connection_options(&rdp_options, "RDP")?;
        let vnc_options_json = serialize_connection_options(&vnc_options, "VNC")?;
        let ftp_options_json = serialize_connection_options(&ftp_options, "FTP")?;
        let mut connection = self.lock()?;
        let transaction = connection.transaction().map_err(to_storage_error)?;
        let existing = transaction
            .query_row(
                "SELECT folder_id, connection_type, use_tmux_sessions, tmux_connection_id, workspace_id FROM connections WHERE id = ?1",
                params![&id],
                |row| {
                    Ok((
                        row.get::<_, Option<String>>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, bool>(2)?,
                        row.get::<_, Option<String>>(3)?,
                        row.get::<_, Option<String>>(4)?,
                    ))
                },
            )
            .optional()
            .map_err(to_storage_error)?
            .ok_or_else(|| "connection was not found".to_string())?;

        let (
            source_folder_id,
            existing_connection_type,
            existing_use_tmux_sessions,
            existing_tmux_connection_id,
            existing_workspace_id,
        ) = existing;
        if existing_connection_type != connection_type {
            return Err("connection type cannot be changed".to_string());
        }
        if let Some(folder_id) = target_folder_id.as_deref() {
            ensure_folder_exists(&transaction, folder_id, folder_name_for(folder_id))?;
        }

        let use_tmux_sessions = if connection_type == "ssh" {
            request
                .use_tmux_sessions
                .unwrap_or(existing_use_tmux_sessions)
        } else {
            false
        };
        let tmux_connection_id = if use_tmux_sessions && connection_type == "ssh" {
            Some(existing_tmux_connection_id.unwrap_or_else(|| make_tmux_connection_id(&id)))
        } else {
            None
        };
        let source_workspace_id = match source_folder_id.as_deref() {
            Some(folder_id) => folder_workspace_id(&transaction, folder_id)?,
            None => normalize_workspace_id(existing_workspace_id.clone().unwrap_or_default()),
        };
        let target_workspace_id = match target_folder_id.as_deref() {
            Some(folder_id) => folder_workspace_id(&transaction, folder_id)?,
            None => normalize_workspace_id(existing_workspace_id.unwrap_or_default()),
        };
        let sort_order = if source_folder_id == target_folder_id {
            transaction
                .query_row(
                    "SELECT sort_order FROM connections WHERE id = ?1",
                    params![&id],
                    |row| row.get::<_, i64>(0),
                )
                .map_err(to_storage_error)?
        } else {
            match target_folder_id.as_deref() {
                Some(folder_id) => next_connection_sort_order(&transaction, Some(folder_id))?,
                None => next_root_connection_sort_order_for_workspace(
                    &transaction,
                    &target_workspace_id,
                )?,
            }
        };

        transaction
            .execute(
                "UPDATE connections
                 SET folder_id = ?1,
                     name = ?2,
                     host = ?3,
                     username = ?4,
                     port = ?5,
                     key_path = ?6,
                     proxy_jump = ?7,
                     auth_method = ?8,
                     local_shell = ?9,
                     local_startup_directory = ?10,
                     local_startup_script = ?11,
                     url = ?12,
                     data_partition = ?13,
                     use_tmux_sessions = ?14,
                     tmux_connection_id = ?15,
                     serial_line = ?16,
                     serial_speed = ?17,
                     rdp_options = ?18,
                     vnc_options = ?19,
                     ftp_options = ?20,
                     sort_order = ?21,
                     workspace_id = ?22
                 WHERE id = ?23",
                params![
                    target_folder_id,
                    name,
                    host,
                    user,
                    port,
                    key_path,
                    proxy_jump,
                    auth_method,
                    local_shell,
                    local_startup_directory,
                    local_startup_script,
                    url,
                    data_partition,
                    use_tmux_sessions,
                    tmux_connection_id,
                    serial_line,
                    serial_speed,
                    rdp_options_json,
                    vnc_options_json,
                    ftp_options_json,
                    sort_order,
                    &target_workspace_id,
                    &id
                ],
            )
            .map_err(to_storage_error)?;

        if source_folder_id != target_folder_id {
            match source_folder_id.as_deref() {
                Some(folder_id) => reorder_connection_ids(&transaction, Some(folder_id), None)?,
                None => reorder_root_connection_ids_for_workspace(
                    &transaction,
                    &source_workspace_id,
                    None,
                )?,
            }
            match target_folder_id.as_deref() {
                Some(folder_id) => reorder_connection_ids(&transaction, Some(folder_id), None)?,
                None => reorder_root_connection_ids_for_workspace(
                    &transaction,
                    &target_workspace_id,
                    None,
                )?,
            }
        }

        transaction.commit().map_err(to_storage_error)?;
        get_connection_by_id(&connection, &id)
    }

    pub fn update_url_connection_icon_data_url(
        &self,
        connection_id: String,
        icon_data_url: Option<String>,
    ) -> Result<Option<SavedConnection>, String> {
        let connection_id = required_field("connection id", connection_id)?;
        let icon_data_url = normalize_connection_icon_data_url(icon_data_url)?;
        let connection = self.lock()?;
        let existing = connection
            .query_row(
                "SELECT connection_type, icon_data_url FROM connections WHERE id = ?1",
                params![&connection_id],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?)),
            )
            .optional()
            .map_err(to_storage_error)?
            .ok_or_else(|| "connection was not found".to_string())?;
        let (connection_type, current_icon_data_url) = existing;
        if connection_type != "url" {
            return Err("connection icon updates only apply to URL connections".to_string());
        }
        if current_icon_data_url == icon_data_url {
            return Ok(None);
        }
        connection
            .execute(
                "UPDATE connections SET icon_data_url = ?1 WHERE id = ?2",
                params![icon_data_url, &connection_id],
            )
            .map_err(to_storage_error)?;
        get_connection_by_id(&connection, &connection_id).map(Some)
    }

    pub fn update_connection_icon_data_url(
        &self,
        connection_id: String,
        icon_data_url: Option<String>,
    ) -> Result<Option<SavedConnection>, String> {
        let connection_id = required_field("connection id", connection_id)?;
        let icon_data_url = normalize_connection_icon_data_url(icon_data_url)?;
        let connection = self.lock()?;
        let current_icon_data_url = connection
            .query_row(
                "SELECT icon_data_url FROM connections WHERE id = ?1",
                params![&connection_id],
                |row| row.get::<_, Option<String>>(0),
            )
            .optional()
            .map_err(to_storage_error)?
            .ok_or_else(|| "connection was not found".to_string())?;
        if current_icon_data_url == icon_data_url {
            return Ok(None);
        }
        connection
            .execute(
                "UPDATE connections SET icon_data_url = ?1 WHERE id = ?2",
                params![icon_data_url, &connection_id],
            )
            .map_err(to_storage_error)?;
        get_connection_by_id(&connection, &connection_id).map(Some)
    }

    pub fn update_connection_icon_background_color(
        &self,
        connection_id: String,
        icon_background_color: Option<String>,
    ) -> Result<Option<SavedConnection>, String> {
        let connection_id = required_field("connection id", connection_id)?;
        let icon_background_color =
            normalize_connection_icon_background_color(icon_background_color)?;
        let connection = self.lock()?;
        let current_icon_background_color = connection
            .query_row(
                "SELECT icon_background_color FROM connections WHERE id = ?1",
                params![&connection_id],
                |row| row.get::<_, Option<String>>(0),
            )
            .optional()
            .map_err(to_storage_error)?
            .ok_or_else(|| "connection was not found".to_string())?;
        if current_icon_background_color == icon_background_color {
            return Ok(None);
        }
        connection
            .execute(
                "UPDATE connections SET icon_background_color = ?1 WHERE id = ?2",
                params![icon_background_color, &connection_id],
            )
            .map_err(to_storage_error)?;
        get_connection_by_id(&connection, &connection_id).map(Some)
    }

    pub fn update_connection_terminal_appearance(
        &self,
        connection_id: String,
        terminal_opacity: Option<u8>,
        terminal_background: Option<crate::dashboard_storage::DashboardBackground>,
    ) -> Result<Option<SavedConnection>, String> {
        let connection_id = required_field("connection id", connection_id)?;
        let terminal_opacity = normalize_terminal_opacity(terminal_opacity)?;
        let terminal_background_json = terminal_background_to_json(&terminal_background)?;
        let connection = self.lock()?;
        let current = connection
            .query_row(
                "SELECT terminal_opacity, terminal_background_json FROM connections WHERE id = ?1",
                params![&connection_id],
                |row| {
                    Ok((
                        row.get::<_, Option<i64>>(0)?,
                        row.get::<_, Option<String>>(1)?,
                    ))
                },
            )
            .optional()
            .map_err(to_storage_error)?
            .ok_or_else(|| "connection was not found".to_string())?;
        if normalize_loaded_terminal_opacity(current.0) == Some(terminal_opacity)
            && current.1 == terminal_background_json
        {
            return Ok(None);
        }
        connection
            .execute(
                "UPDATE connections SET terminal_opacity = ?1, terminal_background_json = ?2 WHERE id = ?3",
                params![i64::from(terminal_opacity), terminal_background_json, &connection_id],
            )
            .map_err(to_storage_error)?;
        get_connection_by_id(&connection, &connection_id).map(Some)
    }

    pub fn update_connection_tab_title(
        &self,
        connection_id: String,
        tab_title: Option<String>,
    ) -> Result<Option<SavedConnection>, String> {
        let connection_id = required_field("connection id", connection_id)?;
        let tab_title = normalize_optional_text(tab_title);
        let connection = self.lock()?;
        let current_tab_title = connection
            .query_row(
                "SELECT tab_title FROM connections WHERE id = ?1",
                params![&connection_id],
                |row| row.get::<_, Option<String>>(0),
            )
            .optional()
            .map_err(to_storage_error)?
            .ok_or_else(|| "connection was not found".to_string())?;
        if current_tab_title == tab_title {
            return Ok(None);
        }
        connection
            .execute(
                "UPDATE connections SET tab_title = ?1 WHERE id = ?2",
                params![tab_title, &connection_id],
            )
            .map_err(to_storage_error)?;
        get_connection_by_id(&connection, &connection_id).map(Some)
    }

    pub fn upsert_url_credential(
        &self,
        request: UpsertUrlCredentialRequest,
    ) -> Result<SavedConnection, String> {
        let connection_id = required_field("connection id", request.connection_id)?;
        let username = required_field("URL credential username", request.username)?;
        let page_url = normalize_optional_text(request.page_url);
        let username_selector = normalize_optional_text(request.username_selector);
        let password_selector = normalize_optional_text(request.password_selector);
        let field_values = normalize_optional_text(request.field_values);
        let connection = self.lock()?;
        let connection_type = connection
            .query_row(
                "SELECT connection_type FROM connections WHERE id = ?1",
                params![&connection_id],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(to_storage_error)?
            .ok_or_else(|| "connection was not found".to_string())?;
        if connection_type != "url" {
            return Err("URL credentials can only be stored for URL connections".to_string());
        }

        connection
            .execute(
                "INSERT INTO url_credentials (connection_id, username, page_url, username_selector, password_selector, field_values, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP)
                 ON CONFLICT(connection_id) DO UPDATE SET
                    username = excluded.username,
                    page_url = excluded.page_url,
                    username_selector = excluded.username_selector,
                    password_selector = excluded.password_selector,
                    field_values = excluded.field_values,
                    updated_at = CURRENT_TIMESTAMP",
                params![&connection_id, &username, page_url, username_selector, password_selector, field_values],
            )
            .map_err(to_storage_error)?;

        get_connection_by_id(&connection, &connection_id)
    }

    pub(crate) fn url_credential_fill(
        &self,
        connection_id: &str,
    ) -> Result<Option<UrlCredentialFill>, String> {
        let connection = self.lock()?;
        connection
            .query_row(
                "SELECT username, username_selector, password_selector, field_values FROM url_credentials WHERE connection_id = ?1",
                params![connection_id],
                |row| {
                    Ok(UrlCredentialFill {
                        username: row.get(0)?,
                        username_selector: row.get(1)?,
                        password_selector: row.get(2)?,
                        field_values: row.get(3)?,
                    })
                },
            )
            .optional()
            .map_err(to_storage_error)
    }

    pub fn list_url_credentials(&self) -> Result<Vec<UrlCredentialSummary>, String> {
        let connection = self.lock()?;
        let mut statement = connection
            .prepare(
                "SELECT connections.id, connections.name, connections.url, url_credentials.page_url, url_credentials.username,
                        url_credentials.username_selector, url_credentials.password_selector, url_credentials.field_values, url_credentials.updated_at
                 FROM url_credentials
                 INNER JOIN connections ON connections.id = url_credentials.connection_id
                 ORDER BY lower(connections.name), lower(url_credentials.username)",
            )
            .map_err(to_storage_error)?;
        let rows = statement
            .query_map([], |row| {
                Ok(UrlCredentialSummary {
                    connection_id: row.get(0)?,
                    connection_name: row.get(1)?,
                    url: row.get(2)?,
                    page_url: row.get(3)?,
                    username: row.get(4)?,
                    username_selector: row.get(5)?,
                    password_selector: row.get(6)?,
                    field_values: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            })
            .map_err(to_storage_error)?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(to_storage_error)
    }

    pub fn delete_url_credential(&self, connection_id: String) -> Result<(), String> {
        let connection_id = required_field("connection id", connection_id)?;
        let connection = self.lock()?;
        connection
            .execute(
                "DELETE FROM url_credentials WHERE connection_id = ?1",
                params![connection_id],
            )
            .map_err(to_storage_error)?;
        Ok(())
    }

    pub fn list_url_data_partitions(&self) -> Result<Vec<UrlDataPartitionSummary>, String> {
        let connection = self.lock()?;
        let mut statement = connection
            .prepare(
                "SELECT data_partition, COUNT(*)
                 FROM connections
                 WHERE connection_type = 'url' AND data_partition IS NOT NULL AND trim(data_partition) <> ''
                 GROUP BY data_partition
                 ORDER BY lower(data_partition)",
            )
            .map_err(to_storage_error)?;
        let rows = statement
            .query_map([], |row| {
                Ok(UrlDataPartitionSummary {
                    name: row.get(0)?,
                    connection_count: row.get::<_, i64>(1)?.max(0) as u32,
                })
            })
            .map_err(to_storage_error)?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(to_storage_error)
    }

    pub fn list_stored_credential_candidates(
        &self,
    ) -> Result<Vec<StoredCredentialCandidate>, String> {
        self.with_connection(list_stored_credential_candidates)
    }

    pub fn list_connection_password_credentials(
        &self,
    ) -> Result<Vec<ConnectionPasswordCredentialSummary>, String> {
        self.with_connection(list_connection_password_credentials)
    }

    pub fn create_connection_password_credential_metadata(
        &self,
        connection_id: String,
    ) -> Result<ConnectionPasswordCredentialSummary, String> {
        let connection_id = required_field("connection id", connection_id)?;
        self.with_connection(|connection| {
            let (connection_type, host, username) = connection
                .query_row(
                    "SELECT connection_type, host, username FROM connections WHERE id = ?1",
                    params![&connection_id],
                    |row| {
                        Ok((
                            row.get::<_, String>(0)?,
                            row.get::<_, String>(1)?,
                            row.get::<_, String>(2)?,
                        ))
                    },
                )
                .optional()
                .map_err(to_storage_error)?
                .ok_or_else(|| "connection was not found".to_string())?;
            ensure_connection_password_type(&connection_type)?;
            let host = required_field("host", host)?;
            let username = username.trim().to_string();
            let existing_count = connection_password_credential_existing_count(
                connection,
                &connection_id,
                &connection_type,
                &host,
            )?;
            let label = connection_password_credential_label(&username, &host, existing_count + 1);
            let id = make_connection_password_credential_id();
            connection
                .execute(
                    "INSERT INTO connection_password_credentials
                        (id, connection_type, host, username, label, created_from_connection_id)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![
                        &id,
                        &connection_type,
                        &host,
                        &username,
                        &label,
                        &connection_id
                    ],
                )
                .map_err(to_storage_error)?;
            get_connection_password_credential_by_id(connection, &id)
        })
    }

    pub fn assign_connection_password_credential(
        &self,
        connection_id: String,
        credential_id: String,
    ) -> Result<SavedConnection, String> {
        let connection_id = required_field("connection id", connection_id)?;
        let credential_id = required_field("password credential id", credential_id)?;
        self.with_connection(|connection| {
            let connection_type = connection
                .query_row(
                    "SELECT connection_type FROM connections WHERE id = ?1",
                    params![&connection_id],
                    |row| row.get::<_, String>(0),
                )
                .optional()
                .map_err(to_storage_error)?
                .ok_or_else(|| "connection was not found".to_string())?;
            ensure_connection_password_type(&connection_type)?;
            if let Some(credential_type) = connection
                .query_row(
                    "SELECT connection_type FROM connection_password_credentials WHERE id = ?1",
                    params![&credential_id],
                    |row| row.get::<_, String>(0),
                )
                .optional()
                .map_err(to_storage_error)?
            {
                if credential_type != connection_type {
                    return Err(
                        "password credential type must match the connection type".to_string()
                    );
                }
            } else {
                let legacy_type = connection
                    .query_row(
                        "SELECT connection_type FROM connections WHERE id = ?1",
                        params![&credential_id],
                        |row| row.get::<_, String>(0),
                    )
                    .optional()
                    .map_err(to_storage_error)?
                    .ok_or_else(|| "password credential was not found".to_string())?;
                if legacy_type != connection_type {
                    return Err(
                        "password credential type must match the connection type".to_string()
                    );
                }
            }
            connection
                .execute(
                    "UPDATE connections SET password_credential_id = ?1 WHERE id = ?2",
                    params![&credential_id, &connection_id],
                )
                .map_err(to_storage_error)?;
            get_connection_by_id(connection, &connection_id)
        })
    }

    pub fn delete_connection_password_credential_metadata(
        &self,
        credential_id: String,
    ) -> Result<(), String> {
        let credential_id = required_field("password credential id", credential_id)?;
        self.with_connection(|connection| {
            connection
                .execute(
                    "UPDATE connections SET password_credential_id = NULL WHERE password_credential_id = ?1",
                    params![&credential_id],
                )
                .map_err(to_storage_error)?;
            connection
                .execute(
                    "DELETE FROM connection_password_credentials WHERE id = ?1",
                    params![&credential_id],
                )
                .map_err(to_storage_error)?;
            Ok(())
        })
    }

    pub fn list_assistant_chat_threads(&self) -> Result<Vec<AssistantChatThreadRecord>, String> {
        let connection = self.lock()?;
        let mut statement = connection
            .prepare(
                "SELECT id, title, context_label, messages_json, created_at, updated_at
                 FROM assistant_chat_threads
                 ORDER BY updated_at DESC, created_at DESC",
            )
            .map_err(to_storage_error)?;
        let rows = statement
            .query_map([], assistant_chat_thread_from_row)
            .map_err(to_storage_error)?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(to_storage_error)
    }

    pub fn upsert_assistant_chat_thread(
        &self,
        request: AssistantChatThreadRecord,
    ) -> Result<AssistantChatThreadRecord, String> {
        let thread = validate_assistant_chat_thread(request)?;
        let connection = self.lock()?;
        connection
            .execute(
                "INSERT INTO assistant_chat_threads
                    (id, title, context_label, messages_json, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                 ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    context_label = excluded.context_label,
                    messages_json = excluded.messages_json,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at",
                params![
                    &thread.id,
                    &thread.title,
                    &thread.context_label,
                    &thread.messages_json,
                    &thread.created_at,
                    &thread.updated_at,
                ],
            )
            .map_err(to_storage_error)?;
        Ok(thread)
    }

    pub fn delete_assistant_chat_thread(&self, thread_id: String) -> Result<(), String> {
        let thread_id = required_field("assistant chat thread id", thread_id)?;
        let connection = self.lock()?;
        connection
            .execute(
                "DELETE FROM assistant_chat_threads WHERE id = ?1",
                params![thread_id],
            )
            .map_err(to_storage_error)?;
        Ok(())
    }

    /// List assistant memories for the given scopes, newest first. Callers pass
    /// "global" plus the active "connection:<id>" scope so the assistant only
    /// recalls notes relevant to where the user is working.
    pub fn list_assistant_memories(
        &self,
        scopes: &[String],
    ) -> Result<Vec<AssistantMemoryRecord>, String> {
        if scopes.is_empty() {
            return Ok(Vec::new());
        }
        let connection = self.lock()?;
        let placeholders = vec!["?"; scopes.len()].join(", ");
        let mut statement = connection
            .prepare(&format!(
                "SELECT id, scope, content, created_at, updated_at
                 FROM assistant_memories
                 WHERE scope IN ({placeholders})
                 ORDER BY updated_at DESC, created_at DESC"
            ))
            .map_err(to_storage_error)?;
        let params = rusqlite::params_from_iter(scopes.iter());
        let rows = statement
            .query_map(params, assistant_memory_from_row)
            .map_err(to_storage_error)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(to_storage_error)
    }

    pub fn upsert_assistant_memory(
        &self,
        record: AssistantMemoryRecord,
    ) -> Result<AssistantMemoryRecord, String> {
        let memory = validate_assistant_memory(record)?;
        let connection = self.lock()?;
        connection
            .execute(
                "INSERT INTO assistant_memories
                    (id, scope, content, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)
                 ON CONFLICT(id) DO UPDATE SET
                    scope = excluded.scope,
                    content = excluded.content,
                    updated_at = excluded.updated_at",
                params![
                    &memory.id,
                    &memory.scope,
                    &memory.content,
                    &memory.created_at,
                    &memory.updated_at,
                ],
            )
            .map_err(to_storage_error)?;
        Ok(memory)
    }

    pub fn delete_assistant_memory(&self, id: String) -> Result<bool, String> {
        let id = required_field("assistant memory id", id)?;
        let connection = self.lock()?;
        let affected = connection
            .execute("DELETE FROM assistant_memories WHERE id = ?1", params![id])
            .map_err(to_storage_error)?;
        Ok(affected > 0)
    }

    pub fn clear_widget_secret_reference(
        &self,
        instance_id: String,
        key: String,
    ) -> Result<(), String> {
        let instance_id = required_field("widget instance id", instance_id)?;
        let key = required_field("widget secret key", key)?;
        self.with_connection(|connection| {
            let values_json: String = connection
                .query_row(
                    "SELECT settings_values_json FROM dashboard_widget_instances WHERE id = ?1",
                    params![&instance_id],
                    |row| row.get(0),
                )
                .optional()
                .map_err(to_storage_error)?
                .ok_or_else(|| "Dashboard widget instance was not found".to_string())?;
            let mut values: serde_json::Value = serde_json::from_str(&values_json)
                .map_err(|error| format!("failed to parse widget settings values: {error}"))?;
            if let Some(object) = values.as_object_mut() {
                object.insert(key, serde_json::Value::Null);
            }
            let next = serde_json::to_string(&values)
                .map_err(|error| format!("failed to serialize widget settings values: {error}"))?;
            connection
                .execute(
                    "UPDATE dashboard_widget_instances SET settings_values_json = ?1 WHERE id = ?2",
                    params![next, instance_id],
                )
                .map_err(to_storage_error)?;
            Ok(())
        })
    }

    pub fn clear_url_data_partition(&self, name: String) -> Result<(), String> {
        let name = required_field("URL data shard", name)?;
        let connection = self.lock()?;
        connection
            .execute(
                "UPDATE connections SET data_partition = NULL WHERE connection_type = 'url' AND data_partition = ?1",
                params![name],
            )
            .map_err(to_storage_error)?;
        Ok(())
    }

    pub fn create_connection_folder(
        &self,
        request: CreateConnectionFolderRequest,
    ) -> Result<ConnectionFolder, String> {
        let name = required_field("folder name", request.name)?;
        let parent_folder_id = normalize_optional_id(request.parent_folder_id);
        let id = make_folder_id(&name);
        let connection = self.lock()?;
        if let Some(parent_folder_id) = parent_folder_id.as_deref() {
            ensure_folder_exists(
                &connection,
                parent_folder_id,
                folder_name_for(parent_folder_id),
            )?;
        }
        // Sub-folders inherit their parent's Workspace; root folders use the
        // requested (active) Workspace, defaulting to Default.
        let workspace_id = match parent_folder_id.as_deref() {
            Some(parent_folder_id) => folder_workspace_id(&connection, parent_folder_id)?,
            None => normalize_workspace_id(request.workspace_id.unwrap_or_default()),
        };
        let next_sort_order = match parent_folder_id.as_deref() {
            Some(parent_folder_id) => next_folder_sort_order(&connection, Some(parent_folder_id))?,
            None => next_root_folder_sort_order_for_workspace(&connection, &workspace_id)?,
        };

        connection
            .execute(
                "INSERT INTO connection_folders (id, name, parent_folder_id, sort_order, workspace_id) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![id, name, parent_folder_id, next_sort_order, workspace_id],
            )
            .map_err(to_storage_error)?;

        Ok(ConnectionFolder {
            id,
            name,
            connections: Vec::new(),
            folders: Vec::new(),
        })
    }

    pub fn rename_connection_folder(
        &self,
        request: RenameConnectionFolderRequest,
    ) -> Result<ConnectionFolder, String> {
        let id = required_field("folder id", request.id)?;
        let name = required_field("folder name", request.name)?;
        let connection = self.lock()?;
        let affected = connection
            .execute(
                "UPDATE connection_folders SET name = ?1 WHERE id = ?2",
                params![name, id],
            )
            .map_err(to_storage_error)?;

        if affected == 0 {
            return Err("connection folder was not found".to_string());
        }

        get_folder_by_id(&connection, &id, name)
    }

    pub fn delete_connection_folder(&self, folder_id: String) -> Result<(), String> {
        let folder_id = required_field("folder id", folder_id)?;
        let connection = self.lock()?;
        let affected = connection
            .execute(
                "DELETE FROM connection_folders WHERE id = ?1",
                params![folder_id],
            )
            .map_err(to_storage_error)?;

        if affected == 0 {
            return Err("connection folder was not found".to_string());
        }

        Ok(())
    }

    pub fn rename_connection(
        &self,
        request: RenameConnectionRequest,
    ) -> Result<SavedConnection, String> {
        let id = required_field("connection id", request.id)?;
        let name = required_field("name", request.name)?;
        let connection = self.lock()?;
        let affected = connection
            .execute(
                "UPDATE connections SET name = ?1 WHERE id = ?2",
                params![name, id],
            )
            .map_err(to_storage_error)?;

        if affected == 0 {
            return Err("connection was not found".to_string());
        }

        get_connection_by_id(&connection, &id)
    }

    pub fn delete_connection(&self, connection_id: String) -> Result<(), String> {
        let connection_id = required_field("connection id", connection_id)?;
        let connection = self.lock()?;
        let affected = connection
            .execute(
                "DELETE FROM connections WHERE id = ?1",
                params![connection_id],
            )
            .map_err(to_storage_error)?;

        if affected == 0 {
            return Err("connection was not found".to_string());
        }

        Ok(())
    }

    pub fn duplicate_connection(
        &self,
        request: DuplicateConnectionRequest,
    ) -> Result<SavedConnection, String> {
        let source_id = required_field("connection id", request.id)?;
        let mut connection = self.lock()?;
        let transaction = connection.transaction().map_err(to_storage_error)?;

        let source = transaction
            .query_row(
                "SELECT folder_id, name, tab_title, host, username, port, key_path, proxy_jump, auth_method, local_shell, local_startup_directory, local_startup_script, url, data_partition, use_tmux_sessions, serial_line, serial_speed, connection_type, icon_data_url, icon_background_color, terminal_opacity, terminal_background_json, workspace_id
                 FROM connections
                 WHERE id = ?1",
                params![source_id],
                |row| {
                    Ok((
                        row.get::<_, Option<String>>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, Option<String>>(2)?,
                        row.get::<_, String>(3)?,
                        row.get::<_, String>(4)?,
                        optional_port(row.get::<_, Option<i64>>(5)?)?,
                        row.get::<_, Option<String>>(6)?,
                        row.get::<_, Option<String>>(7)?,
                        row.get::<_, String>(8)?,
                        row.get::<_, Option<String>>(9)?,
                        row.get::<_, Option<String>>(10)?,
                        row.get::<_, Option<String>>(11)?,
                        row.get::<_, Option<String>>(12)?,
                        row.get::<_, Option<String>>(13)?,
                        row.get::<_, bool>(14)?,
                        row.get::<_, Option<String>>(15)?,
                        optional_serial_speed(row.get::<_, Option<i64>>(16)?)?,
                        row.get::<_, String>(17)?,
                        row.get::<_, Option<String>>(18)?,
                        row.get::<_, Option<String>>(19)?,
                        normalize_loaded_terminal_opacity(row.get::<_, Option<i64>>(20)?),
                        terminal_background_from_json(row.get::<_, Option<String>>(21)?),
                        row.get::<_, Option<String>>(22)?,
                    ))
                },
            )
            .optional()
            .map_err(to_storage_error)?
            .ok_or_else(|| "connection was not found".to_string())?;
        let (
            folder_id,
            source_name,
            tab_title,
            host,
            user,
            port,
            key_path,
            proxy_jump,
            auth_method,
            local_shell,
            local_startup_directory,
            local_startup_script,
            url,
            data_partition,
            use_tmux_sessions,
            serial_line,
            serial_speed,
            connection_type,
            icon_data_url,
            icon_background_color,
            terminal_opacity,
            terminal_background,
            workspace_id,
        ) = source;
        let workspace_id = normalize_workspace_id(workspace_id.unwrap_or_default());
        let duplicate_name = request
            .name
            .map(|name| name.trim().to_string())
            .filter(|name| !name.is_empty())
            .unwrap_or_else(|| format!("Copy of {source_name}"));
        let duplicate_id = make_connection_id(&duplicate_name);
        let tmux_connection_id = if use_tmux_sessions && connection_type == "ssh" {
            Some(make_tmux_connection_id(&duplicate_id))
        } else {
            None
        };
        let next_sort_order = match folder_id.as_deref() {
            Some(folder_id) => next_connection_sort_order(&transaction, Some(folder_id))?,
            None => next_root_connection_sort_order_for_workspace(&transaction, &workspace_id)?,
        };

        transaction
            .execute(
                "INSERT INTO connections (
                    id, folder_id, name, tab_title, host, username, port, key_path, proxy_jump, auth_method, local_shell, local_startup_directory, local_startup_script, url, data_partition, use_tmux_sessions, tmux_connection_id, serial_line, serial_speed, connection_type, icon_data_url, icon_background_color, terminal_opacity, terminal_background_json, status, sort_order, workspace_id
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, 'idle', ?25, ?26)",
                params![
                    duplicate_id,
                    folder_id,
                    duplicate_name,
                    tab_title,
                    host,
                    user,
                    port,
                    key_path,
                    proxy_jump,
                    auth_method,
                    local_shell,
                    local_startup_directory,
                    local_startup_script,
                    url,
                    data_partition,
                    use_tmux_sessions,
                    tmux_connection_id,
                    serial_line,
                    serial_speed,
                    connection_type,
                    icon_data_url,
                    icon_background_color,
                    terminal_opacity.map(i64::from),
                    terminal_background_to_json(&terminal_background)?,
                    next_sort_order,
                    workspace_id
                ],
            )
            .map_err(to_storage_error)?;

        transaction.commit().map_err(to_storage_error)?;
        get_connection_by_id(&connection, &duplicate_id)
    }

    pub fn move_connection_folder(
        &self,
        request: MoveConnectionFolderRequest,
    ) -> Result<ConnectionTree, String> {
        let id = required_field("folder id", request.id)?;
        let target_parent_folder_id = normalize_optional_id(request.parent_folder_id);
        if target_parent_folder_id.as_deref() == Some(id.as_str()) {
            return Err("a folder cannot be moved into itself".to_string());
        }
        let mut connection = self.lock()?;
        let transaction = connection.transaction().map_err(to_storage_error)?;
        let source_parent_folder_id = folder_parent_id(&transaction, &id)?
            .ok_or_else(|| "connection folder was not found".to_string())?;
        let source_workspace_id = folder_workspace_id(&transaction, &id)?;
        if let Some(parent_id) = target_parent_folder_id.as_deref() {
            ensure_folder_exists(&transaction, parent_id, folder_name_for(parent_id))?;
            if folder_has_descendant(&transaction, &id, parent_id)? {
                return Err("a folder cannot be moved into one of its subfolders".to_string());
            }
        }

        let target_index = if source_parent_folder_id == target_parent_folder_id {
            let folder_ids = match source_parent_folder_id.as_deref() {
                Some(parent_id) => list_folder_ids_for_parent(&transaction, Some(parent_id))?,
                None => list_root_folder_ids_for_workspace(&transaction, &source_workspace_id)?,
            };
            match folder_ids.iter().position(|folder_id| folder_id == &id) {
                Some(current_index) if current_index < request.target_index => {
                    request.target_index.saturating_sub(1)
                }
                _ => request.target_index,
            }
        } else {
            request.target_index
        };

        // A folder follows its target parent's Workspace; moving to root keeps
        // its current Workspace.
        let parent_workspace_id = match target_parent_folder_id.as_deref() {
            Some(target_parent_folder_id) => {
                Some(folder_workspace_id(&transaction, target_parent_folder_id)?)
            }
            None => None,
        };
        transaction
            .execute(
                "UPDATE connection_folders SET parent_folder_id = ?1 WHERE id = ?2",
                params![target_parent_folder_id, id],
            )
            .map_err(to_storage_error)?;
        if let Some(parent_workspace_id) = parent_workspace_id.as_deref() {
            transaction
                .execute(
                    "UPDATE connection_folders SET workspace_id = ?1 WHERE id = ?2",
                    params![parent_workspace_id, id],
                )
                .map_err(to_storage_error)?;
        }
        let scoped_workspace_id = folder_workspace_id(&transaction, &id)?;
        match source_parent_folder_id.as_deref() {
            Some(parent_id) => reorder_folder_ids(&transaction, Some(parent_id), None)?,
            None => {
                reorder_root_folder_ids_for_workspace(&transaction, &source_workspace_id, None)?
            }
        }
        match target_parent_folder_id.as_deref() {
            Some(parent_id) => {
                reorder_folder_ids(&transaction, Some(parent_id), Some((&id, target_index)))?
            }
            None => reorder_root_folder_ids_for_workspace(
                &transaction,
                &scoped_workspace_id,
                Some((&id, target_index)),
            )?,
        }
        transaction.commit().map_err(to_storage_error)?;
        drop(connection);
        self.list_connection_tree_for_workspace(scoped_workspace_id)
    }

    pub fn move_connection(
        &self,
        request: MoveConnectionRequest,
    ) -> Result<ConnectionTree, String> {
        let id = required_field("connection id", request.id)?;
        let target_folder_id = normalize_optional_id(request.folder_id);
        let mut connection = self.lock()?;
        let transaction = connection.transaction().map_err(to_storage_error)?;

        let source_folder_id = transaction
            .query_row(
                "SELECT folder_id FROM connections WHERE id = ?1",
                params![id],
                |row| row.get::<_, Option<String>>(0),
            )
            .optional()
            .map_err(to_storage_error)?
            .ok_or_else(|| "connection was not found".to_string())?;
        let source_workspace_id = connection_workspace_id(&transaction, &id)?;

        let target_index = if source_folder_id == target_folder_id {
            let connection_ids = match source_folder_id.as_deref() {
                Some(folder_id) => list_connection_ids_for_folder(&transaction, Some(folder_id))?,
                None => list_root_connection_ids_for_workspace(&transaction, &source_workspace_id)?,
            };
            match connection_ids
                .iter()
                .position(|connection_id| connection_id == &id)
            {
                Some(current_index) if current_index < request.target_index => {
                    request.target_index.saturating_sub(1)
                }
                _ => request.target_index,
            }
        } else {
            request.target_index
        };

        if let Some(target_folder_id) = target_folder_id.as_deref() {
            ensure_folder_exists(
                &transaction,
                target_folder_id,
                folder_name_for(target_folder_id),
            )?;
        }

        // A Connection follows its target folder's Workspace; moving to root
        // keeps its current Workspace.
        let workspace_id = match target_folder_id.as_deref() {
            Some(target_folder_id) => Some(folder_workspace_id(&transaction, target_folder_id)?),
            None => None,
        };
        transaction
            .execute(
                "UPDATE connections SET folder_id = ?1 WHERE id = ?2",
                params![target_folder_id, id],
            )
            .map_err(to_storage_error)?;
        if let Some(workspace_id) = workspace_id.as_deref() {
            transaction
                .execute(
                    "UPDATE connections SET workspace_id = ?1 WHERE id = ?2",
                    params![workspace_id, id],
                )
                .map_err(to_storage_error)?;
        }

        let scoped_workspace_id = connection_workspace_id(&transaction, &id)?;
        match source_folder_id.as_deref() {
            Some(folder_id) => reorder_connection_ids(&transaction, Some(folder_id), None)?,
            None => {
                reorder_root_connection_ids_for_workspace(&transaction, &source_workspace_id, None)?
            }
        }
        match target_folder_id.as_deref() {
            Some(folder_id) => {
                reorder_connection_ids(&transaction, Some(folder_id), Some((&id, target_index)))?
            }
            None => reorder_root_connection_ids_for_workspace(
                &transaction,
                &scoped_workspace_id,
                Some((&id, target_index)),
            )?,
        }
        transaction.commit().map_err(to_storage_error)?;
        drop(connection);
        self.list_connection_tree_for_workspace(scoped_workspace_id)
    }
}

impl Storage {
    pub fn list_workspaces(&self) -> Result<Vec<Workspace>, String> {
        let connection = self.lock()?;
        let mut statement = connection
            .prepare(
                "SELECT id, name, icon, is_default, sort_order
                 FROM workspaces
                 ORDER BY sort_order, name",
            )
            .map_err(to_storage_error)?;
        let workspaces = statement
            .query_map([], |row| {
                Ok(Workspace {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    icon: row.get(2)?,
                    is_default: row.get::<_, i64>(3)? != 0,
                    sort_order: row.get(4)?,
                })
            })
            .map_err(to_storage_error)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(to_storage_error)?;
        Ok(workspaces)
    }

    pub fn create_workspace(
        &self,
        request: CreateWorkspaceRequest,
    ) -> Result<Workspace, String> {
        let name = required_field("workspace name", request.name)?;
        let icon = request
            .icon
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty());
        let id = make_workspace_id(&name);
        let mut connection = self.lock()?;
        let transaction = connection.transaction().map_err(to_storage_error)?;

        let next_sort_order: i64 = transaction
            .query_row(
                "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM workspaces",
                [],
                |row| row.get(0),
            )
            .map_err(to_storage_error)?;
        transaction
            .execute(
                "INSERT INTO workspaces (id, name, icon, is_default, sort_order)
                 VALUES (?1, ?2, ?3, 0, ?4)",
                params![id, name, icon, next_sort_order],
            )
            .map_err(to_storage_error)?;

        // Copy-import: clone the selected Connections (by id, from any source
        // Workspace) into the new Workspace at root. Imported rows are
        // independent copies that keep the shared, non-secret
        // `password_credential_id` reference.
        if let Some(connection_ids) = request.import_connection_ids.as_ref() {
            for source_id in connection_ids {
                let new_id = make_connection_id(source_id);
                let tmux_connection_id = make_tmux_connection_id(&new_id);
                let next_connection_sort_order =
                    next_root_connection_sort_order_for_workspace(&transaction, &id)?;
                transaction
                    .execute(
                        "INSERT INTO connections (
                            id, folder_id, workspace_id, name, tab_title, host, username, port,
                            key_path, proxy_jump, auth_method, local_shell, local_startup_directory,
                            local_startup_script, url, data_partition, use_tmux_sessions,
                            tmux_connection_id, serial_line, serial_speed, rdp_options, vnc_options,
                            ftp_options, password_credential_id, icon_data_url, icon_background_color,
                            terminal_opacity, terminal_background_json, connection_type, status, sort_order
                        )
                        SELECT
                            ?1, NULL, ?2, name, tab_title, host, username, port,
                            key_path, proxy_jump, auth_method, local_shell, local_startup_directory,
                            local_startup_script, url, data_partition, use_tmux_sessions,
                            ?3, serial_line, serial_speed, rdp_options, vnc_options,
                            ftp_options, password_credential_id, icon_data_url, icon_background_color,
                            terminal_opacity, terminal_background_json, connection_type, 'idle', ?4
                        FROM connections
                        WHERE id = ?5",
                        params![
                            new_id,
                            id,
                            tmux_connection_id,
                            next_connection_sort_order,
                            source_id
                        ],
                    )
                    .map_err(to_storage_error)?;
            }
        }

        transaction.commit().map_err(to_storage_error)?;
        Ok(Workspace {
            id,
            name,
            icon,
            is_default: false,
            sort_order: next_sort_order,
        })
    }

    pub fn rename_workspace(
        &self,
        request: RenameWorkspaceRequest,
    ) -> Result<Workspace, String> {
        let id = required_field("workspace id", request.id)?;
        let name = required_field("workspace name", request.name)?;
        let connection = self.lock()?;
        let updated = connection
            .execute(
                "UPDATE workspaces SET name = ?1 WHERE id = ?2",
                params![name, id],
            )
            .map_err(to_storage_error)?;
        if updated == 0 {
            return Err("workspace was not found".to_string());
        }
        let (icon, is_default, sort_order) = connection
            .query_row(
                "SELECT icon, is_default, sort_order FROM workspaces WHERE id = ?1",
                params![id],
                |row| {
                    Ok((
                        row.get::<_, Option<String>>(0)?,
                        row.get::<_, i64>(1)? != 0,
                        row.get::<_, i64>(2)?,
                    ))
                },
            )
            .map_err(to_storage_error)?;
        Ok(Workspace {
            id,
            name,
            icon,
            is_default,
            sort_order,
        })
    }

    pub fn delete_workspace(&self, id: String) -> Result<(), String> {
        let id = required_field("workspace id", id)?;
        let connection = self.lock()?;
        let is_default: Option<bool> = connection
            .query_row(
                "SELECT is_default FROM workspaces WHERE id = ?1",
                params![id],
                |row| Ok(row.get::<_, i64>(0)? != 0),
            )
            .optional()
            .map_err(to_storage_error)?;
        match is_default {
            None => return Err("workspace was not found".to_string()),
            Some(true) => return Err("the Default Workspace cannot be deleted".to_string()),
            Some(false) => {}
        }
        // FK cascades delete this Workspace's Connections and folders.
        connection
            .execute("DELETE FROM workspaces WHERE id = ?1", params![id])
            .map_err(to_storage_error)?;
        Ok(())
    }

    pub fn reorder_workspaces(
        &self,
        request: ReorderWorkspacesRequest,
    ) -> Result<Vec<Workspace>, String> {
        let mut connection = self.lock()?;
        let transaction = connection.transaction().map_err(to_storage_error)?;
        for (index, workspace_id) in request.ordered_ids.iter().enumerate() {
            transaction
                .execute(
                    "UPDATE workspaces SET sort_order = ?1 WHERE id = ?2",
                    params![index as i64, workspace_id],
                )
                .map_err(to_storage_error)?;
        }
        transaction.commit().map_err(to_storage_error)?;
        drop(connection);
        self.list_workspaces()
    }
}
