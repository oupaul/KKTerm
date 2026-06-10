#[allow(unused_imports)]
use super::*;

impl OpenAiCompatibleProvider {
    pub(crate) fn api_style_for_settings(&self, api_mode: &str) -> OpenAiApiStyle {
        if self.provider_kind != "openai-compatible" {
            return self.default_api;
        }
        match api_mode {
            "responses" => OpenAiApiStyle::Responses,
            _ => OpenAiApiStyle::ChatCompletions,
        }
    }

    fn supports_explicit_strict_tool_schemas(&self) -> bool {
        matches!(self.provider_kind, "openai" | "azure-openai")
    }

    pub(crate) fn tool_definitions_for_provider(
        &self,
        tools: &[OpenAiToolDefinition],
    ) -> Vec<OpenAiToolDefinition> {
        let mut tools = tools.to_vec();
        if !self.supports_explicit_strict_tool_schemas() {
            for tool in &mut tools {
                tool.function.strict = false;
            }
        }
        tools
    }

    fn responses_tool_definitions_for_provider(
        &self,
        tools: &[OpenAiToolDefinition],
    ) -> Vec<Value> {
        let tools = self.tool_definitions_for_provider(tools);
        responses_tool_definitions(&tools)
    }

    pub(crate) async fn run_chat(
        &self,
        app: tauri::AppHandle,
        settings: AiProviderSettings,
        api_key: Option<String>,
        request: AgentRunRequest,
    ) -> Result<AgentRunResponse, String> {
        let prompt = trim_required("assistant prompt", request.prompt)?;
        let allowed_tools = request.allowed_tools.clone();
        let context_label = trim_required("assistant context", request.context_label)?;
        let skill_summaries = enabled_skill_summaries_for_request(
            &app,
            settings.disabled_skill_names(),
            settings.custom_skills_enabled(),
        )?;
        let endpoint =
            chat_completions_endpoint(settings.base_url(), settings.model(), self.endpoint_style)?;
        let mut messages = build_agent_messages(
            prompt,
            context_label,
            request.intent,
            settings.reasoning_effort().to_string(),
            request.system_context,
            request.selected_output,
            request.page_context,
            supports_image_input(self.provider_kind, settings.model()),
            request.screenshot,
            request.screenshots,
            request.messages,
            request.output_language,
            Some(settings.custom_instructions().to_string()),
            skill_summaries.clone(),
        );
        let client = ai_http_client(settings.allow_insecure_tls())?;
        let tool_definitions = agent_tool_definitions(
            request.allow_tools,
            &allowed_tools,
            settings.tools(),
            &skill_summaries,
        );
        let provider_tool_definitions = self.tool_definitions_for_provider(&tool_definitions);
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|error| format!("failed to locate KKTerm app data: {error}"))?;
        let mut content = String::new();
        let mut reasoning_content: Option<String> = None;
        let mut exhausted = true;

        for turn_index in 0..10 {
            let request_body = OpenAiCompatibleChatRequest {
                model: settings.model().to_string(),
                messages: messages.clone(),
                stream: false,
                tools: provider_tool_definitions.clone(),
                tool_choice: (!provider_tool_definitions.is_empty()).then(|| "auto".to_string()),
                thinking: deepseek_thinking(self.provider_kind, settings.reasoning_effort()),
            };
            log_provider_request(
                "chat_completions",
                self.provider_kind,
                settings.model(),
                turn_index + 1,
                &endpoint,
                &request_body,
            );
            let response = client
                .post(endpoint.clone())
                .headers(openai_compatible_headers(
                    api_key.as_deref(),
                    self.auth_style,
                    extra_headers_for_provider(self.provider_kind, &settings),
                )?)
                .json(&request_body)
                .send()
                .await
                .map_err(|error| format!("failed to reach {}: {error}", self.label))?;

            let status = response.status();
            let response_text = response
                .text()
                .await
                .map_err(|error| format!("failed to read {} response: {error}", self.label))?;
            log_provider_response(
                "chat_completions",
                self.provider_kind,
                settings.model(),
                turn_index + 1,
                status.as_u16(),
                &response_text,
            );

            if !status.is_success() {
                return Err(format!(
                    "{} returned HTTP {}: {}",
                    self.label,
                    status.as_u16(),
                    truncate_error_body(&response_text)
                ));
            }

            let completion: OpenAiCompatibleChatResponse = serde_json::from_str(&response_text)
                .map_err(|error| format!("failed to parse {} response: {error}", self.label))?;
            let Some(choice) = completion.choices.into_iter().next() else {
                return Err(format!("{} response did not include a choice", self.label));
            };
            content = choice.message.content.trim().to_string();
            reasoning_content = chat_response_reasoning(&choice.message);
            if choice.message.tool_calls.is_empty() {
                exhausted = false;
                break;
            }

            let tool_calls = choice.message.tool_calls;
            messages.push(OpenAiCompatibleMessage {
                role: "assistant".to_string(),
                content: OpenAiCompatibleContent::Text(content.clone()),
                reasoning_content: reasoning_content.clone().filter(|r| !r.trim().is_empty()),
                tool_call_id: None,
                tool_calls: Some(
                    tool_calls
                        .iter()
                        .map(|tool_call| OpenAiAssistantToolCall {
                            id: tool_call.id.clone(),
                            tool_type: "function".to_string(),
                            function: OpenAiAssistantToolCallFunction {
                                name: tool_call.function.name.clone(),
                                arguments: tool_call.function.arguments.clone(),
                            },
                        })
                        .collect(),
                ),
            });
            for tool_call in tool_calls {
                let result = run_ai_tool(
                    &settings,
                    &app_data_dir,
                    &app,
                    &tool_call,
                    None,
                    &allowed_tools,
                )
                .await;
                messages.push(OpenAiCompatibleMessage {
                    role: "tool".to_string(),
                    content: OpenAiCompatibleContent::Text(result),
                    reasoning_content: None,
                    tool_call_id: Some(tool_call.id),
                    tool_calls: None,
                });
            }
        }

        if exhausted {
            let request_body = OpenAiCompatibleChatRequest {
                model: settings.model().to_string(),
                messages: messages.clone(),
                stream: false,
                tools: vec![],
                tool_choice: None,
                thinking: deepseek_thinking(self.provider_kind, settings.reasoning_effort()),
            };
            log_provider_request(
                "chat_completions",
                self.provider_kind,
                settings.model(),
                11,
                &endpoint,
                &request_body,
            );
            let response = client
                .post(endpoint.clone())
                .headers(openai_compatible_headers(
                    api_key.as_deref(),
                    self.auth_style,
                    extra_headers_for_provider(self.provider_kind, &settings),
                )?)
                .json(&request_body)
                .send()
                .await
                .map_err(|error| format!("failed to reach {}: {error}", self.label))?;

            let status = response.status();
            let response_text = response
                .text()
                .await
                .map_err(|error| format!("failed to read {} response: {error}", self.label))?;
            log_provider_response(
                "chat_completions",
                self.provider_kind,
                settings.model(),
                11,
                status.as_u16(),
                &response_text,
            );

            if !status.is_success() {
                return Err(format!(
                    "{} returned HTTP {}: {}",
                    self.label,
                    status.as_u16(),
                    truncate_error_body(&response_text)
                ));
            }

            let completion: OpenAiCompatibleChatResponse = serde_json::from_str(&response_text)
                .map_err(|error| format!("failed to parse {} response: {error}", self.label))?;
            let Some(choice) = completion.choices.into_iter().next() else {
                return Err(format!("{} response did not include a choice", self.label));
            };
            content = choice.message.content.trim().to_string();
            reasoning_content = chat_response_reasoning(&choice.message);
        }

        finish_agent_response(self, settings.model(), content, reasoning_content)
    }

    pub(crate) async fn run_responses(
        &self,
        app: tauri::AppHandle,
        settings: AiProviderSettings,
        api_key: Option<String>,
        request: AgentRunRequest,
    ) -> Result<AgentRunResponse, String> {
        let prompt = trim_required("assistant prompt", request.prompt)?;
        let allowed_tools = request.allowed_tools.clone();
        let context_label = trim_required("assistant context", request.context_label)?;
        let skill_summaries = enabled_skill_summaries_for_request(
            &app,
            settings.disabled_skill_names(),
            settings.custom_skills_enabled(),
        )?;
        let endpoint = responses_endpoint(settings.base_url(), self.endpoint_style)?;
        let messages = build_agent_messages(
            prompt,
            context_label,
            request.intent,
            settings.reasoning_effort().to_string(),
            request.system_context,
            request.selected_output,
            request.page_context,
            supports_image_input(self.provider_kind, settings.model()),
            request.screenshot,
            request.screenshots,
            request.messages,
            request.output_language,
            Some(settings.custom_instructions().to_string()),
            skill_summaries.clone(),
        );
        let mut input = responses_input_from_messages(messages, request.files);
        let client = ai_http_client(settings.allow_insecure_tls())?;
        let tool_definitions = agent_tool_definitions(
            request.allow_tools,
            &allowed_tools,
            settings.tools(),
            &skill_summaries,
        );
        let provider_tool_definitions =
            self.responses_tool_definitions_for_provider(&tool_definitions);
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|error| format!("failed to locate KKTerm app data: {error}"))?;
        let mut content = String::new();
        let mut reasoning_content: Option<String> = None;
        let mut exhausted = true;

        for turn_index in 0..10 {
            let request_body = OpenAiResponsesRequest {
                model: settings.model().to_string(),
                input: input.clone(),
                stream: false,
                store: false,
                reasoning: openai_responses_reasoning(
                    self.provider_kind,
                    settings.model(),
                    settings.reasoning_effort(),
                ),
                tools: provider_tool_definitions.clone(),
                tool_choice: (!provider_tool_definitions.is_empty()).then(|| "auto".to_string()),
            };
            log_provider_request(
                "responses",
                self.provider_kind,
                settings.model(),
                turn_index + 1,
                &endpoint,
                &request_body,
            );
            let response = client
                .post(endpoint.clone())
                .headers(openai_compatible_headers(
                    api_key.as_deref(),
                    self.auth_style,
                    extra_headers_for_provider(self.provider_kind, &settings),
                )?)
                .json(&request_body)
                .send()
                .await
                .map_err(|error| format!("failed to reach {}: {error}", self.label))?;

            let status = response.status();
            let response_text = response
                .text()
                .await
                .map_err(|error| format!("failed to read {} response: {error}", self.label))?;
            log_provider_response(
                "responses",
                self.provider_kind,
                settings.model(),
                turn_index + 1,
                status.as_u16(),
                &response_text,
            );

            if !status.is_success() {
                return Err(format!(
                    "{} returned HTTP {}: {}",
                    self.label,
                    status.as_u16(),
                    truncate_error_body(&response_text)
                ));
            }

            let response_value: Value = serde_json::from_str(&response_text)
                .map_err(|error| format!("failed to parse {} response: {error}", self.label))?;
            if let Some(text) = response_value
                .get("output_text")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
            {
                content = text.to_string();
            } else if let Some(text) = extract_responses_output_text(&response_value) {
                content = text;
            }
            reasoning_content = extract_responses_reasoning_text(&response_value);

            let tool_calls = extract_responses_tool_calls(&response_value);
            if tool_calls.is_empty() {
                exhausted = false;
                break;
            }

            if let Some(output) = response_value.get("output").and_then(Value::as_array) {
                input.extend(output.iter().cloned());
            }
            for tool_call in tool_calls {
                let result = run_ai_tool(
                    &settings,
                    &app_data_dir,
                    &app,
                    &tool_call,
                    None,
                    &allowed_tools,
                )
                .await;
                input.push(json!({
                    "type": "function_call_output",
                    "call_id": tool_call.id,
                    "output": result,
                }));
            }
        }

        if exhausted {
            let request_body = OpenAiResponsesRequest {
                model: settings.model().to_string(),
                input: input.clone(),
                stream: false,
                store: false,
                reasoning: openai_responses_reasoning(
                    self.provider_kind,
                    settings.model(),
                    settings.reasoning_effort(),
                ),
                tools: vec![],
                tool_choice: None,
            };
            log_provider_request(
                "responses",
                self.provider_kind,
                settings.model(),
                11,
                &endpoint,
                &request_body,
            );
            let response = client
                .post(endpoint.clone())
                .headers(openai_compatible_headers(
                    api_key.as_deref(),
                    self.auth_style,
                    extra_headers_for_provider(self.provider_kind, &settings),
                )?)
                .json(&request_body)
                .send()
                .await
                .map_err(|error| format!("failed to reach {}: {error}", self.label))?;

            let status = response.status();
            let response_text = response
                .text()
                .await
                .map_err(|error| format!("failed to read {} response: {error}", self.label))?;
            log_provider_response(
                "responses",
                self.provider_kind,
                settings.model(),
                11,
                status.as_u16(),
                &response_text,
            );

            if !status.is_success() {
                return Err(format!(
                    "{} returned HTTP {}: {}",
                    self.label,
                    status.as_u16(),
                    truncate_error_body(&response_text)
                ));
            }

            let response_value: Value = serde_json::from_str(&response_text)
                .map_err(|error| format!("failed to parse {} response: {error}", self.label))?;
            if let Some(text) = response_value
                .get("output_text")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
            {
                content = text.to_string();
            } else if let Some(text) = extract_responses_output_text(&response_value) {
                content = text;
            }
            reasoning_content = response_value
                .get("reasoning_content")
                .and_then(Value::as_str)
                .filter(|r| !r.trim().is_empty())
                .map(String::from);
        }

        finish_agent_response(self, settings.model(), content, reasoning_content)
    }

    pub(crate) async fn run_chat_streaming(
        &self,
        app: tauri::AppHandle,
        settings: AiProviderSettings,
        api_key: Option<String>,
        request: AgentRunRequest,
        channel: Channel<Value>,
    ) -> Result<AgentRunResponse, String> {
        let prompt = trim_required("assistant prompt", request.prompt)?;
        let allowed_tools = request.allowed_tools.clone();
        let context_label = trim_required("assistant context", request.context_label)?;
        let skill_summaries = enabled_skill_summaries_for_request(
            &app,
            settings.disabled_skill_names(),
            settings.custom_skills_enabled(),
        )?;
        let endpoint =
            chat_completions_endpoint(settings.base_url(), settings.model(), self.endpoint_style)?;
        let mut messages = build_agent_messages(
            prompt,
            context_label,
            request.intent,
            settings.reasoning_effort().to_string(),
            request.system_context,
            request.selected_output,
            request.page_context,
            supports_image_input(self.provider_kind, settings.model()),
            request.screenshot,
            request.screenshots,
            request.messages,
            request.output_language,
            Some(settings.custom_instructions().to_string()),
            skill_summaries.clone(),
        );
        let client = ai_http_client(settings.allow_insecure_tls())?;
        let tool_definitions = agent_tool_definitions(
            request.allow_tools,
            &allowed_tools,
            settings.tools(),
            &skill_summaries,
        );
        let provider_tool_definitions = self.tool_definitions_for_provider(&tool_definitions);
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|error| format!("failed to locate KKTerm app data: {error}"))?;
        let model = settings.model().to_string();
        let exhausted = true;
        let mut tool_error_tracker = ConsecutiveToolErrorTracker::default();

        for turn_index in 0..10 {
            ai_debug!(
                "chat stream request provider={} model={} subturn={} messages={} tools={}",
                self.provider_kind,
                model,
                turn_index + 1,
                messages.len(),
                tool_definitions.len()
            );
            let request_body = OpenAiCompatibleChatRequest {
                model: model.clone(),
                messages: messages.clone(),
                stream: true,
                tools: provider_tool_definitions.clone(),
                tool_choice: (!provider_tool_definitions.is_empty()).then(|| "auto".to_string()),
                thinking: deepseek_thinking(self.provider_kind, settings.reasoning_effort()),
            };
            log_provider_request(
                "chat_completions_stream",
                self.provider_kind,
                &model,
                turn_index + 1,
                &endpoint,
                &request_body,
            );
            let response = client
                .post(endpoint.clone())
                .headers(openai_compatible_headers(
                    api_key.as_deref(),
                    self.auth_style,
                    extra_headers_for_provider(self.provider_kind, &settings),
                )?)
                .json(&request_body)
                .send()
                .await
                .map_err(|error| format!("failed to reach {}: {error}", self.label))?;

            let status = response.status();
            if !status.is_success() {
                let response_text = response
                    .text()
                    .await
                    .map_err(|error| format!("failed to read {} response: {error}", self.label))?;
                log_provider_response(
                    "chat_completions_stream",
                    self.provider_kind,
                    &model,
                    turn_index + 1,
                    status.as_u16(),
                    &response_text,
                );
                ai_debug!(
                    "chat stream HTTP error provider={} model={} subturn={} status={} body={}",
                    self.provider_kind,
                    model,
                    turn_index + 1,
                    status.as_u16(),
                    truncate_error_body(&response_text)
                );
                return Err(format!(
                    "{} returned HTTP {}: {}",
                    self.label,
                    status.as_u16(),
                    truncate_error_body(&response_text)
                ));
            }

            let (content, tool_calls, streamed_reasoning) =
                stream_chat_completions(response, &channel).await?;
            ai_debug!(
                "chat stream response provider={} model={} subturn={} content_len={} reasoning_len={} tool_calls={}",
                self.provider_kind,
                model,
                turn_index + 1,
                content.len(),
                streamed_reasoning.as_deref().map(str::len).unwrap_or(0),
                tool_calls.len()
            );

            if tool_calls.is_empty() {
                require_streamed_assistant_content(self, &content)?;
                emit_stream(
                    &channel,
                    &AiStreamEvent::Done {
                        model: model.clone(),
                        provider_kind: self.provider_kind.to_string(),
                    },
                )?;
                return finish_agent_response(self, &model, content, streamed_reasoning);
            }

            messages.push(OpenAiCompatibleMessage {
                role: "assistant".to_string(),
                content: OpenAiCompatibleContent::Text(content.clone()),
                reasoning_content: streamed_reasoning.filter(|r| !r.trim().is_empty()),
                tool_call_id: None,
                tool_calls: Some(
                    tool_calls
                        .iter()
                        .map(|tool_call| OpenAiAssistantToolCall {
                            id: tool_call.id.clone(),
                            tool_type: "function".to_string(),
                            function: OpenAiAssistantToolCallFunction {
                                name: tool_call.function.name.clone(),
                                arguments: tool_call.function.arguments.clone(),
                            },
                        })
                        .collect(),
                ),
            });
            for tool_call in &tool_calls {
                let is_skill_tool = is_assistant_skill_tool(&tool_call.function.name);
                ai_debug!(
                    "tool start provider={} model={} subturn={} id={} name={} args_len={}",
                    self.provider_kind,
                    model,
                    turn_index + 1,
                    tool_call.id,
                    tool_call.function.name,
                    tool_call.function.arguments.len()
                );
                if !is_skill_tool {
                    emit_stream(
                        &channel,
                        &AiStreamEvent::ToolCallStart {
                            tool_id: tool_call.id.clone(),
                            tool_name: tool_call.function.name.clone(),
                        },
                    )?;
                }
                let result = run_ai_tool(
                    &settings,
                    &app_data_dir,
                    &app,
                    tool_call,
                    Some(&channel),
                    &allowed_tools,
                )
                .await;
                ai_debug!(
                    "tool end provider={} model={} subturn={} id={} name={} result_len={}",
                    self.provider_kind,
                    model,
                    turn_index + 1,
                    tool_call.id,
                    tool_call.function.name,
                    result.len()
                );
                let tool_error = tool_result_error(&result);
                let abort_message = tool_error_tracker.note(&tool_call.function.name, &tool_error);
                messages.push(OpenAiCompatibleMessage {
                    role: "tool".to_string(),
                    content: OpenAiCompatibleContent::Text(result),
                    reasoning_content: None,
                    tool_call_id: Some(tool_call.id.clone()),
                    tool_calls: None,
                });
                if !is_skill_tool {
                    emit_stream(
                        &channel,
                        &AiStreamEvent::ToolCallEnd {
                            tool_id: tool_call.id.clone(),
                            tool_name: tool_call.function.name.clone(),
                            error: tool_error,
                        },
                    )?;
                }
                if let Some(message) = abort_message {
                    emit_stream(
                        &channel,
                        &AiStreamEvent::Done {
                            model: model.clone(),
                            provider_kind: self.provider_kind.to_string(),
                        },
                    )?;
                    return finish_agent_response(self, &model, message, None);
                }
            }
        }

        if exhausted {
            ai_debug!(
                "chat stream exhausted tool loop provider={} model={} messages={}",
                self.provider_kind,
                model,
                messages.len()
            );
            let request_body = OpenAiCompatibleChatRequest {
                model: model.clone(),
                messages: messages.clone(),
                stream: true,
                tools: vec![],
                tool_choice: None,
                thinking: deepseek_thinking(self.provider_kind, settings.reasoning_effort()),
            };
            log_provider_request(
                "chat_completions_stream",
                self.provider_kind,
                &model,
                11,
                &endpoint,
                &request_body,
            );
            let response = client
                .post(endpoint.clone())
                .headers(openai_compatible_headers(
                    api_key.as_deref(),
                    self.auth_style,
                    extra_headers_for_provider(self.provider_kind, &settings),
                )?)
                .json(&request_body)
                .send()
                .await
                .map_err(|error| format!("failed to reach {}: {error}", self.label))?;

            let status = response.status();
            if !status.is_success() {
                let response_text = response
                    .text()
                    .await
                    .map_err(|error| format!("failed to read {} response: {error}", self.label))?;
                log_provider_response(
                    "chat_completions_stream",
                    self.provider_kind,
                    &model,
                    11,
                    status.as_u16(),
                    &response_text,
                );
                return Err(format!(
                    "{} returned HTTP {}: {}",
                    self.label,
                    status.as_u16(),
                    truncate_error_body(&response_text)
                ));
            }

            let (content, _tool_calls, _streamed_reasoning) =
                stream_chat_completions(response, &channel).await?;
            require_streamed_assistant_content(self, &content)?;
            emit_stream(
                &channel,
                &AiStreamEvent::Done {
                    model: model.clone(),
                    provider_kind: self.provider_kind.to_string(),
                },
            )?;
            return finish_agent_response(self, &model, content, _streamed_reasoning);
        }

        Err(format!("{} exhausted the assistant tool loop", self.label))
    }

    pub(crate) async fn run_responses_streaming(
        &self,
        app: tauri::AppHandle,
        settings: AiProviderSettings,
        api_key: Option<String>,
        request: AgentRunRequest,
        channel: Channel<Value>,
    ) -> Result<AgentRunResponse, String> {
        let prompt = trim_required("assistant prompt", request.prompt)?;
        let allowed_tools = request.allowed_tools.clone();
        let context_label = trim_required("assistant context", request.context_label)?;
        let skill_summaries = enabled_skill_summaries_for_request(
            &app,
            settings.disabled_skill_names(),
            settings.custom_skills_enabled(),
        )?;
        let endpoint = responses_endpoint(settings.base_url(), self.endpoint_style)?;
        let messages = build_agent_messages(
            prompt,
            context_label,
            request.intent,
            settings.reasoning_effort().to_string(),
            request.system_context,
            request.selected_output,
            request.page_context,
            supports_image_input(self.provider_kind, settings.model()),
            request.screenshot,
            request.screenshots,
            request.messages,
            request.output_language,
            Some(settings.custom_instructions().to_string()),
            skill_summaries.clone(),
        );
        let client = ai_http_client(settings.allow_insecure_tls())?;
        let tool_definitions = agent_tool_definitions(
            request.allow_tools,
            &allowed_tools,
            settings.tools(),
            &skill_summaries,
        );
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|error| format!("failed to locate KKTerm app data: {error}"))?;
        let model = settings.model().to_string();
        let exhausted = true;

        let mut input = responses_input_from_messages(messages, request.files);
        let resp_tool_defs = self.responses_tool_definitions_for_provider(&tool_definitions);
        let mut tool_error_tracker = ConsecutiveToolErrorTracker::default();

        for turn_index in 0..10 {
            let request_body = OpenAiResponsesRequest {
                model: model.clone(),
                input: input.clone(),
                stream: true,
                store: false,
                reasoning: openai_responses_reasoning(
                    self.provider_kind,
                    settings.model(),
                    settings.reasoning_effort(),
                ),
                tools: resp_tool_defs.clone(),
                tool_choice: (!resp_tool_defs.is_empty()).then(|| "auto".to_string()),
            };
            log_provider_request(
                "responses_stream",
                self.provider_kind,
                &model,
                turn_index + 1,
                &endpoint,
                &request_body,
            );
            let response = client
                .post(endpoint.clone())
                .headers(openai_compatible_headers(
                    api_key.as_deref(),
                    self.auth_style,
                    extra_headers_for_provider(self.provider_kind, &settings),
                )?)
                .json(&request_body)
                .send()
                .await
                .map_err(|error| format!("failed to reach {}: {error}", self.label))?;

            let status = response.status();
            if !status.is_success() {
                let response_text = response
                    .text()
                    .await
                    .map_err(|error| format!("failed to read {} response: {error}", self.label))?;
                log_provider_response(
                    "responses_stream",
                    self.provider_kind,
                    &model,
                    turn_index + 1,
                    status.as_u16(),
                    &response_text,
                );
                return Err(format!(
                    "{} returned HTTP {}: {}",
                    self.label,
                    status.as_u16(),
                    truncate_error_body(&response_text)
                ));
            }

            let (content, tool_calls, _streamed_reasoning) =
                stream_responses_completions(response, &channel).await?;

            if let Some(output) = &content {
                input.push(json!({
                    "type": "message",
                    "role": "assistant",
                    "content": [{"type": "output_text", "text": output}],
                }));
            }

            if tool_calls.is_empty() {
                require_streamed_assistant_content(self, content.as_deref().unwrap_or(""))?;
                emit_stream(
                    &channel,
                    &AiStreamEvent::Done {
                        model,
                        provider_kind: self.provider_kind.to_string(),
                    },
                )?;
                return finish_agent_response(
                    self,
                    settings.model(),
                    content.unwrap_or_default(),
                    _streamed_reasoning,
                );
            }

            for tc in &tool_calls {
                input.push(json!({
                    "type": "function_call",
                    "call_id": tc.id,
                    "name": tc.function.name,
                    "arguments": tc.function.arguments,
                }));
            }
            for tool_call in &tool_calls {
                let is_skill_tool = is_assistant_skill_tool(&tool_call.function.name);
                if !is_skill_tool {
                    emit_stream(
                        &channel,
                        &AiStreamEvent::ToolCallStart {
                            tool_id: tool_call.id.clone(),
                            tool_name: tool_call.function.name.clone(),
                        },
                    )?;
                }
                let result = run_ai_tool(
                    &settings,
                    &app_data_dir,
                    &app,
                    tool_call,
                    Some(&channel),
                    &allowed_tools,
                )
                .await;
                let tool_error = tool_result_error(&result);
                let abort_message = tool_error_tracker.note(&tool_call.function.name, &tool_error);
                input.push(json!({
                    "type": "function_call_output",
                    "call_id": tool_call.id,
                    "output": result,
                }));
                if !is_skill_tool {
                    emit_stream(
                        &channel,
                        &AiStreamEvent::ToolCallEnd {
                            tool_id: tool_call.id.clone(),
                            tool_name: tool_call.function.name.clone(),
                            error: tool_error,
                        },
                    )?;
                }
                if let Some(message) = abort_message {
                    emit_stream(
                        &channel,
                        &AiStreamEvent::Done {
                            model: model.clone(),
                            provider_kind: self.provider_kind.to_string(),
                        },
                    )?;
                    return finish_agent_response(self, &model, message, None);
                }
            }
        }

        if exhausted {
            let request_body = OpenAiResponsesRequest {
                model: model.clone(),
                input: input.clone(),
                stream: true,
                store: false,
                reasoning: openai_responses_reasoning(
                    self.provider_kind,
                    settings.model(),
                    settings.reasoning_effort(),
                ),
                tools: vec![],
                tool_choice: None,
            };
            log_provider_request(
                "responses_stream",
                self.provider_kind,
                &model,
                11,
                &endpoint,
                &request_body,
            );
            let response = client
                .post(endpoint.clone())
                .headers(openai_compatible_headers(
                    api_key.as_deref(),
                    self.auth_style,
                    extra_headers_for_provider(self.provider_kind, &settings),
                )?)
                .json(&request_body)
                .send()
                .await
                .map_err(|error| format!("failed to reach {}: {error}", self.label))?;

            let status = response.status();
            if !status.is_success() {
                let response_text = response
                    .text()
                    .await
                    .map_err(|error| format!("failed to read {} response: {error}", self.label))?;
                log_provider_response(
                    "responses_stream",
                    self.provider_kind,
                    &model,
                    11,
                    status.as_u16(),
                    &response_text,
                );
                return Err(format!(
                    "{} returned HTTP {}: {}",
                    self.label,
                    status.as_u16(),
                    truncate_error_body(&response_text)
                ));
            }

            let (content, _tool_calls, _streamed_reasoning) =
                stream_responses_completions(response, &channel).await?;
            require_streamed_assistant_content(self, content.as_deref().unwrap_or(""))?;
            emit_stream(
                &channel,
                &AiStreamEvent::Done {
                    model: model.clone(),
                    provider_kind: self.provider_kind.to_string(),
                },
            )?;
            return finish_agent_response(
                self,
                &model,
                content.unwrap_or_default(),
                _streamed_reasoning,
            );
        }

        Err(format!("{} exhausted the assistant tool loop", self.label))
    }
}
