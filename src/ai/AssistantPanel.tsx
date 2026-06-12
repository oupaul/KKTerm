import { ConnectionIcon } from "../modules/workspace/connections/ConnectionIcon";
import type { TutorialHighlightRequest } from "../app/TutorialOverlay";
import {
  normalizeTutorialNavigationTarget,
  tutorialNavigationForTarget,
} from "../app/tutorialNavigationModel";
import { connectionPasswordOwnerId, workspaceKindLabel } from "../modules/workspace/connections/utils";
import { inspectActiveSshSystemContext } from "../modules/workspace/connections/terminal/TerminalWorkspace";
import { readFromClipboard, writeToClipboard } from "../lib/clipboard";
import {
  Bot,
  Camera,
  Check,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  FileImage,
  Hand,
  KeyRound,
  LoaderCircle,
  Plus,
  RefreshCw,
  ScrollText,
  SendHorizontal,
  Settings,
  ShieldAlert,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  ChangeEvent,
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { ariaChecked, dialogButtonAria, menuButtonAria } from "../lib/aria";
import { showNativeContextMenu } from "../lib/nativeContextMenu";
import { invokeCommand, isTauriRuntime, openExternalUrl } from "../lib/tauri";
import type {
  AiProviderModelOption,
  AiStreamEvent,
  CaptureScreenshotRequest,
} from "../lib/tauri";
import {
  getAiProviderDefinition,
  modelSupportsImageInput,
  normalizeAiProviderDraft,
  validateAiProviderForChat,
} from "./providers";
import {
  selectModelOptionsForProvider,
  sortModelOptionsForProvider,
} from "./providerModelOptions";
import {
  applyAssistantStreamEventToMessage,
  completeAssistantStreamMessageFromResponse,
} from "./streamMessage";
import { useWorkspaceStore } from "../store";
import { isAccentName, isIconName } from "../modules/dashboard/registry/palette";
import { useDashboardStore } from "../modules/dashboard/state/dashboardStore";
import {
  getFileBrowserController,
  getPaneRenderer,
  getRemoteDesktopController,
  sendTextToRdpPane,
  writeInputToPane,
} from "../modules/workspace/paneRegistry";
import i18next from "../i18n/config";
import { prepareAssistantTerminalInput } from "./terminalCommandSend";
import { Channel } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  parseAssistantSecretRequests,
  secretRequestStorageNotice,
  type AssistantSecretRequest,
} from "./secretRequest";
import { scrollAssistantChatToBottom } from "./assistantScroll";
import type { AiToolPermissionMode, AssistantContextSnippet, QuickCommand } from "../types";
import { MarkdownContent } from "./AssistantMarkdownContent";
import { AssistantToolApprovalCards } from "./AssistantToolApprovalCards";
import { AssistantWorkPanel } from "./AssistantWorkPanel";
import {
  isDashboardMutatingTool,
  normalizeAssistantToolName,
} from "./assistantToolLabels";
import {
  appViewportBounds,
  clampPointToBounds,
  pointInBounds,
  rectFromPoints,
  waitForScreenshotSurface,
} from "./assistantScreenshotRegion";
import type {
  AssistantChatMessage,
  AssistantChatThread,
  AssistantFileAttachment,
  AssistantImageAttachment,
  AssistantLiveToolRequest,
  AssistantPageContext,
  AssistantPromptIntent,
  AssistantToolApprovalRequest,
  AssistantTextAttachment,
  PendingToolApproval,
  ScreenshotRegionState,
} from "./assistantTypes";

export type { AssistantPageContext } from "./assistantTypes";

import {
  assistantChatThreadToRecord,
  assistantThreadPreview,
  assistantThreadTitle,
  createAssistantChatThreadId,
  loadAssistantChatHistoryFromStorage,
  readLegacyAssistantChatHistory,
  sanitizeAssistantThreadTitle,
  sortedAssistantThreads,
  upsertAssistantChatThread,
  writeLegacyAssistantChatHistory,
} from "./assistantChatThreads";
import {
  ASSISTANT_FILE_MAX_BYTES,
  assistantAgentIntent,
  assistantIntentExamples,
  assistantIntentForPrompt,
  assistantIntentLabel,
  assistantIntentPlaceholder,
  assistantPromptForIntent,
  assistantQuickCommandId,
  createAiProviderSecretRequestMarkdown,
  createAssistantChatMessage,
  createAssistantRunManifest,
  createImageAttachment,
  formatAssistantMessageTime,
  logAssistantStreamEvent,
  readFileAsDataUrl,
  readImageFileAsDataUrl,
  resolveAssistantOutputLanguage,
  sampleRandom,
} from "./assistantComposer";

type AssistantQueuedPrompt = {
  id: string;
  intent: AssistantPromptIntent;
  prompt: string;
  contextSnippet?: AssistantContextSnippet;
};

function maxMeasuredTextWidth(node: HTMLDivElement | null) {
  if (!node) {
    return 0;
  }

  return Array.from(node.children).reduce((max, child) => {
    return Math.max(max, child.getBoundingClientRect().width);
  }, 0);
}


export function AssistantPanel({
  collapsed,
  onOpenDashboard,
  onOpenSettings,
  onOpenWorkspace,
  onTogglePanel,
  onTutorialRequest,
  pageContext,
}: {
  collapsed: boolean;
  onOpenDashboard: (viewId?: string) => void;
  onOpenSettings: () => void;
  onOpenWorkspace: () => void;
  onTogglePanel?: () => void;
  onTutorialRequest: (
    request: TutorialHighlightRequest,
  ) => Promise<{ ok: boolean; error?: string }>;
  pageContext?: AssistantPageContext;
}) {
  const { t, i18n } = useTranslation();
  const activeTab = useWorkspaceStore((state) =>
    state.tabs.find((tab) => tab.id === state.activeTabId),
  );
  const requestRdpPreCapture = useWorkspaceStore((state) => state.requestRdpPreCapture);
  const assistantContextSnippet = useWorkspaceStore((state) => state.assistantContextSnippet);
  const assistantDirectSubmitRequest = useWorkspaceStore((state) => state.assistantDirectSubmitRequest);
  const setAssistantContextSnippet = useWorkspaceStore(
    (state) => state.setAssistantContextSnippet,
  );
  const clearAssistantContextSnippet = useWorkspaceStore(
    (state) => state.clearAssistantContextSnippet,
  );
  const clearAssistantDirectSubmitRequest = useWorkspaceStore(
    (state) => state.clearAssistantDirectSubmitRequest,
  );
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const aiProviderSettings = useWorkspaceStore((state) => state.aiProviderSettings);
  const setAiProviderSettings = useWorkspaceStore((state) => state.setAiProviderSettings);
  const aiProviderHasApiKey = useWorkspaceStore((state) => state.aiProviderHasApiKey);
  const setAssistantWorking = useWorkspaceStore((state) => state.setAssistantWorking);
  const [prompt, setPrompt] = useState(() => sessionStorage.getItem("ai-chat-draft") ?? "");
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState(createAssistantChatThreadId);
  const [currentThreadTitle, setCurrentThreadTitle] = useState<string | undefined>();
  const [chatHistory, setChatHistory] = useState<AssistantChatThread[]>(() =>
    isTauriRuntime() ? [] : readLegacyAssistantChatHistory(),
  );
  const [showAllChats, setShowAllChats] = useState(false);
  const [chatError, setChatError] = useState("");
  const [isSendingPrompt, setIsSendingPrompt] = useState(false);
  const [pendingToolApprovals, setPendingToolApprovals] = useState<PendingToolApproval[]>([]);
  const [assistantIntent, setAssistantIntent] = useState<AssistantPromptIntent>("chat");
  const [assistantPromptQueue, setAssistantPromptQueue] = useState<AssistantQueuedPrompt[]>([]);
  const [displayedIntentExamples, setDisplayedIntentExamples] = useState<string[]>([]);
  const [addContextMenuOpen, setAddContextMenuOpen] = useState(false);
  const [permissionMenuOpen, setPermissionMenuOpen] = useState(false);
  const [pastedImageContexts, setPastedImageContexts] = useState<AssistantImageAttachment[]>([]);
  const [fileContexts, setFileContexts] = useState<AssistantFileAttachment[]>([]);
  const [imagePasteRejected, setImagePasteRejected] = useState(false);
  const [screenshotRegionState, setScreenshotRegionState] =
    useState<ScreenshotRegionState | null>(null);
  const activeComposerIntent = assistantIntent === "chat" ? undefined : assistantIntent;
  const activeComposerIntentLabel = activeComposerIntent
    ? assistantIntentLabel(activeComposerIntent, t)
    : "";
  const activeLanguage = i18n.resolvedLanguage ?? i18n.language;
  const [refreshedModelOptions, setRefreshedModelOptions] = useState<AiProviderModelOption[]>([]);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatLogRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<AssistantChatMessage[]>([]);
  const assistantPromptQueueRef = useRef<AssistantQueuedPrompt[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addContextMenuRef = useRef<HTMLDivElement | null>(null);
  const permissionMenuRef = useRef<HTMLDivElement | null>(null);
  const permissionWidthMeasureRef = useRef<HTMLDivElement | null>(null);
  const modelSelectRef = useRef<HTMLSelectElement | null>(null);
  const modelWidthMeasureRef = useRef<HTMLDivElement | null>(null);
  const regionTargetRef = useRef<HTMLDivElement | null>(null);
  const regionSelectionRef = useRef<HTMLDivElement | null>(null);
  const activeAssistantRequestIdRef = useRef(0);
  const allowedToolApprovalsForCurrentChatRef = useRef<Set<string>>(new Set());
  const forceChatScrollToBottomRef = useRef(false);
  const wasCollapsedRef = useRef(collapsed);
  const workspaceContextLabel = activeTab
    ? `${activeTab.title} - ${workspaceKindLabel(activeTab)}`
    : t("ai.noActiveSession");
  const workspaceConnectionLabel = activeTab?.connection
    ? `${activeTab.connection.user}@${activeTab.connection.host}`
    : t("ai.workspace");
  const contextLabel = pageContext?.contextLabel ?? workspaceContextLabel;
  const connectionLabel = pageContext?.connectionLabel ?? workspaceConnectionLabel;
  const pageContextPayload =
    pageContext && pageContext.text.trim()
      ? {
          sourceLabel: pageContext.sourceLabel,
          text: pageContext.text,
        }
      : undefined;
  const dashboardToolsEnabled =
    pageContext?.contextKind === "dashboard" && Boolean(aiProviderSettings.tools?.dashboard);
  const providerDefinition = getAiProviderDefinition(aiProviderSettings.providerKind);
  const assistantModelOptions = useMemo(
    () =>
      selectModelOptionsForProvider({
        customModel: aiProviderSettings.model,
        provider: providerDefinition,
        refreshedModels: refreshedModelOptions,
        showAllModels: aiProviderSettings.showAllModels,
      }),
    [
      aiProviderSettings.model,
      aiProviderSettings.showAllModels,
      providerDefinition,
      refreshedModelOptions,
    ],
  );
  const currentModel = aiProviderSettings.model || providerDefinition.defaultModel;
  const currentToolPermissionMode = aiProviderSettings.toolPermissionMode ?? "prompt";
  const modelOptionIds = useMemo(
    () => new Set(assistantModelOptions.map((model) => model.id)),
    [assistantModelOptions],
  );
  const hasCustomModel = currentModel.trim().length > 0 && !modelOptionIds.has(currentModel);
  const toolPermissionLabels = useMemo(
    () => [t("ai.toolPermissionPrompt"), t("ai.toolPermissionAllowAll")],
    [t],
  );
  const modelSelectLabels = useMemo(
    () => [
      ...(hasCustomModel ? [currentModel] : []),
      ...assistantModelOptions.map((model) => model.label),
    ],
    [assistantModelOptions, currentModel, hasCustomModel],
  );
  const currentModelSupportsImageInput = modelSupportsImageInput(
    providerDefinition,
    currentModel,
  );
  const assistantScreenshotContext =
    assistantContextSnippet?.kind === "screenshot"
      ? {
          sourceLabel: assistantContextSnippet.sourceLabel,
          dataUrl: assistantContextSnippet.imageDataUrl,
        }
      : undefined;
  const hasPendingImageContext = pastedImageContexts.length > 0 || Boolean(assistantScreenshotContext);
  const showImageNotSupportedNotice =
    !currentModelSupportsImageInput && (hasPendingImageContext || imagePasteRejected);
  const activeTerminalPaneId =
    !pageContext && activeTab?.kind === "terminal"
      ? activeTab.focusedPaneId ?? activeTab.panes[0]?.id
      : undefined;
  const activeFocusedPane =
    activeTab?.kind === "terminal"
      ? activeTab.panes.find((pane) => pane.id === activeTerminalPaneId) ?? activeTab.panes[0]
      : undefined;
  const activeFocusedTerminalPane =
    activeFocusedPane?.kind === undefined || activeFocusedPane?.kind === "terminal"
      ? activeFocusedPane
      : undefined;
  const canAttachTerminalBuffer =
    Boolean(activeFocusedTerminalPane) &&
    (!activeFocusedTerminalPane?.connection ||
      activeFocusedTerminalPane.connection.type === "local" ||
      activeFocusedTerminalPane.connection.type === "ssh");
  const activeRdpPaneId =
    !pageContext && activeTab?.kind === "remoteDesktop" && activeTab.connection?.type === "rdp"
      ? activeTab.focusedPaneId ?? activeTab.panes[0]?.id
      : undefined;
  const sortedChatHistory = useMemo(() => sortedAssistantThreads(chatHistory), [chatHistory]);
  const recentChatHistory = sortedChatHistory.slice(0, 5);
  const shouldShowChatHistory = messages.length === 0 && !prompt.trim() && !isSendingPrompt;
  const shouldShowPreStreamWaiting =
    isSendingPrompt && !messages.some((message) => message.role === "assistant" && message.isStreaming);
  const streamingMessageIndex = messages.findIndex((message) => message.isStreaming);

  useEffect(() => {
    if (
      !isTauriRuntime() ||
      !providerDefinition.modelListStrategy ||
      (providerDefinition.requiresApiKey && !aiProviderHasApiKey)
    ) {
      setRefreshedModelOptions([]);
      return;
    }

    let disposed = false;
    void invokeCommand("list_ai_provider_models", {
      request: {
        providerKind: aiProviderSettings.providerKind,
        baseUrl: aiProviderSettings.baseUrl,
        allowInsecureTls: aiProviderSettings.allowInsecureTls,
      },
    })
      .then((models) => {
        if (disposed) return;
        setRefreshedModelOptions(
          sortModelOptionsForProvider(aiProviderSettings.providerKind, models),
        );
      })
      .catch(() => {
        if (!disposed) setRefreshedModelOptions([]);
      });

    return () => {
      disposed = true;
    };
  }, [
    aiProviderHasApiKey,
    aiProviderSettings.allowInsecureTls,
    aiProviderSettings.baseUrl,
    aiProviderSettings.providerKind,
    providerDefinition.modelListStrategy,
    providerDefinition.requiresApiKey,
  ]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let disposed = false;
    void loadAssistantChatHistoryFromStorage().then((threads) => {
      if (!disposed) {
        setChatHistory(threads);
      }
    });

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) {
      writeLegacyAssistantChatHistory(chatHistory);
    }
  }, [chatHistory]);

  useEffect(() => {
    if (!activeComposerIntent) {
      return;
    }
    setDisplayedIntentExamples(sampleRandom(assistantIntentExamples(activeComposerIntent, t), 3));
  }, [activeComposerIntent, activeLanguage, t]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    setAssistantWorking(isSendingPrompt);
    return () => setAssistantWorking(false);
  }, [isSendingPrompt, setAssistantWorking]);

  useEffect(() => {
    const wasCollapsed = wasCollapsedRef.current;
    wasCollapsedRef.current = collapsed;
    if (!wasCollapsed || collapsed || isSendingPrompt) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      composerTextareaRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [collapsed, isSendingPrompt]);

  useEffect(() => {
    if (currentModelSupportsImageInput) {
      setImagePasteRejected(false);
    }
  }, [currentModelSupportsImageInput]);

  useEffect(() => {
    // Debounce: typing in the composer was writing sessionStorage on every keystroke
    // which is synchronous and noticeable on low-end machines. 250ms still safely
    // captures the draft for refresh/restore.
    const id = window.setTimeout(() => {
      if (prompt) {
        sessionStorage.setItem("ai-chat-draft", prompt);
      } else {
        sessionStorage.removeItem("ai-chat-draft");
      }
    }, 250);
    return () => window.clearTimeout(id);
  }, [prompt]);

  useLayoutEffect(() => {
    if (!forceChatScrollToBottomRef.current) {
      return;
    }

    scrollAssistantChatToBottom(chatLogRef.current);
    const frame = window.requestAnimationFrame(() => {
      scrollAssistantChatToBottom(chatLogRef.current);
      if (!isSendingPrompt && !shouldShowPreStreamWaiting) {
        forceChatScrollToBottomRef.current = false;
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isSendingPrompt, messages, pendingToolApprovals, shouldShowPreStreamWaiting]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listen<AssistantLiveToolRequest>("assistant-live-tool-request", (event) => {
      if (disposed) {
        return;
      }
      void completeAssistantLiveTool(event.payload);
    }).then((dispose) => {
      if (disposed) {
        dispose();
        return;
      }
      unlisten = dispose;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listen<AssistantToolApprovalRequest>("assistant-tool-approval-request", (event) => {
      if (disposed) {
        return;
      }
      const request = event.payload;
      const normalizedToolName = normalizeAssistantToolName(request.toolName);
      if (
        normalizedToolName &&
        !request.riskElevated &&
        allowedToolApprovalsForCurrentChatRef.current.has(normalizedToolName)
      ) {
        setPendingToolApprovals((current) => [
          ...current.filter((item) => item.requestId !== request.requestId),
          { ...request, status: "allowedSession" },
        ]);
        void completeAssistantToolApproval(request.requestId, true, {
          allowSession: true,
          toolName: request.toolName,
        });
        forceChatScrollToBottomRef.current = true;
        return;
      }
      setPendingToolApprovals((current) => [
        ...current.filter((item) => item.requestId !== request.requestId),
        { ...request, status: "pending" },
      ]);
      forceChatScrollToBottomRef.current = true;
    }).then((dispose) => {
      if (disposed) {
        dispose();
        return;
      }
      unlisten = dispose;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!addContextMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const node = addContextMenuRef.current;
      if (node && !node.contains(event.target as Node)) {
        setAddContextMenuOpen(false);
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setAddContextMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [addContextMenuOpen]);

  useEffect(() => {
    if (!permissionMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const node = permissionMenuRef.current;
      if (node && !node.contains(event.target as Node)) {
        setPermissionMenuOpen(false);
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setPermissionMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [permissionMenuOpen]);

  function handleSendCodeToTerminal(code: string) {
    if (activeTerminalPaneId) {
      const data = prepareAssistantTerminalInput(code);
      writeInputToPane(activeTerminalPaneId, data);
      return;
    }

    if (activeRdpPaneId) {
      const trimmed = code.replace(/\r?\n$/, "");
      const send = sendTextToRdpPane(activeRdpPaneId, trimmed, true);
      if (send) {
        send.catch((error) => {
          setChatError(error instanceof Error ? error.message : String(error));
        });
      }
    }
  }

  function handleChatSubmit(event: FormEvent) {
    event.preventDefault();
    void submitAssistantPrompt();
  }

  function handleStopAssistantPrompt() {
    if (!isSendingPrompt) {
      return;
    }

    activeAssistantRequestIdRef.current += 1;
    setIsSendingPrompt(false);
    setChatError("");
    if (isTauriRuntime()) {
      // Detaching the UI is not enough: without this the backend agent loop
      // keeps running — and keeps executing tools — after Stop.
      void invokeCommand("cancel_assistant_streams").catch(() => {});
    }
    pendingToolApprovals
      .filter((request) => request.status === "pending")
      .forEach((request) => {
        void completeAssistantToolApproval(request.requestId, false);
      });
    window.requestAnimationFrame(() => {
      composerTextareaRef.current?.focus();
    });
  }

  function handleNewChat() {
    if (isSendingPrompt) {
      return;
    }
    saveCurrentChat();
    messagesRef.current = [];
    setMessages([]);
    setCurrentThreadId(createAssistantChatThreadId());
    setCurrentThreadTitle(undefined);
    setPrompt("");
    setChatError("");
    setPastedImageContexts([]);
    setFileContexts([]);
    setImagePasteRejected(false);
    setAssistantIntent("chat");
    setAssistantPromptQueueState([]);
    setPendingToolApprovals([]);
    allowedToolApprovalsForCurrentChatRef.current.clear();
    setDisplayedIntentExamples([]);
    setShowAllChats(false);
  }

  function saveCurrentChat() {
    if (messages.length === 0) {
      return;
    }
    saveChatMessages(messages, currentThreadTitle ?? assistantThreadTitle(messages));
  }

  function saveChatMessages(nextMessages: AssistantChatMessage[], title: string) {
    if (nextMessages.length === 0) {
      return;
    }
    const now = new Date().toISOString();
    const thread: AssistantChatThread = {
      id: currentThreadId,
      title,
      contextLabel,
      messages: nextMessages,
      createdAt: nextMessages[0]?.createdAt ?? now,
      updatedAt: nextMessages[nextMessages.length - 1]?.createdAt ?? now,
    };
    setChatHistory((current) => upsertAssistantChatThread(current, thread));
    if (isTauriRuntime()) {
      void invokeCommand("upsert_assistant_chat_thread", {
        request: assistantChatThreadToRecord(thread),
      }).catch((error) => {
        setChatError(error instanceof Error ? error.message : String(error));
      });
    }
  }

  function appendLocalAssistantMessage(content: string, intent?: AssistantPromptIntent) {
    const assistantMessage = createAssistantChatMessage("assistant", content, intent ?? assistantIntent);
    const nextMessages = [...messages, assistantMessage];
    const title = currentThreadTitle ?? assistantThreadTitle(nextMessages);
    setMessages(nextMessages);
    setCurrentThreadTitle(title);
    saveChatMessages(nextMessages, title);
  }

  function resumeChat(thread: AssistantChatThread) {
    if (isSendingPrompt) {
      return;
    }
    saveCurrentChat();
    setCurrentThreadId(thread.id);
    setCurrentThreadTitle(thread.title);
    messagesRef.current = thread.messages;
    setMessages(thread.messages);
    setPrompt("");
    setChatError("");
    setPastedImageContexts([]);
    setFileContexts([]);
    setImagePasteRejected(false);
    setAssistantIntent("chat");
    setAssistantPromptQueueState([]);
    setPendingToolApprovals([]);
    allowedToolApprovalsForCurrentChatRef.current.clear();
    setDisplayedIntentExamples([]);
    setShowAllChats(false);
  }

  function deleteChat(threadId: string) {
    setChatHistory((current) => current.filter((thread) => thread.id !== threadId));
    if (isTauriRuntime()) {
      void invokeCommand("delete_assistant_chat_thread", { threadId }).catch((error) => {
        setChatError(error instanceof Error ? error.message : String(error));
      });
    }
    if (threadId === currentThreadId) {
      setMessages([]);
      setCurrentThreadId(createAssistantChatThreadId());
      setCurrentThreadTitle(undefined);
      setPrompt("");
      setChatError("");
      setPastedImageContexts([]);
      setFileContexts([]);
      setImagePasteRejected(false);
      setAssistantIntent("chat");
      setPendingToolApprovals([]);
      allowedToolApprovalsForCurrentChatRef.current.clear();
      setDisplayedIntentExamples([]);
    }
  }

  async function handleCopyMessage(message: AssistantChatMessage) {
    const parsed = parseAssistantSecretRequests(message.content);
    const attachmentText =
      message.textAttachments
        ?.map((attachment) => `${attachment.sourceLabel}\n\n${attachment.text}`)
        .join("\n\n") ?? "";
    await writeToClipboard(
      attachmentText ? `${parsed.markdown}\n\n${attachmentText}` : parsed.markdown,
    );
  }

  async function handleCopyCode(code: string) {
    await writeToClipboard(code);
  }

  async function handleModelChange(model: string) {
    const previousSettings = aiProviderSettings;
    const nextSettings = normalizeAiProviderDraft({
      ...previousSettings,
      model,
    });
    setAiProviderSettings(nextSettings);
    setChatError("");

    if (!isTauriRuntime()) {
      return;
    }

    try {
      const saved = await invokeCommand("update_ai_provider_settings", {
        request: nextSettings,
      });
      setAiProviderSettings(saved);
    } catch (error) {
      setAiProviderSettings(previousSettings);
      setChatError(error instanceof Error ? error.message : String(error));
    }
  }

  async function completeAssistantLiveTool(request: AssistantLiveToolRequest) {
    let result: unknown;
    try {
      result = await runAssistantLiveTool(request.toolName, request.args ?? {});
    } catch (error) {
      result = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
    try {
      await invokeCommand("complete_assistant_live_tool_request", {
        completion: {
          requestId: request.requestId,
          result: JSON.stringify(result),
        },
      });
    } catch (error) {
      setChatError(error instanceof Error ? error.message : String(error));
    }
  }

  async function completeAssistantToolApproval(
    requestId: string,
    approved: boolean,
    options?: { allowSession?: boolean; toolName?: string },
  ) {
    if (options?.allowSession) {
      const toolName = normalizeAssistantToolName(
        options.toolName ?? pendingToolApprovals.find((item) => item.requestId === requestId)?.toolName,
      );
      if (toolName) {
        allowedToolApprovalsForCurrentChatRef.current.add(toolName);
      }
    }
    setPendingToolApprovals((current) =>
      current.map((item) =>
        item.requestId === requestId
          ? {
              ...item,
              status: options?.allowSession ? "allowedSession" : approved ? "approved" : "denied",
            }
          : item,
      ),
    );
    try {
      await invokeCommand("complete_assistant_tool_approval_request", {
        completion: { requestId, approved },
      });
    } catch (error) {
      setChatError(error instanceof Error ? error.message : String(error));
    }
  }

  async function runAssistantLiveTool(toolName: string, args: Record<string, unknown>) {
    switch (toolName) {
      case "tutorial_highlight":
        return assistantTutorialHighlight(args);
      case "session_state":
        return assistantSessionState();
      case "session_activate_tab":
        return assistantActivateTab(args);
      case "session_terminal_read_buffer":
        return assistantTerminalReadBuffer(args);
      case "session_terminal_send_text":
        return assistantTerminalSendText(args);
      case "session_remote_desktop_screenshot":
        return assistantRemoteDesktopScreenshot(args);
      case "workspace_connection_screenshot":
        return assistantWorkspaceConnectionScreenshot(args);
      case "dashboard_view_screenshot":
        return assistantDashboardViewScreenshot(args);
      case "dashboard_widget_screenshot":
        return assistantDashboardWidgetScreenshot(args);
      case "session_remote_desktop_send_text":
        return assistantRemoteDesktopSendText(args);
      case "session_remote_desktop_keypress":
        return assistantRemoteDesktopKeyPress(args);
      case "session_remote_desktop_mouse_click":
        return assistantRemoteDesktopMouseClick(args);
      case "session_file_browser_list":
        return assistantFileBrowserList(args);
      case "session_file_browser_create_folder":
        return assistantFileBrowserCreateFolder(args);
      case "session_file_browser_rename":
        return assistantFileBrowserRename(args);
      case "session_file_browser_delete":
        return assistantFileBrowserDelete(args);
      case "quick_command_list":
        return assistantQuickCommandList(args);
      case "quick_command_read":
        return assistantQuickCommandRead(args);
      case "quick_command_create":
        return assistantQuickCommandCreate(args);
      case "quick_command_edit":
        return assistantQuickCommandEdit(args);
      default:
        return { ok: false, error: `Unknown live Session tool: ${toolName}` };
    }
  }

  function attrSelector(name: string, value: string) {
    return `[${name}="${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`;
  }

  function screenshotRequestForElement(element: HTMLElement): CaptureScreenshotRequest | null {
    const bounds = element.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) {
      return null;
    }
    return {
      x: Math.max(0, Math.round(bounds.left)),
      y: Math.max(0, Math.round(bounds.top)),
      width: Math.max(1, Math.round(bounds.width)),
      height: Math.max(1, Math.round(bounds.height)),
    };
  }

  async function waitForElement(selector: string) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const element = document.querySelector<HTMLElement>(selector);
      const request = element ? screenshotRequestForElement(element) : null;
      if (element && request) {
        return element;
      }
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    }
    return null;
  }

  async function captureElementForLiveTool(element: HTMLElement) {
    const request = screenshotRequestForElement(element);
    if (!request) {
      throw new Error("Screenshot target is not visible.");
    }
    await waitForScreenshotSurface();
    const screenshot = await invokeCommand("capture_screenshot_for_assistant", { request });
    return { screenshot, bounds: request };
  }

  async function assistantWorkspaceConnectionScreenshot(args: Record<string, unknown>) {
    if (!isTauriRuntime()) {
      return { ok: false, error: t("workspace.screenshotsRequireRuntime") };
    }
    const connectionId = typeof args.connectionId === "string" ? args.connectionId.trim() : "";
    if (!connectionId) {
      return { ok: false, error: "connectionId is required." };
    }
    const workspace = useWorkspaceStore.getState();
    const tab = workspace.tabs.find(
      (entry) =>
        entry.connection?.id === connectionId ||
        entry.panes.some((pane) => pane.connection?.id === connectionId),
    );
    if (!tab) {
      return { ok: false, error: "Connection is not open in the Workspace." };
    }
    onOpenWorkspace();
    useWorkspaceStore.getState().activateTab(tab.id);
    const target = await waitForElement(attrSelector("data-tutorial-id", "workspace.canvas"));
    if (!target) {
      return { ok: false, error: "Workspace Canvas is not visible." };
    }
    const { screenshot, bounds } = await captureElementForLiveTool(target);
    return { ok: true, connectionId, tabId: tab.id, bounds, screenshot };
  }

  async function assistantDashboardViewScreenshot(args: Record<string, unknown>) {
    if (!isTauriRuntime()) {
      return { ok: false, error: t("workspace.screenshotsRequireRuntime") };
    }
    const dashboard = useDashboardStore.getState();
    if (!dashboard.ready) {
      await dashboard.load();
    }
    const state = useDashboardStore.getState();
    const requestedViewId = typeof args.viewId === "string" ? args.viewId.trim() : "";
    const viewId = requestedViewId || state.activeViewId || state.views[0]?.id || "";
    if (!viewId || !state.views.some((view) => view.id === viewId)) {
      return { ok: false, error: "Dashboard View was not found." };
    }
    onOpenDashboard(viewId);
    const target = await waitForElement(attrSelector("data-dashboard-view-id", viewId));
    if (!target) {
      return { ok: false, error: "Dashboard View is not visible." };
    }
    const { screenshot, bounds } = await captureElementForLiveTool(target);
    return { ok: true, viewId, bounds, screenshot };
  }

  async function assistantDashboardWidgetScreenshot(args: Record<string, unknown>) {
    if (!isTauriRuntime()) {
      return { ok: false, error: t("workspace.screenshotsRequireRuntime") };
    }
    const instanceId = typeof args.instanceId === "string" ? args.instanceId.trim() : "";
    if (!instanceId) {
      return { ok: false, error: "instanceId is required." };
    }
    const dashboard = useDashboardStore.getState();
    if (!dashboard.ready) {
      await dashboard.load();
    }
    const instance = useDashboardStore.getState().instances.find((entry) => entry.id === instanceId);
    if (!instance) {
      return { ok: false, error: "Dashboard Widget Instance was not found." };
    }
    onOpenDashboard(instance.viewId);
    const target = await waitForElement(attrSelector("data-dashboard-widget-instance-id", instanceId));
    if (!target) {
      return { ok: false, error: "Dashboard Widget Instance is not visible." };
    }
    const { screenshot, bounds } = await captureElementForLiveTool(target);
    return { ok: true, instanceId, viewId: instance.viewId, bounds, screenshot };
  }

  async function assistantTutorialHighlight(args: Record<string, unknown>) {
    const targetId = typeof args.targetId === "string" ? args.targetId.trim() : "";
    const title = typeof args.title === "string" ? args.title.trim() : "";
    const body = typeof args.body === "string" ? args.body.trim() : "";
    if (!targetId || !title || !body) {
      return { ok: false, error: t("ai.tutorialInvalidRequest") };
    }
    const navigation =
      normalizeTutorialNavigationTarget(args.navigation) ??
      normalizeTutorialNavigationTarget(args) ??
      tutorialNavigationForTarget(targetId);
    return onTutorialRequest({ targetId, title, body, navigation });
  }

  function assistantSessionState() {
    const state = useWorkspaceStore.getState();
    return {
      ok: true,
      activeTabId: state.activeTabId,
      tabs: state.tabs.map((tab) => ({
        id: tab.id,
        title: tab.title,
        kind: tab.kind,
        active: tab.id === state.activeTabId,
        focusedPaneId: tab.focusedPaneId,
        connection: tab.connection
          ? {
              id: tab.connection.id,
              name: tab.connection.name,
              type: tab.connection.type,
              host: tab.connection.host,
              user: tab.connection.user,
            }
          : null,
        panes: tab.panes.map((pane) => ({
          id: pane.id,
          kind: pane.kind ?? "terminal",
          title: pane.title,
          hasTerminalBuffer: Boolean(getPaneRenderer(pane.id)),
          hasRemoteDesktopController: Boolean(getRemoteDesktopController(pane.id)),
        })),
        fileBrowser: tab.kind === "sftp" || tab.kind === "ftp"
          ? getFileBrowserController(tab.id)?.snapshot() ?? null
          : null,
      })),
    };
  }

  function assistantActivateTab(args: Record<string, unknown>) {
    const tabId = typeof args.tabId === "string" ? args.tabId.trim() : "";
    if (!tabId) {
      return { ok: false, error: "tabId is required." };
    }
    const store = useWorkspaceStore.getState();
    const tab = store.tabs.find((entry) => entry.id === tabId);
    if (!tab) {
      return { ok: false, error: `No open Tab with id ${tabId}.` };
    }
    store.activateTab(tabId);
    const paneId = typeof args.paneId === "string" ? args.paneId.trim() : "";
    if (paneId) {
      if (!tab.panes.some((pane) => pane.id === paneId)) {
        return { ok: false, error: `Tab ${tabId} has no Pane ${paneId}.` };
      }
      store.setFocusedPane(tabId, paneId);
    }
    return {
      ok: true,
      activeTabId: tabId,
      focusedPaneId: paneId || tab.focusedPaneId || null,
    };
  }

  function activeTerminalPaneIdForLiveTool(paneId: unknown) {
    if (typeof paneId === "string" && paneId.trim()) {
      return paneId.trim();
    }
    const state = useWorkspaceStore.getState();
    const tab = state.tabs.find((entry) => entry.id === state.activeTabId);
    if (!tab || tab.kind !== "terminal") {
      return "";
    }
    return tab.focusedPaneId ?? tab.panes[0]?.id ?? "";
  }

  function activeRemoteDesktopPaneIdForLiveTool(paneId: unknown) {
    if (typeof paneId === "string" && paneId.trim()) {
      return paneId.trim();
    }
    const state = useWorkspaceStore.getState();
    const tab = state.tabs.find((entry) => entry.id === state.activeTabId);
    if (!tab || tab.kind !== "remoteDesktop") {
      return "";
    }
    return tab.focusedPaneId ?? tab.panes[0]?.id ?? "";
  }

  function activeFileBrowserTabIdForLiveTool(tabId: unknown) {
    if (typeof tabId === "string" && tabId.trim()) {
      return tabId.trim();
    }
    const state = useWorkspaceStore.getState();
    const tab = state.tabs.find((entry) => entry.id === state.activeTabId);
    if (!tab || (tab.kind !== "sftp" && tab.kind !== "ftp")) {
      return "";
    }
    return tab.id;
  }

  function assistantTerminalReadBuffer(args: Record<string, unknown>) {
    const paneId = activeTerminalPaneIdForLiveTool(args.paneId);
    const renderer = paneId ? getPaneRenderer(paneId) : undefined;
    if (!paneId || !renderer) {
      return { ok: false, error: "No active terminal Pane is available." };
    }
    const maxChars =
      typeof args.maxChars === "number" && Number.isFinite(args.maxChars)
        ? Math.max(1, Math.min(50_000, Math.trunc(args.maxChars)))
        : 20_000;
    const text = renderer.getBufferText();
    return {
      ok: true,
      paneId,
      text: text.length > maxChars ? text.slice(text.length - maxChars) : text,
      truncated: text.length > maxChars,
    };
  }

  function assistantTerminalSendText(args: Record<string, unknown>) {
    const paneId = activeTerminalPaneIdForLiveTool(args.paneId);
    const text = typeof args.text === "string" ? args.text : "";
    if (!paneId || !text) {
      return { ok: false, error: "Terminal paneId and text are required." };
    }
    const data = args.pressEnter === false ? text : prepareAssistantTerminalInput(text);
    const sent = writeInputToPane(paneId, data);
    return sent ? { ok: true, paneId } : { ok: false, error: "Terminal Pane is not writable." };
  }

  async function assistantRemoteDesktopScreenshot(args: Record<string, unknown>) {
    const paneId = activeRemoteDesktopPaneIdForLiveTool(args.paneId);
    const controller = paneId ? getRemoteDesktopController(paneId) : undefined;
    if (!paneId || !controller) {
      return { ok: false, error: "No active remote desktop Session is available." };
    }
    const screenshot = await controller.captureScreenshot();
    return { ok: true, paneId, screenshot };
  }

  async function assistantRemoteDesktopSendText(args: Record<string, unknown>) {
    const paneId = activeRemoteDesktopPaneIdForLiveTool(args.paneId);
    const controller = paneId ? getRemoteDesktopController(paneId) : undefined;
    const text = typeof args.text === "string" ? args.text : "";
    if (!paneId || !controller || !text) {
      return { ok: false, error: "Remote desktop paneId and text are required." };
    }
    await controller.sendText(text, args.pressEnter !== false);
    return { ok: true, paneId, kind: controller.kind };
  }

  async function assistantRemoteDesktopKeyPress(args: Record<string, unknown>) {
    const paneId = activeRemoteDesktopPaneIdForLiveTool(args.paneId);
    const controller = paneId ? getRemoteDesktopController(paneId) : undefined;
    const key = typeof args.key === "string" ? args.key : "";
    if (!paneId || !controller || !key) {
      return { ok: false, error: "Remote desktop paneId and key are required." };
    }
    await controller.keyPress(key);
    return { ok: true, paneId, kind: controller.kind, key };
  }

  async function assistantRemoteDesktopMouseClick(args: Record<string, unknown>) {
    const paneId = activeRemoteDesktopPaneIdForLiveTool(args.paneId);
    const controller = paneId ? getRemoteDesktopController(paneId) : undefined;
    if (!paneId || !controller?.mouseClick) {
      return { ok: false, error: "No active remote desktop Session is available for mouse input." };
    }
    const x = typeof args.x === "number" ? Math.max(0, Math.trunc(args.x)) : 0;
    const y = typeof args.y === "number" ? Math.max(0, Math.trunc(args.y)) : 0;
    const button = args.button === "right" || args.button === "middle" ? args.button : "left";
    await controller.mouseClick(x, y, button);
    return { ok: true, paneId, x, y, button };
  }

  async function assistantFileBrowserList(args: Record<string, unknown>) {
    const tabId = activeFileBrowserTabIdForLiveTool(args.tabId);
    const controller = tabId ? getFileBrowserController(tabId) : undefined;
    if (!tabId || !controller) {
      return { ok: false, error: "No active SFTP/FTP file browser Session is available." };
    }
    const path = typeof args.path === "string" ? args.path : null;
    const listing = await controller.list(path);
    return { ok: true, tabId, kind: controller.kind, listing };
  }

  async function assistantFileBrowserCreateFolder(args: Record<string, unknown>) {
    const tabId = activeFileBrowserTabIdForLiveTool(args.tabId);
    const controller = tabId ? getFileBrowserController(tabId) : undefined;
    const parentPath = typeof args.parentPath === "string" ? args.parentPath : "";
    const name = typeof args.name === "string" ? args.name : "";
    if (!tabId || !controller || !parentPath || !name) {
      return { ok: false, error: "File browser tabId, parentPath, and name are required." };
    }
    const result = await controller.createFolder(parentPath, name);
    return { ok: true, tabId, kind: controller.kind, result };
  }

  async function assistantFileBrowserRename(args: Record<string, unknown>) {
    const tabId = activeFileBrowserTabIdForLiveTool(args.tabId);
    const controller = tabId ? getFileBrowserController(tabId) : undefined;
    const path = typeof args.path === "string" ? args.path : "";
    const newName = typeof args.newName === "string" ? args.newName : "";
    if (!tabId || !controller || !path || !newName) {
      return { ok: false, error: "File browser tabId, path, and newName are required." };
    }
    const result = await controller.rename(path, newName);
    return { ok: true, tabId, kind: controller.kind, result };
  }

  async function assistantFileBrowserDelete(args: Record<string, unknown>) {
    const tabId = activeFileBrowserTabIdForLiveTool(args.tabId);
    const controller = tabId ? getFileBrowserController(tabId) : undefined;
    const path = typeof args.path === "string" ? args.path : "";
    if (!tabId || !controller || !path) {
      return { ok: false, error: "File browser tabId and path are required." };
    }
    const result = await controller.deletePath(path);
    return { ok: true, tabId, kind: controller.kind, result };
  }

  function quickCommandsForConnection(connectionId: string) {
    const store = useWorkspaceStore.getState();
    store.ensureQuickCommandsLoaded(connectionId);
    return useWorkspaceStore.getState().quickCommandsByConnection[connectionId] ?? [];
  }

  function assistantQuickCommandList(args: Record<string, unknown>) {
    const connectionId = typeof args.connectionId === "string" ? args.connectionId.trim() : "";
    if (!connectionId) {
      return { ok: false, error: "connectionId is required." };
    }
    return {
      ok: true,
      connectionId,
      quickCommands: quickCommandsForConnection(connectionId),
    };
  }

  function assistantQuickCommandRead(args: Record<string, unknown>) {
    const connectionId = typeof args.connectionId === "string" ? args.connectionId.trim() : "";
    const id = typeof args.id === "string" ? args.id.trim() : "";
    if (!connectionId || !id) {
      return { ok: false, error: "connectionId and id are required." };
    }
    const command = quickCommandsForConnection(connectionId).find((entry) => entry.id === id);
    if (!command) {
      return { ok: false, error: "Quick Command was not found.", connectionId, id };
    }
    return { ok: true, connectionId, quickCommand: command };
  }

  function assistantQuickCommandCreate(args: Record<string, unknown>) {
    const connectionId = typeof args.connectionId === "string" ? args.connectionId.trim() : "";
    const label = typeof args.label === "string" ? args.label.trim() : "";
    const commandText = typeof args.command === "string" ? args.command.trim() : "";
    if (!connectionId || !label || !commandText) {
      return { ok: false, error: "connectionId, label, and command are required." };
    }
    const iconName = typeof args.iconName === "string" && isIconName(args.iconName)
      ? args.iconName
      : "Terminal";
    const accentName = typeof args.accentName === "string" && isAccentName(args.accentName)
      ? args.accentName
      : "default";
    const quickCommand: QuickCommand = {
      id: assistantQuickCommandId(),
      label,
      command: commandText,
      iconName,
      accentName,
      sendEnter: args.sendEnter === true,
      confirm: args.confirm === true,
    };
    useWorkspaceStore.getState().addQuickCommand(connectionId, quickCommand);
    return { ok: true, connectionId, quickCommand };
  }

  function assistantQuickCommandEdit(args: Record<string, unknown>) {
    const connectionId = typeof args.connectionId === "string" ? args.connectionId.trim() : "";
    const id = typeof args.id === "string" ? args.id.trim() : "";
    if (!connectionId || !id) {
      return { ok: false, error: "connectionId and id are required." };
    }
    const existing = quickCommandsForConnection(connectionId).find((entry) => entry.id === id);
    if (!existing) {
      return { ok: false, error: "Quick Command was not found.", connectionId, id };
    }
    const nextLabel = typeof args.label === "string" ? args.label.trim() : existing.label;
    const nextCommand = typeof args.command === "string" ? args.command.trim() : existing.command;
    if (!nextLabel || !nextCommand) {
      return { ok: false, error: "label and command cannot be empty.", connectionId, id };
    }
    const quickCommand: QuickCommand = {
      ...existing,
      label: nextLabel,
      command: nextCommand,
      iconName: typeof args.iconName === "string" && isIconName(args.iconName)
        ? args.iconName
        : existing.iconName,
      accentName: typeof args.accentName === "string" && isAccentName(args.accentName)
        ? args.accentName
        : existing.accentName,
      sendEnter: typeof args.sendEnter === "boolean" ? args.sendEnter : existing.sendEnter,
      confirm: typeof args.confirm === "boolean" ? args.confirm : existing.confirm,
    };
    useWorkspaceStore.getState().updateQuickCommand(connectionId, quickCommand);
    return { ok: true, connectionId, quickCommand };
  }

  async function handleToolPermissionModeChange(toolPermissionMode: AiToolPermissionMode) {
    setPermissionMenuOpen(false);
    if (toolPermissionMode === currentToolPermissionMode) {
      return;
    }

    const previousSettings = aiProviderSettings;
    const nextSettings = normalizeAiProviderDraft({
      ...previousSettings,
      toolPermissionMode,
    });
    setAiProviderSettings(nextSettings);
    setChatError("");

    if (!isTauriRuntime()) {
      return;
    }

    try {
      const saved = await invokeCommand("update_ai_provider_settings", {
        request: nextSettings,
      });
      setAiProviderSettings(saved);
    } catch (error) {
      setAiProviderSettings(previousSettings);
      setChatError(error instanceof Error ? error.message : String(error));
    }
  }

  function handleAddFiles() {
    setAddContextMenuOpen(false);
    fileInputRef.current?.click();
  }

  async function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (files.length === 0) {
      return;
    }

    try {
      const imageAttachments: AssistantImageAttachment[] = [];
      const fileAttachments: AssistantFileAttachment[] = [];
      for (const file of files) {
        if (file.size > ASSISTANT_FILE_MAX_BYTES) {
          showStatusBarNotice(t("ai.fileTooLarge", { name: file.name }), { tone: "warning" });
          continue;
        }
        const dataUrl = await readFileAsDataUrl(file);
        if (file.type.startsWith("image/")) {
          imageAttachments.push(await createImageAttachment(file.name, dataUrl));
          continue;
        }
        fileAttachments.push({
          id: `assistant-file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sourceLabel: file.name,
          dataUrl,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        });
      }
      if (imageAttachments.length > 0) {
        setPastedImageContexts((current) => [...current, ...imageAttachments]);
      }
      if (fileAttachments.length > 0) {
        setFileContexts((current) => [...current, ...fileAttachments]);
      }
      setImagePasteRejected(false);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : String(error));
    } finally {
      composerTextareaRef.current?.focus();
    }
  }

  function handleOpenAssistantLink(url: string) {
    openExternalUrl(url).catch((error) => {
      setChatError(error instanceof Error ? error.message : String(error));
    });
  }

  function handleAddScreenshot() {
    setAddContextMenuOpen(false);
    if (activeTab?.kind === "remoteDesktop" && activeTab.connection?.type === "rdp") {
      requestRdpPreCapture();
    }
    setScreenshotRegionState({ bounds: appViewportBounds() });
  }

  function handleSelectAssistantIntent(intent: AssistantPromptIntent) {
    setAssistantIntent(intent);
    setAddContextMenuOpen(false);
    const all = assistantIntentExamples(intent, t);
    setDisplayedIntentExamples(sampleRandom(all, 3));
    window.requestAnimationFrame(() => {
      composerTextareaRef.current?.focus();
    });
  }

  function handleClearAssistantIntent() {
    setAssistantIntent("chat");
    setDisplayedIntentExamples([]);
    window.requestAnimationFrame(() => {
      composerTextareaRef.current?.focus();
    });
  }

  function handleUseIntentExample(example: string) {
    setPrompt(example);
    window.requestAnimationFrame(() => {
      composerTextareaRef.current?.focus();
    });
  }

  async function handleAddTerminalBuffer() {
    setAddContextMenuOpen(false);
    const pane = activeFocusedTerminalPane;
    if (!pane) {
      return;
    }

    let text = "";
    if (pane.connection?.type === "ssh" && pane.tmuxSessionId) {
      try {
        text = await invokeCommand("capture_tmux_pane", {
          request: {
            host: pane.connection.host,
            user: pane.connection.user,
            port: pane.connection.port,
            keyPath: pane.connection.keyPath,
            proxyJump: pane.connection.proxyJump,
            authMethod: pane.connection.authMethod,
            secretOwnerId: connectionPasswordOwnerId(pane.connection),
            tmuxSessionId: pane.tmuxSessionId,
            bufferLines: useWorkspaceStore.getState().sshSettings.bufferLines,
          },
        });
      } catch {
        text = getPaneRenderer(pane.id)?.getBufferText() ?? "";
      }
    } else {
      text = getPaneRenderer(pane.id)?.getBufferText() ?? "";
    }

    const trimmed = text.trim();
    if (!trimmed) {
      composerTextareaRef.current?.focus();
      return;
    }
    const sourceLabel = pane.connection
      ? `${pane.connection.name} ${t("terminal.terminalBuffer")}`
      : `${pane.title} ${t("terminal.terminalBuffer")}`;
    setAssistantContextSnippet({
      id: `terminal-buffer-${Date.now()}`,
      kind: "text",
      sourceLabel,
      text: trimmed,
      capturedAt: new Date().toISOString(),
    });
    composerTextareaRef.current?.focus();
  }

  async function generateThreadTitleFromProvider(
    userPrompt: string,
    requestIntent: AssistantPromptIntent,
  ) {
    const response = await invokeCommand("run_ai_agent", {
      request: {
        prompt:
          "Create a concise chat title for this user request. Return only the title, no quotes, no markdown, maximum 8 words.\n\nUser request:\n" +
          userPrompt,
        contextLabel,
        intent: assistantAgentIntent(requestIntent),
        messages: [],
        pageContext: pageContextPayload,
        allowTools: false,
        outputLanguage: resolveAssistantOutputLanguage(aiProviderSettings.outputLanguage),
      },
    });
    return sanitizeAssistantThreadTitle(response.content);
  }

  function setAssistantPromptQueueState(
    next:
      | AssistantQueuedPrompt[]
      | ((current: AssistantQueuedPrompt[]) => AssistantQueuedPrompt[]),
  ) {
    setAssistantPromptQueue((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      assistantPromptQueueRef.current = resolved;
      return resolved;
    });
  }

  function queueAssistantPrompt(
    normalizedPrompt: string,
    requestIntent: AssistantPromptIntent,
    contextSnippet?: AssistantContextSnippet,
  ) {
    const queuedPrompt: AssistantQueuedPrompt = {
      id: `assistant-queued-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      intent: requestIntent,
      prompt: normalizedPrompt,
      contextSnippet,
    };
    setAssistantPromptQueueState((current) => [...current, queuedPrompt]);
    setPrompt("");
    setAssistantIntent("chat");
    setDisplayedIntentExamples([]);
    setChatError("");
    window.requestAnimationFrame(() => {
      composerTextareaRef.current?.focus();
    });
  }

  function removeQueuedAssistantPrompt(id: string) {
    setAssistantPromptQueueState((current) => current.filter((item) => item.id !== id));
  }

  function runQueuedAssistantPrompt() {
    const [nextPrompt, ...remaining] = assistantPromptQueueRef.current;
    if (!nextPrompt) {
      return;
    }
    setAssistantPromptQueueState(remaining);
    window.setTimeout(() => {
      void runAssistantPrompt(
        nextPrompt.prompt,
        nextPrompt.intent,
        Boolean(nextPrompt.contextSnippet),
        nextPrompt.contextSnippet,
      );
    }, 0);
  }

  useEffect(() => {
    if (!assistantDirectSubmitRequest) {
      return;
    }
    clearAssistantDirectSubmitRequest(assistantDirectSubmitRequest.id);
    const normalizedPrompt = assistantDirectSubmitRequest.prompt.trim();
    if (!normalizedPrompt) {
      return;
    }
    const requestIntent = assistantIntentForPrompt("chat", normalizedPrompt);
    if (isSendingPrompt) {
      queueAssistantPrompt(
        normalizedPrompt,
        requestIntent,
        assistantDirectSubmitRequest.snippet,
      );
      return;
    }
    void runAssistantPrompt(
      normalizedPrompt,
      "chat",
      true,
      assistantDirectSubmitRequest.snippet,
    );
  }, [assistantDirectSubmitRequest]);

  async function submitAssistantPrompt() {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) {
      return;
    }
    const requestIntent = assistantIntentForPrompt(assistantIntent, normalizedPrompt);
    if (isSendingPrompt) {
      queueAssistantPrompt(normalizedPrompt, requestIntent);
      return;
    }

    await runAssistantPrompt(normalizedPrompt, assistantIntent, true);
  }

  async function runAssistantPrompt(
    normalizedPrompt: string,
    selectedAssistantIntent: AssistantPromptIntent,
    includeComposerContext: boolean,
    contextSnippetOverride?: AssistantContextSnippet,
  ) {
    const requestIntent = assistantIntentForPrompt(selectedAssistantIntent, normalizedPrompt);
    setAssistantIntent(requestIntent);
    const contextSnippet = contextSnippetOverride ?? assistantContextSnippet;
    const textAttachments: AssistantTextAttachment[] =
      includeComposerContext && contextSnippet?.kind === "text"
        ? [
            {
              id: contextSnippet.id,
              sourceLabel: contextSnippet.sourceLabel,
              text: contextSnippet.text,
              capturedAt: contextSnippet.capturedAt,
            },
          ]
        : [];
    let imageAttachments: AssistantImageAttachment[] = [];
    if (includeComposerContext && currentModelSupportsImageInput) {
      imageAttachments = [...pastedImageContexts];
      const screenshotContext =
        contextSnippet?.kind === "screenshot"
          ? {
              sourceLabel: contextSnippet.sourceLabel,
              dataUrl: contextSnippet.imageDataUrl,
            }
          : undefined;
      if (screenshotContext) {
        try {
          imageAttachments = [
            ...imageAttachments,
            await createImageAttachment(
              screenshotContext.sourceLabel,
              screenshotContext.dataUrl,
            ),
          ];
        } catch (error) {
          setChatError(error instanceof Error ? error.message : String(error));
          return;
        }
      }
    }
    const selectedFileContexts = includeComposerContext ? fileContexts : [];
    const userMessage = createAssistantChatMessage(
      "user",
      normalizedPrompt,
      requestIntent,
      textAttachments.length > 0 ? textAttachments : undefined,
      imageAttachments.length > 0 ? imageAttachments : undefined,
      selectedFileContexts.length > 0 ? selectedFileContexts : undefined,
    );
    userMessage.runManifest = createAssistantRunManifest(normalizedPrompt, requestIntent);
    const previousMessages = messagesRef.current;
    const nextMessages = [...previousMessages, userMessage];
    messagesRef.current = nextMessages;
    forceChatScrollToBottomRef.current = true;
    const isFirstThreadMessage = previousMessages.length === 0;
    const fallbackTitle = currentThreadTitle ?? assistantThreadTitle(nextMessages);
    try {
      validateAiProviderForChat(aiProviderSettings, aiProviderHasApiKey);
    } catch (error) {
      const providerErrorMessage = error instanceof Error ? error.message : String(error);
      const missingProviderKey =
        providerDefinition.requiresApiKey && !aiProviderHasApiKey;
      const assistantMessage = createAssistantChatMessage(
        "assistant",
        missingProviderKey
          ? createAiProviderSecretRequestMarkdown(
              providerDefinition.apiKeyLabel,
              providerDefinition.label,
              aiProviderSettings.providerKind,
            )
          : `${t("ai.providerError")}: ${providerErrorMessage}`,
        requestIntent,
      );
      assistantMessage.runManifest = createAssistantRunManifest(normalizedPrompt, requestIntent);
      const failedMessages = [...nextMessages, assistantMessage];
      messagesRef.current = failedMessages;
      setMessages(failedMessages);
      setCurrentThreadTitle(fallbackTitle);
      saveChatMessages(failedMessages, fallbackTitle);
      setPrompt("");
      setAssistantIntent("chat");
      setDisplayedIntentExamples([]);
      if (includeComposerContext) {
        setPastedImageContexts([]);
        setFileContexts([]);
      }
      setImagePasteRejected(false);
      if (includeComposerContext && assistantContextSnippet && !contextSnippetOverride) {
        clearAssistantContextSnippet();
      }
      setChatError("");
      return;
    }

    const history = previousMessages.map((message) => ({
      role: message.role,
      content: message.content,
      reasoningContent: message.reasoningContent,
      toolCalls:
        message.role === "assistant"
          ? (message.toolCalls ?? [])
              .filter((toolCall) => toolCall.status === "completed")
              .map((toolCall) => ({ toolName: toolCall.toolName, error: toolCall.error }))
          : undefined,
    }));
    setMessages(nextMessages);
    setCurrentThreadTitle(fallbackTitle);
    saveChatMessages(nextMessages, fallbackTitle);
    setPrompt("");
    setAssistantIntent("chat");
    setDisplayedIntentExamples([]);
    if (includeComposerContext) {
      setPastedImageContexts([]);
      setFileContexts([]);
    }
    setImagePasteRejected(false);
    if (includeComposerContext && assistantContextSnippet && !contextSnippetOverride) {
      clearAssistantContextSnippet();
    }
    setChatError("");
    setPendingToolApprovals([]);
    setIsSendingPrompt(true);
    const requestId = activeAssistantRequestIdRef.current + 1;
    activeAssistantRequestIdRef.current = requestId;
    const workStartedAt = new Date().toISOString();
    let threadTitle = fallbackTitle;
    // Hoisted so both the success and error paths can cancel a pending
    // streaming-flush timer (declared/used inside the try below).
    let streamingFlushTimer: ReturnType<typeof setTimeout> | null = null;
    const cancelStreamingFlush = () => {
      if (streamingFlushTimer !== null) {
        clearTimeout(streamingFlushTimer);
        streamingFlushTimer = null;
      }
    };
    try {
      if (isFirstThreadMessage) {
        const generatedTitle = await generateThreadTitleFromProvider(normalizedPrompt, requestIntent);
        if (activeAssistantRequestIdRef.current !== requestId) {
          return;
        }
        if (generatedTitle) {
          threadTitle = generatedTitle;
          setCurrentThreadTitle(generatedTitle);
          saveChatMessages(nextMessages, generatedTitle);
        }
      }

      const systemContext = await inspectActiveSshSystemContext(activeTab);
      if (activeAssistantRequestIdRef.current !== requestId) {
        return;
      }

      const streamingMessage = createAssistantChatMessage(
        "assistant",
        "",
        requestIntent,
      );
      streamingMessage.isStreaming = true;
      streamingMessage.workStartedAt = workStartedAt;
      streamingMessage.runManifest = createAssistantRunManifest(normalizedPrompt, requestIntent);
      let streamingMessageSnapshot = streamingMessage;
      const messagesWithStreaming = [...nextMessages, streamingMessage];
      messagesRef.current = messagesWithStreaming;
      setMessages(messagesWithStreaming);

      // Coalesce rapid token deltas into ~20fps UI updates. Re-rendering the
      // message list (and re-parsing the growing markdown) on every delta
      // scales poorly with reply length; flushing on a short timer keeps the
      // stream visibly live while bounding render cost. The completion and
      // error paths force-flush / cancel so the final snapshot always wins.
      const flushStreamingSnapshot = () => {
        streamingFlushTimer = null;
        setMessages((current) =>
          current.map((message) =>
            message.id === streamingMessage.id ? streamingMessageSnapshot : message,
          ),
        );
      };

      const channel = new Channel<AiStreamEvent>();
      channel.onmessage = (event: AiStreamEvent) => {
        if (activeAssistantRequestIdRef.current !== requestId) {
          return;
        }
        logAssistantStreamEvent(event);
        if (event.type === "toolCallEnd" && isDashboardMutatingTool(event.toolName)) {
          if (event.error) {
            useWorkspaceStore.getState().showStatusBarNotice(
              `${event.toolName} failed: ${event.error}`,
              { tone: "error", durationMs: 8_000 },
            );
          } else {
            void useDashboardStore.getState().load();
          }
        }
        streamingMessageSnapshot = {
          ...streamingMessageSnapshot,
          ...applyAssistantStreamEventToMessage(streamingMessageSnapshot, event, {
            errorPrefix: t("ai.errorPrefix"),
            now: () => new Date().toISOString(),
            workStartedAt,
          }),
        };
        streamingMessageSnapshot.runManifest = createAssistantRunManifest(
          normalizedPrompt,
          requestIntent,
          streamingMessageSnapshot.toolCalls,
        );
        if (streamingFlushTimer === null) {
          streamingFlushTimer = setTimeout(flushStreamingSnapshot, 50);
        }
      };

      const response = await invokeCommand("run_ai_agent_streaming", {
        channel,
        request: {
          prompt: assistantPromptForIntent(requestIntent, normalizedPrompt, previousMessages),
          contextLabel,
          intent: assistantAgentIntent(requestIntent),
          selectedOutput: textAttachments[0]?.text,
          pageContext: pageContextPayload,
          screenshots: imageAttachments.map((attachment) => ({
            sourceLabel: attachment.sourceLabel,
            dataUrl: attachment.imageDataUrl,
          })),
          files: selectedFileContexts.map((attachment) => ({
            sourceLabel: attachment.sourceLabel,
            dataUrl: attachment.dataUrl,
            mimeType: attachment.mimeType,
          })),
          systemContext,
          messages: history,
          outputLanguage: resolveAssistantOutputLanguage(aiProviderSettings.outputLanguage),
        },
      });

      cancelStreamingFlush();
      if (activeAssistantRequestIdRef.current !== requestId) {
        return;
      }

      const completedAt = new Date().toISOString();
      streamingMessageSnapshot = completeAssistantStreamMessageFromResponse(
        streamingMessageSnapshot,
        response,
      );
      streamingMessageSnapshot = {
        ...streamingMessageSnapshot,
        isStreaming: false,
        workCompletedAt: completedAt,
        toolCalls: (streamingMessageSnapshot.toolCalls ?? []).map((tc) =>
          tc.status === "running" ? { ...tc, status: "completed", endedAt: completedAt } : tc,
        ),
      };
      streamingMessageSnapshot.runManifest = createAssistantRunManifest(
        normalizedPrompt,
        requestIntent,
        streamingMessageSnapshot.toolCalls,
      );
      setMessages((current) =>
        current.map((message) => {
          const nextMessage =
            message.id === streamingMessage.id ? streamingMessageSnapshot : message;
          return nextMessage;
        }),
      );
      messagesRef.current = [...nextMessages, streamingMessageSnapshot];
      saveChatMessages([...nextMessages, streamingMessageSnapshot], threadTitle);
    } catch (error) {
      cancelStreamingFlush();
      if (activeAssistantRequestIdRef.current !== requestId) {
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      setChatError(message);
      const failedMessages = [
        ...nextMessages,
        (() => {
          const failedMessage = createAssistantChatMessage(
            "assistant",
            `${t("ai.errorPrefix")}: ${message}`,
            requestIntent,
          );
          failedMessage.runManifest = createAssistantRunManifest(normalizedPrompt, requestIntent, [
            {
              toolId: "assistant-request",
              toolName: "assistant.request",
              status: "completed",
              startedAt: workStartedAt,
              endedAt: new Date().toISOString(),
              error: message,
            },
          ]);
          return failedMessage;
        })(),
      ];
      messagesRef.current = failedMessages;
      setMessages(failedMessages);
      saveChatMessages(failedMessages, threadTitle);
    } finally {
      if (activeAssistantRequestIdRef.current === requestId) {
        setIsSendingPrompt(false);
        runQueuedAssistantPrompt();
      }
    }
  }

  function denyAssistantToolApproval(request: PendingToolApproval) {
    activeAssistantRequestIdRef.current += 1;
    setIsSendingPrompt(false);
    setChatError("");
    const completedAt = new Date().toISOString();
    setMessages((current) =>
      current.map((message) =>
        message.isStreaming
          ? {
              ...message,
              isStreaming: false,
              workCompletedAt: completedAt,
              toolCalls: (message.toolCalls ?? []).map((toolCall) =>
                toolCall.status === "running"
                  ? { ...toolCall, status: "completed", endedAt: completedAt }
                  : toolCall,
              ),
            }
          : message,
      ),
    );
    void completeAssistantToolApproval(request.requestId, false);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter") {
      return;
    }

    if (event.ctrlKey) {
      event.preventDefault();
      const textarea = event.currentTarget;
      const selectionStart = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;
      const nextPrompt = `${prompt.slice(0, selectionStart)}\n${prompt.slice(selectionEnd)}`;
      const nextCaret = selectionStart + 1;
      setPrompt(nextPrompt);
      window.requestAnimationFrame(() => {
        composerTextareaRef.current?.setSelectionRange(nextCaret, nextCaret);
      });
      return;
    }

    if (event.metaKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    void submitAssistantPrompt();
  }

  async function handleComposerPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const clipboardFiles = Array.from(event.clipboardData.files).filter((file) =>
      file.type.startsWith("image/"),
    );
    const imageFiles =
      clipboardFiles.length > 0
        ? clipboardFiles
        : Array.from(event.clipboardData.items).flatMap((item) => {
            if (!item.type.startsWith("image/")) {
              return [];
            }
            const file = item.getAsFile();
            return file ? [file] : [];
          });
    if (imageFiles.length === 0) {
      return;
    }

    event.preventDefault();
    if (!currentModelSupportsImageInput) {
      setImagePasteRejected(true);
      return;
    }

    try {
      const attachments = await Promise.all(
        imageFiles.map(async (imageFile, index) => {
          const dataUrl = await readImageFileAsDataUrl(imageFile);
          const attachment = await createImageAttachment(t("ai.pastedImageSource"), dataUrl);
          return imageFiles.length === 1
            ? attachment
            : {
                ...attachment,
                sourceLabel: t("ai.pastedImageSourceWithNumber", { number: index + 1 }),
              };
        }),
      );
      setPastedImageContexts((current) => [...current, ...attachments]);
      setImagePasteRejected(false);
    } catch (error) {
      setImagePasteRejected(true);
      setChatError(error instanceof Error ? error.message : String(error));
    }
  }

  function insertTextIntoComposer(textarea: HTMLTextAreaElement, text: string) {
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const nextPrompt = `${textarea.value.slice(0, selectionStart)}${text}${textarea.value.slice(selectionEnd)}`;
    const nextCaret = selectionStart + text.length;
    setPrompt(nextPrompt);
    window.requestAnimationFrame(() => {
      composerTextareaRef.current?.focus();
      composerTextareaRef.current?.setSelectionRange(nextCaret, nextCaret);
    });
  }

  function deleteComposerSelection(textarea: HTMLTextAreaElement) {
    insertTextIntoComposer(textarea, "");
  }

  function handleTopbarDoubleClick(event: MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button, a, input, textarea, select")) {
      return;
    }
    onTogglePanel?.();
  }

  function selectedAssistantPanelText(panel: HTMLElement) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return "";
    }

    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;
    if (
      (!anchorNode || !panel.contains(anchorNode)) &&
      (!focusNode || !panel.contains(focusNode))
    ) {
      return "";
    }

    return selection.toString();
  }

  async function handleAssistantPanelContextMenu(event: MouseEvent<HTMLElement>) {
    const selectedText = selectedAssistantPanelText(event.currentTarget);
    if (!selectedText || !isTauriRuntime()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    await showNativeContextMenu(
      [
        {
          kind: "item",
          label: t("common.copy"),
          action: () => {
            void writeToClipboard(selectedText);
          },
        },
      ],
      { x: event.clientX, y: event.clientY },
    );
  }

  async function handleComposerContextMenu(event: MouseEvent<HTMLTextAreaElement>) {
    event.preventDefault();
    event.stopPropagation();

    const textarea = event.currentTarget;
    const hasSelection = textarea.selectionStart !== textarea.selectionEnd;
    const opened = await showNativeContextMenu(
      [
        {
          kind: "item",
          label: t("common.copy"),
          disabled: !hasSelection,
          action: () => {
            const selectedText = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
            if (selectedText) {
              void writeToClipboard(selectedText);
            }
            textarea.focus();
          },
        },
        {
          kind: "item",
          label: t("common.cut"),
          disabled: !hasSelection || textarea.disabled,
          action: () => {
            const selectedText = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
            if (selectedText) {
              void writeToClipboard(selectedText);
              deleteComposerSelection(textarea);
            }
          },
        },
        {
          kind: "item",
          label: t("common.paste"),
          disabled: textarea.disabled,
          action: () => {
            void readFromClipboard().then((text) => {
              if (text) {
                insertTextIntoComposer(textarea, text);
              } else {
                textarea.focus();
              }
            });
          },
        },
      ],
      { x: event.clientX, y: event.clientY },
    );

    if (!opened) {
      textarea.focus();
    }
  }

  async function captureAssistantScreenshot(rect: CaptureScreenshotRequest) {
    if (!isTauriRuntime()) {
      showStatusBarNotice(t("workspace.screenshotsRequireRuntime"), { tone: "warning" });
      return;
    }

    try {
      await waitForScreenshotSurface();
      const screenshot = await invokeCommand("capture_screenshot_for_assistant", {
        request: rect,
      });
      setAssistantContextSnippet({
        id: `assistant-screenshot-${Date.now()}`,
        kind: "screenshot",
        sourceLabel: t("workspace.screenshot"),
        imageDataUrl: screenshot.dataUrl,
        width: screenshot.width,
        height: screenshot.height,
        capturedAt: new Date().toISOString(),
      });
      showStatusBarNotice(t("workspace.sentToAi"), { tone: "success" });
    } catch (error) {
      showStatusBarNotice(
        t("workspace.screenshotCaptureError", {
          message: error instanceof Error ? error.message : String(error),
        }),
        { tone: "error" },
      );
    } finally {
      composerTextareaRef.current?.focus();
    }
  }

  function handleScreenshotRegionPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      !screenshotRegionState ||
      !pointInBounds(event.clientX, event.clientY, screenshotRegionState.bounds)
    ) {
      return;
    }
    const point = clampPointToBounds(
      event.clientX,
      event.clientY,
      screenshotRegionState.bounds,
    );
    event.currentTarget.setPointerCapture(event.pointerId);
    setScreenshotRegionState({
      ...screenshotRegionState,
      pointerId: event.pointerId,
      start: point,
      current: point,
    });
  }

  function handleScreenshotRegionPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      !screenshotRegionState?.start ||
      screenshotRegionState.pointerId !== event.pointerId
    ) {
      return;
    }
    setScreenshotRegionState({
      ...screenshotRegionState,
      current: clampPointToBounds(
        event.clientX,
        event.clientY,
        screenshotRegionState.bounds,
      ),
    });
  }

  function handleScreenshotRegionPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      !screenshotRegionState?.start ||
      screenshotRegionState.pointerId !== event.pointerId
    ) {
      return;
    }
    const current = clampPointToBounds(
      event.clientX,
      event.clientY,
      screenshotRegionState.bounds,
    );
    const rect = rectFromPoints(screenshotRegionState.start, current);
    setScreenshotRegionState(null);
    if (rect.width < 4 || rect.height < 4) {
      return;
    }
    void captureAssistantScreenshot(rect);
  }

  function handleScreenshotRegionKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setScreenshotRegionState(null);
      composerTextareaRef.current?.focus();
    }
  }

  const screenshotSelectionRect =
    screenshotRegionState?.start && screenshotRegionState.current
      ? rectFromPoints(screenshotRegionState.start, screenshotRegionState.current)
      : null;

  useLayoutEffect(() => {
    const labelWidth = maxMeasuredTextWidth(permissionWidthMeasureRef.current);
    const wrapper = permissionMenuRef.current;
    if (wrapper && labelWidth > 0) {
      wrapper.style.setProperty("--assistant-permission-control-width", `${Math.ceil(labelWidth + 59)}px`);
      wrapper.style.setProperty("--assistant-permission-menu-width", `${Math.ceil(labelWidth + 72)}px`);
    }

    const modelWidth = maxMeasuredTextWidth(modelWidthMeasureRef.current);
    const select = modelSelectRef.current;
    if (select && modelWidth > 0) {
      select.style.setProperty("--assistant-model-select-width", `${Math.ceil(modelWidth + 38)}px`);
    }
  }, [modelSelectLabels, toolPermissionLabels]);

  useLayoutEffect(() => {
    const node = regionTargetRef.current;
    if (!node || !screenshotRegionState) {
      return;
    }

    node.style.height = `${screenshotRegionState.bounds.height}px`;
    node.style.left = `${screenshotRegionState.bounds.left}px`;
    node.style.top = `${screenshotRegionState.bounds.top}px`;
    node.style.width = `${screenshotRegionState.bounds.width}px`;
  }, [
    screenshotRegionState?.bounds.height,
    screenshotRegionState?.bounds.left,
    screenshotRegionState?.bounds.top,
    screenshotRegionState?.bounds.width,
  ]);

  useLayoutEffect(() => {
    const node = regionSelectionRef.current;
    if (!node || !screenshotSelectionRect) {
      return;
    }

    node.style.height = `${screenshotSelectionRect.height}px`;
    node.style.left = `${screenshotSelectionRect.x}px`;
    node.style.top = `${screenshotSelectionRect.y}px`;
    node.style.width = `${screenshotSelectionRect.width}px`;
  }, [
    screenshotSelectionRect?.height,
    screenshotSelectionRect?.width,
    screenshotSelectionRect?.x,
    screenshotSelectionRect?.y,
  ]);

  useEffect(() => {
    if (!screenshotRegionState) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      regionTargetRef.current?.parentElement?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [screenshotRegionState]);

  return (
    <aside
      className="assistant-panel"
      onContextMenu={(event) => void handleAssistantPanelContextMenu(event)}
    >
      <div className="assistant-topbar" onDoubleClick={handleTopbarDoubleClick}>
        <h2>{t("ai.title")}</h2>
        <button
          aria-label={t("ai.refresh")}
          className="assistant-toolbar-button"
          title={t("ai.refresh")}
          type="button"
        >
          <RefreshCw size={16} />
        </button>
        <button
          aria-label={t("ai.settings")}
          className="assistant-toolbar-button"
          onClick={onOpenSettings}
          title={t("ai.settings")}
          type="button"
        >
          <Settings size={16} />
        </button>
        <button
          aria-label={t("ai.newAiChat")}
          className="assistant-toolbar-button"
          disabled={isSendingPrompt}
          onClick={handleNewChat}
          title={t("ai.newChat")}
          type="button"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="assistant-context active-session-hint">
        {!pageContext && activeTab?.connection ? (
          <ConnectionIcon
            localShell={activeTab.connection.localShell}
            size={32}
            type={activeTab.connection.type}
          />
        ) : (
          <Bot size={16} />
        )}
        <span>
          <strong>{contextLabel}</strong>
          <small>{connectionLabel}</small>
        </span>
      </div>

      {assistantIntent === "extensionCreation" ? (
        <div className="assistant-context assistant-extension-context">
          <Plus size={16} />
          <span>
            <strong>{t("ai.extensionDraft")}</strong>
            <small>{t("ai.extensionReviewOnly")}</small>
          </span>
        </div>
      ) : null}

      {pageContext?.contextKind === "dashboard" && !dashboardToolsEnabled ? (
        <div className="assistant-context assistant-dashboard-tools-context">
          <Bot size={16} />
          <span>
            <strong>{t("ai.dashboardToolsDisabledTitle")}</strong>
            <small>{t("ai.dashboardToolsDisabledHint")}</small>
          </span>
        </div>
      ) : null}

      {shouldShowChatHistory ? (
        <section className={`assistant-tasks${showAllChats ? " assistant-chat-history-panel" : ""}`}>
          <header>
            <span>{showAllChats ? t("ai.allChats") : t("ai.chats")}</span>
            {showAllChats ? (
              <button
                className="assistant-toolbar-button"
                onClick={() => setShowAllChats(false)}
                type="button"
                aria-label={t("ai.closeChatHistory")}
                title={t("ai.close")}
              >
                <X size={15} />
              </button>
            ) : (
              <button
                className="assistant-view-all-button"
                disabled={sortedChatHistory.length === 0}
                onClick={() => setShowAllChats(true)}
                type="button"
              >
                {t("ai.viewAll")}({sortedChatHistory.length})
              </button>
            )}
          </header>
          {showAllChats ? (
            <div className="assistant-chat-history-list">
              {sortedChatHistory.map((thread) => (
                <div className="assistant-chat-history-row-wrap" key={thread.id}>
                  <button
                    className="assistant-chat-history-row"
                    onClick={() => resumeChat(thread)}
                    type="button"
                  >
                    <strong>{thread.title}</strong>
                    <span>{assistantThreadPreview(thread)}</span>
                    <small>{formatAssistantMessageTime(thread.updatedAt)}</small>
                  </button>
                  <button
                    aria-label={t("ai.deleteChat", { title: thread.title })}
                    className="assistant-chat-history-delete"
                    onClick={() => deleteChat(thread.id)}
                    title={t("ai.deleteChat", { title: thread.title })}
                    type="button"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : recentChatHistory.length > 0 ? (
            recentChatHistory.map((thread) => (
              <button
                className="assistant-task-row"
                key={thread.id}
                onClick={() => resumeChat(thread)}
                type="button"
              >
                <span>{thread.title}</span>
                <small>{formatAssistantMessageTime(thread.updatedAt)}</small>
              </button>
            ))
          ) : (
            <p>{t("ai.noChatsYet")}</p>
          )}
        </section>
      ) : null}

      <div
        className={`assistant-chat-log${showAllChats && shouldShowChatHistory ? " assistant-chat-log-condensed" : ""}`}
        ref={chatLogRef}
      >
        {messages.map((message, index) => (
          <div className="assistant-chat-timeline-item" key={message.id}>
            {index === streamingMessageIndex ? (
              <AssistantToolApprovalCards
                approvals={pendingToolApprovals}
                onAllow={(request) =>
                  void completeAssistantToolApproval(request.requestId, true)
                }
                onAllowSession={(request) =>
                  void completeAssistantToolApproval(request.requestId, true, {
                    allowSession: true,
                    toolName: request.toolName,
                  })
                }
                onDeny={denyAssistantToolApproval}
              />
            ) : null}
            <AssistantMessageView
              message={message}
              onCopyCode={handleCopyCode}
              onCopyMessage={handleCopyMessage}
              onOpenLink={handleOpenAssistantLink}
              onSendCode={handleSendCodeToTerminal}
              onSecretStored={(request) =>
                appendLocalAssistantMessage(
                  t("ai.secretCardStoredMessage", { label: request.label }),
                  message.intent,
                )
              }
            />
          </div>
        ))}
        {streamingMessageIndex < 0 ? (
          <AssistantToolApprovalCards
            approvals={pendingToolApprovals}
            onAllow={(request) =>
              void completeAssistantToolApproval(request.requestId, true)
            }
            onAllowSession={(request) =>
              void completeAssistantToolApproval(request.requestId, true, {
                allowSession: true,
                toolName: request.toolName,
              })
            }
            onDeny={denyAssistantToolApproval}
          />
        ) : null}
        {shouldShowPreStreamWaiting ? (
          <article className="assistant-message assistant-waiting" aria-live="polite">
            <span className="assistant-spinner" aria-hidden="true" />
            <span>{t("ai.preparingResponse")}</span>
          </article>
        ) : null}
      </div>

      {chatError ? <p className="form-error">{chatError}</p> : null}

      <form className="assistant-chat-composer" onSubmit={handleChatSubmit}>
        {assistantContextSnippet ? (
          <section className="assistant-selection-context">
            <header>
              <span>{assistantContextSnippet.sourceLabel}</span>
              <button
                className="row-action"
                aria-label={t("ai.clearContext")}
                onClick={clearAssistantContextSnippet}
                title={t("ai.clearContext")}
                type="button"
              >
                <X size={13} />
              </button>
            </header>
            {assistantContextSnippet.kind === "screenshot" ? (
              <div className="assistant-screenshot-context">
                <img alt={assistantContextSnippet.sourceLabel} src={assistantContextSnippet.imageDataUrl} />
                <small>
                  {assistantContextSnippet.width} x {assistantContextSnippet.height}
                </small>
              </div>
            ) : (
              <pre>
                <code>{assistantContextSnippet.text}</code>
              </pre>
            )}
          </section>
        ) : null}
        {pastedImageContexts.length > 0 ? (
          <section className="assistant-selection-context">
            <header>
              <span>{t("ai.pastedImages", { count: pastedImageContexts.length })}</span>
              <button
                className="row-action"
                aria-label={t("ai.clearContext")}
                onClick={() => {
                  setPastedImageContexts([]);
                  setImagePasteRejected(false);
                }}
                title={t("ai.clearContext")}
                type="button"
              >
                <X size={13} />
              </button>
            </header>
            <div className="assistant-attachment-preview-grid">
              {pastedImageContexts.map((image) => (
                <figure className="assistant-attachment-preview" key={image.id}>
                  <img alt={image.sourceLabel} src={image.imageDataUrl} />
                  <figcaption>
                    <span>{image.sourceLabel}</span>
                    <small>
                      {image.width} x {image.height}
                    </small>
                  </figcaption>
                  <button
                    aria-label={t("ai.removeImageAttachment", { label: image.sourceLabel })}
                    className="assistant-attachment-remove"
                    onClick={() =>
                      setPastedImageContexts((current) =>
                        current.filter((attachment) => attachment.id !== image.id),
                      )
                    }
                    title={t("ai.removeImageAttachment", { label: image.sourceLabel })}
                    type="button"
                  >
                    <X size={12} />
                  </button>
                </figure>
              ))}
            </div>
          </section>
        ) : null}
        {fileContexts.length > 0 ? (
          <section className="assistant-selection-context">
            <header>
              <span>{t("ai.attachedFiles", { count: fileContexts.length })}</span>
              <button
                className="row-action"
                aria-label={t("ai.clearContext")}
                onClick={() => setFileContexts([])}
                title={t("ai.clearContext")}
                type="button"
              >
                <X size={13} />
              </button>
            </header>
            <div className="assistant-file-attachment-list">
              {fileContexts.map((file) => (
                <div className="assistant-file-attachment" key={file.id}>
                  <FileImage size={14} />
                  <span>{file.sourceLabel}</span>
                  <small>{formatBytes(file.size)}</small>
                  <button
                    aria-label={t("ai.removeFileAttachment", { label: file.sourceLabel })}
                    className="assistant-attachment-remove"
                    onClick={() =>
                      setFileContexts((current) =>
                        current.filter((attachment) => attachment.id !== file.id),
                      )
                    }
                    title={t("ai.removeFileAttachment", { label: file.sourceLabel })}
                    type="button"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        {showImageNotSupportedNotice ? (
          <p className="assistant-image-support-notice" role="status">
            {t("ai.imageInputNotSupported")}
          </p>
        ) : null}
        {assistantPromptQueue.length > 0 ? (
          <section className="assistant-prompt-queue" aria-label={t("ai.queuedPrompts")}>
            {assistantPromptQueue.map((item, index) => (
              <div className="assistant-prompt-queue-row" key={item.id}>
                <span className="assistant-prompt-queue-index">
                  {t("ai.queuedPromptIndex", { index: index + 1 })}
                </span>
                <span className="assistant-prompt-queue-text">{item.prompt}</span>
                <button
                  aria-label={t("ai.deleteQueuedPrompt", { prompt: item.prompt })}
                  className="assistant-prompt-queue-delete"
                  onClick={() => removeQueuedAssistantPrompt(item.id)}
                  title={t("ai.deleteQueuedPrompt", { prompt: item.prompt })}
                  type="button"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </section>
        ) : null}
        {activeComposerIntent ? (
          <section
            aria-label={t("ai.selectedIntent")}
            className="assistant-intent-composer"
            data-intent={activeComposerIntent}
          >
            <div className="assistant-intent-chip" data-intent={activeComposerIntent}>
              {activeComposerIntent === "watchdog" ? <Eye size={14} /> : <Plus size={14} />}
              <span>{activeComposerIntentLabel}</span>
              <button
                aria-label={t("ai.clearIntent", { intent: activeComposerIntentLabel })}
                onClick={handleClearAssistantIntent}
                type="button"
              >
                <X size={12} />
              </button>
            </div>
            {displayedIntentExamples.length > 0 ? (
              <div className="assistant-intent-examples">
                {displayedIntentExamples.map((example, i) => (
                  <button
                    className="assistant-intent-example-bubble"
                    key={i}
                    onClick={() => handleUseIntentExample(example)}
                    type="button"
                  >
                    {example}
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
        <textarea
          ref={composerTextareaRef}
          onKeyDown={handleComposerKeyDown}
          onPaste={(event) => void handleComposerPaste(event)}
          onContextMenu={(event) => void handleComposerContextMenu(event)}
          onChange={(event) => setPrompt(event.currentTarget.value)}
          placeholder={assistantIntentPlaceholder(assistantIntent, t)}
          rows={3}
          value={prompt}
        />
        <div className="assistant-composer-footer">
          <div className="assistant-add-menu-wrapper" ref={addContextMenuRef}>
            <input
              aria-label={t("ai.addFiles")}
              ref={fileInputRef}
              accept="image/*,.pdf,.txt,.log,.md,.json,.jsonl,.csv,.tsv,.yaml,.yml,.xml,.toml,.ini,.conf"
              className="sr-only"
              multiple
              onChange={(event) => void handleFileInputChange(event)}
              tabIndex={-1}
              type="file"
            />
            <button
              {...menuButtonAria(addContextMenuOpen)}
              className="assistant-plus-button"
              disabled={isSendingPrompt}
              onClick={() => setAddContextMenuOpen((open) => !open)}
              onMouseEnter={() => {
                if (
                  activeTab?.kind === "remoteDesktop" &&
                  activeTab.connection?.type === "rdp"
                ) {
                  requestRdpPreCapture();
                }
              }}
              type="button"
              aria-label={t("ai.addContext")}
              title={t("ai.addContext")}
            >
              <Plus size={18} />
            </button>
            {addContextMenuOpen ? (
              <div className="assistant-add-menu" role="menu" aria-label={t("ai.addContext")}>
                {canAttachTerminalBuffer ? (
                  <button
                    className="assistant-add-menu-item"
                    onClick={() => void handleAddTerminalBuffer()}
                    role="menuitem"
                    type="button"
                  >
                    <ScrollText size={15} />
                    {t("ai.addTerminalBuffer")}
                  </button>
                ) : null}
                <button
                  className="assistant-add-menu-item"
                  onClick={handleAddFiles}
                  role="menuitem"
                  type="button"
                >
                  <FileImage size={15} />
                  {t("ai.addFiles")}
                </button>
                <button
                  className="assistant-add-menu-item"
                  onClick={handleAddScreenshot}
                  role="menuitem"
                  type="button"
                >
                  <Camera size={15} />
                  {t("ai.addScreenshot")}
                </button>
                <button
                  {...ariaChecked(assistantIntent === "createWidget")}
                  className="assistant-add-menu-item"
                  onClick={() => handleSelectAssistantIntent("createWidget")}
                  role="menuitemradio"
                  type="button"
                >
                  <Plus size={15} />
                  {t("ai.createWidget")}
                </button>
                <button
                  {...ariaChecked(assistantIntent === "watchdog")}
                  className="assistant-add-menu-item"
                  onClick={() => handleSelectAssistantIntent("watchdog")}
                  role="menuitemradio"
                  type="button"
                >
                  <Eye size={15} />
                  {t("ai.watchdog")}
                </button>
              </div>
            ) : null}
          </div>
          <div className="assistant-permission-menu-wrapper" ref={permissionMenuRef}>
            <button
              {...menuButtonAria(permissionMenuOpen)}
              aria-label={t("ai.toolPermissionMode")}
              className="assistant-permission-button"
              data-mode={currentToolPermissionMode}
              disabled={isSendingPrompt}
              onClick={() => setPermissionMenuOpen((open) => !open)}
              title={t("ai.toolPermissionMode")}
              type="button"
            >
              {currentToolPermissionMode === "allowAll" ? (
                <ShieldAlert size={15} />
              ) : (
                <Hand size={15} />
              )}
              <span>
                {currentToolPermissionMode === "allowAll"
                  ? toolPermissionLabels[1]
                  : toolPermissionLabels[0]}
              </span>
              <ChevronDown size={14} />
            </button>
            {permissionMenuOpen ? (
              <div className="assistant-permission-menu" role="menu" aria-label={t("ai.toolPermissionMode")}>
                <button
                  {...ariaChecked(currentToolPermissionMode === "prompt")}
                  className="assistant-permission-menu-item"
                  onClick={() => void handleToolPermissionModeChange("prompt")}
                  role="menuitemradio"
                  type="button"
                >
                  <Hand size={16} />
                  <span>{toolPermissionLabels[0]}</span>
                  {currentToolPermissionMode === "prompt" ? <Check size={16} /> : null}
                </button>
                <button
                  {...ariaChecked(currentToolPermissionMode === "allowAll")}
                  className="assistant-permission-menu-item"
                  data-mode="allowAll"
                  onClick={() => void handleToolPermissionModeChange("allowAll")}
                  role="menuitemradio"
                  type="button"
                >
                  <ShieldAlert size={16} />
                  <span>{toolPermissionLabels[1]}</span>
                  {currentToolPermissionMode === "allowAll" ? <Check size={16} /> : null}
                </button>
              </div>
            ) : null}
          </div>
          <select
            aria-label={t("settings.model")}
            className="assistant-model-select"
            disabled={isSendingPrompt}
            onChange={(event) => void handleModelChange(event.currentTarget.value)}
            ref={modelSelectRef}
            title={t("settings.model")}
            value={currentModel}
          >
            {hasCustomModel ? <option value={currentModel}>{currentModel}</option> : null}
            {assistantModelOptions.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
          <div
            aria-hidden="true"
            className="assistant-control-measurer assistant-permission-measurer"
            ref={permissionWidthMeasureRef}
          >
            {toolPermissionLabels.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>
          <div
            aria-hidden="true"
            className="assistant-control-measurer assistant-model-measurer"
            ref={modelWidthMeasureRef}
          >
            {modelSelectLabels.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>
          <button
            aria-label={isSendingPrompt && !prompt.trim() ? t("ai.stopMessage") : t("ai.sendMessage")}
            className="assistant-send-button"
            data-state={isSendingPrompt && !prompt.trim() ? "stopping" : "sending"}
            disabled={!isSendingPrompt && !prompt.trim()}
            onClick={isSendingPrompt && !prompt.trim() ? handleStopAssistantPrompt : undefined}
            title={isSendingPrompt && !prompt.trim() ? t("ai.stopMessage") : t("ai.sendMessage")}
            type={isSendingPrompt && !prompt.trim() ? "button" : "submit"}
          >
            {isSendingPrompt && !prompt.trim() ? (
              <Square fill="currentColor" size={13} />
            ) : (
              <SendHorizontal size={18} />
            )}
          </button>
        </div>
      </form>
      {screenshotRegionState
        ? createPortal(
            <div
              aria-label={t("workspace.selectRegion")}
              className="screenshot-region-overlay"
              onKeyDown={handleScreenshotRegionKeyDown}
              onPointerDown={handleScreenshotRegionPointerDown}
              onPointerMove={handleScreenshotRegionPointerMove}
              onPointerUp={handleScreenshotRegionPointerUp}
              role="application"
              tabIndex={-1}
            >
              <div className="screenshot-region-target" ref={regionTargetRef} />
              {screenshotSelectionRect ? (
                <div className="screenshot-region-selection" ref={regionSelectionRef} />
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </aside>
  );
}

function AssistantMessageView({
  message,
  onCopyCode,
  onCopyMessage,
  onOpenLink,
  onSecretStored,
  onSendCode,
}: {
  message: AssistantChatMessage;
  onCopyCode: (code: string) => void;
  onCopyMessage: (message: AssistantChatMessage) => void;
  onOpenLink: (url: string) => void;
  onSecretStored: (request: AssistantSecretRequest) => void;
  onSendCode: (code: string) => void;
}) {
  const { t } = useTranslation();
  const userMessageLineCount = message.role === "user" ? message.content.split(/\r?\n/).length : 0;
  const shouldTruncateUserMessage = message.role === "user" && userMessageLineCount > 10;
  const canSendCode = message.intent !== "extensionCreation";
  const [isUserMessageExpanded, setIsUserMessageExpanded] = useState(false);
  const [previewImage, setPreviewImage] = useState<AssistantImageAttachment | null>(null);
  const secretRequestContent = useMemo(
    () => parseAssistantSecretRequests(message.content),
    [message.content],
  );

  useEffect(() => {
    if (!previewImage) {
      return;
    }

    function handlePreviewKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setPreviewImage(null);
      }
    }

    window.addEventListener("keydown", handlePreviewKeyDown);
    return () => window.removeEventListener("keydown", handlePreviewKeyDown);
  }, [previewImage]);

  return (
    <article className={`assistant-message ${message.role}`}>
      <div className="assistant-message-content">
        <div
          className={`assistant-message-bubble${shouldTruncateUserMessage && !isUserMessageExpanded ? " assistant-message-bubble-truncated" : ""}`}
        >
          {message.role === "user" && message.intent && message.intent !== "chat" ? (
            <span className="assistant-message-intent-label" data-intent={message.intent}>
              {assistantIntentLabel(message.intent, t)}
            </span>
          ) : null}
          {message.textAttachments?.length ? (
            <div className="assistant-message-text-attachments">
              {message.textAttachments.map((attachment) => (
                <figure className="assistant-message-text-attachment" key={attachment.id}>
                  <figcaption>{attachment.sourceLabel}</figcaption>
                  <pre>
                    <code>{attachment.text}</code>
                  </pre>
                </figure>
              ))}
            </div>
          ) : null}
          {message.imageAttachments?.length ? (
            <div className="assistant-message-attachments">
              {message.imageAttachments.map((image) => (
                <figure className="assistant-message-attachment" key={image.id}>
                  <button
                    {...dialogButtonAria(previewImage?.id === image.id)}
                    aria-label={t("ai.openImagePreview", { label: image.sourceLabel })}
                    className="assistant-message-attachment-button"
                    onClick={() => setPreviewImage(image)}
                    title={t("ai.openImagePreview", { label: image.sourceLabel })}
                    type="button"
                  >
                    <img alt={image.sourceLabel} src={image.imageDataUrl} />
                  </button>
                  <figcaption>
                    {image.sourceLabel} · {image.width} x {image.height}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : null}
          {message.fileAttachments?.length ? (
            <div className="assistant-message-file-attachments">
              {message.fileAttachments.map((file) => (
                <div className="assistant-message-file-attachment" key={file.id}>
                  <FileImage size={13} />
                  <span>{file.sourceLabel}</span>
                  <small>{formatBytes(file.size)}</small>
                </div>
              ))}
            </div>
          ) : null}
          {message.role === "assistant" ? <AssistantWorkPanel message={message} /> : null}
          <MarkdownContent
            canSendCode={canSendCode}
            content={secretRequestContent.markdown}
            onCopyCode={onCopyCode}
            onOpenLink={onOpenLink}
            onSendCode={onSendCode}
          />
          {message.role === "assistant" && secretRequestContent.requests.length > 0 ? (
            <div className="assistant-secret-card-stack">
              {secretRequestContent.requests.map((request) => (
                <AssistantSecretEntryCard
                  key={secretRequestStorageNotice(request)}
                  request={request}
                  onStored={onSecretStored}
                />
              ))}
            </div>
          ) : null}
        </div>
        <div className="assistant-message-actions">
          <time dateTime={message.createdAt}>{formatAssistantMessageTime(message.createdAt)}</time>
          <button
            aria-label={t("ai.copyMessage")}
            onClick={() => onCopyMessage(message)}
            title={t("ai.copyMessage")}
            type="button"
          >
            <Copy size={10} />
          </button>
        </div>
      </div>
      {shouldTruncateUserMessage ? (
        <button
          className="assistant-message-expand"
          onClick={() => setIsUserMessageExpanded((expanded) => !expanded)}
          type="button"
        >
          {isUserMessageExpanded ? t("ai.showLess") : t("ai.more")}
        </button>
      ) : null}
      {previewImage
        ? createPortal(
            <div
              className="assistant-image-preview-backdrop"
              onClick={() => setPreviewImage(null)}
              role="presentation"
            >
              <div
                aria-label={t("ai.imagePreviewTitle", { label: previewImage.sourceLabel })}
                className="assistant-image-preview-dialog"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
              >
                <header>
                  <div>
                    <strong>{previewImage.sourceLabel}</strong>
                    <small>
                      {previewImage.width} x {previewImage.height}
                    </small>
                  </div>
                  <button
                    aria-label={t("ai.close")}
                    className="assistant-toolbar-button"
                    onClick={() => setPreviewImage(null)}
                    title={t("ai.close")}
                    type="button"
                  >
                    <X size={15} />
                  </button>
                </header>
                <img alt={previewImage.sourceLabel} src={previewImage.imageDataUrl} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </article>
  );
}

function AssistantSecretEntryCard({
  onStored,
  request,
}: {
  onStored: (request: AssistantSecretRequest) => void;
  request: AssistantSecretRequest;
}) {
  const { t } = useTranslation();
  const setAiProviderHasApiKey = useWorkspaceStore((state) => state.setAiProviderHasApiKey);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stored, setStored] = useState(false);
  const [error, setError] = useState("");
  const canSave = secret.trim().length > 0 && !saving && !stored;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) {
      return;
    }

    setSaving(true);
    setError("");
    try {
      await storeAssistantSecretRequest(request, secret.trim());
      setSecret("");
      setStored(true);
      if (request.kind === "aiApiKey") {
        setAiProviderHasApiKey(true);
      }
      if (request.kind === "widgetSecret") {
        await useDashboardStore.getState().load();
      }
      showStatusBarNotice(t("ai.secretCardStoredStatus", { label: request.label }), {
        tone: "success",
      });
      onStored(request);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="assistant-secret-card" onSubmit={(event) => void handleSubmit(event)}>
      <header>
        <KeyRound size={15} />
        <div>
          <strong>{request.label}</strong>
          <small>{request.description ?? t("ai.secretCardDefaultDescription")}</small>
        </div>
      </header>
      <p>{t("ai.secretCardPrivacy")}</p>
      <label>
        <span>{t("ai.secretCardInputLabel")}</span>
        <div className="assistant-secret-input-row">
          <input
            autoComplete="off"
            disabled={saving || stored}
            onChange={(event) => setSecret(event.currentTarget.value)}
            placeholder={request.placeholder ?? t("ai.secretCardPlaceholder")}
            type={showSecret ? "text" : "password"}
            value={secret}
          />
          <button
            aria-label={showSecret ? t("ai.secretCardHide") : t("ai.secretCardShow")}
            className="assistant-secret-icon-button"
            disabled={saving || stored}
            onClick={() => setShowSecret((show) => !show)}
            title={showSecret ? t("ai.secretCardHide") : t("ai.secretCardShow")}
            type="button"
          >
            {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </label>
      <footer>
        <span aria-live="polite">
          {stored ? t("ai.secretCardStoredInline") : error}
        </span>
        <button className="toolbar-button" disabled={!canSave} type="submit">
          {saving ? <LoaderCircle size={14} /> : <KeyRound size={14} />}
          {stored ? t("ai.secretCardSaved") : t("ai.secretCardSave")}
        </button>
      </footer>
    </form>
  );
}

async function storeAssistantSecretRequest(
  request: AssistantSecretRequest,
  secret: string,
) {
  if (!isTauriRuntime()) {
    throw new Error(i18next.t("ai.secretCardRuntimeRequired"));
  }

  if (request.kind === "widgetSecret") {
    await storeWidgetSecretRequest(request, secret);
    return;
  }

  await invokeCommand("store_secret", {
    request: {
      kind: request.kind,
      ownerId: request.ownerId,
      secret,
    },
  });
}

async function storeWidgetSecretRequest(
  request: AssistantSecretRequest,
  secret: string,
) {
  if (!request.instanceId || !request.fieldKey) {
    throw new Error(i18next.t("ai.secretCardInvalidWidgetRequest"));
  }

  const state = await invokeCommand("dashboard_load_state", undefined);
  const instance = state.instances.find((item) => item.id === request.instanceId);
  if (!instance) {
    throw new Error(i18next.t("ai.secretCardMissingWidget"));
  }

  const currentValues = parseObjectJson(instance.settingsValuesJson);
  const nextValues = {
    ...currentValues,
    [request.fieldKey]: {
      type: "secretRef",
      ownerId: request.ownerId,
      hasSecret: true,
      updatedAt: new Date().toISOString(),
    },
  };

  await invokeCommand("store_secret", {
    request: {
      kind: request.kind,
      ownerId: request.ownerId,
      secret,
    },
  });

  try {
    await invokeCommand("dashboard_update_instance", {
      id: request.instanceId,
      patch: { settingsValuesJson: JSON.stringify(nextValues) },
    });
  } catch (error) {
    await invokeCommand("delete_secret", {
      request: {
        kind: request.kind,
        ownerId: request.ownerId,
      },
    }).catch(() => undefined);
    throw error;
  }
}

function parseObjectJson(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

