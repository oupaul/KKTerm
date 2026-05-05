import { workspaceKindLabel } from "../connections/utils";
import { inspectActiveSshSystemContext } from "../terminal/TerminalWorkspace";
import { writeToClipboard } from "../lib/clipboard";
import {
  Bot,
  Camera,
  ChevronRight,
  Copy,
  FileImage,
  PanelRight,
  Plus,
  Puzzle,
  RefreshCw,
  ScrollText,
  SendHorizontal,
  Settings,
  Terminal,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { ariaChecked, menuButtonAria } from "../lib/aria";
import { invokeCommand } from "../lib/tauri";
import { getAiProviderDefinition, validateAiProviderForChat } from "./providers";
import { useWorkspaceStore } from "../store";
import { writeInputToPane } from "../workspace/paneRegistry";

type AssistantChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  intent?: AssistantPromptIntent;
  createdAt: string;
};

type AssistantChatThread = {
  id: string;
  title: string;
  contextLabel: string;
  messages: AssistantChatMessage[];
  createdAt: string;
  updatedAt: string;
};

type AssistantPromptIntent = "chat" | "extensionCreation";

const EXTENSION_DRAFT_PROMPT = "Create an AdminDeck extension draft for: ";

const ASSISTANT_WAITING_PHRASES = [
  "Fixing phaser cannon",
  "Opening the hatch",
  "Charging the jump drive",
  "Aligning the star map",
  "Spinning up the ion fan",
  "Polishing the command deck",
  "Tuning the warp kettle",
  "Rebooting the moon router",
  "Counting spare photons",
  "Warming the flux capacitor",
  "Calibrating laser spoons",
  "Priming the nebula pump",
  "Negotiating with the airlock",
  "Filing asteroid paperwork",
  "Dusting the antimatter shelf",
  "Reticulating space splines",
  "Checking helmet vibes",
  "Defragging the cargo bay",
  "Unjamming the holo button",
  "Balancing the plasma tray",
  "Finding the left thruster",
  "Tickling the debug console",
  "Restarting orbital coffee",
  "Inflating backup gravity",
  "Rewiring the tiny reactor",
  "Tapping the starboard gauge",
  "Loading cosmic duct tape",
  "Convincing the nav computer",
  "Sequencing hatch confetti",
  "Indexing comet receipts",
  "Greasing the wormhole hinge",
  "Ping-testing Mars",
  "Sorting the photon drawer",
  "Cooling the laser noodles",
  "Tightening gravity bolts",
  "Priming the escape kazoo",
  "Painting racing stripes",
  "Untangling sensor cables",
  "Waking the sleep module",
  "Auditing stardust inventory",
  "Shaking the quantum snowglobe",
  "Finding north in space",
  "Folding the solar sail",
  "Loading backup starlight",
  "Rehearsing airlock manners",
  "Baking a moon packet",
  "Charging the sarcasm shield",
  "Buffing the docking clamp",
  "Sharpening the laser pointer",
  "Priming the thought engine",
  "Warming up the command chair",
  "Asking the dashboard nicely",
  "Cycling the photon valves",
  "Refreshing the orbit cache",
  "Rebalancing the holo grid",
  "Tuning the antenna eyebrows",
  "Opening a tiny wormhole",
  "Calming the fusion toaster",
  "Tapping the reactor glass",
  "Checking the space odometer",
  "Stirring the data soup",
  "Filling the oxygen spreadsheet",
  "Aligning satellite socks",
  "Charging the blaster dial",
  "Plotting a snack trajectory",
  "Washing the sensor array",
  "Summoning auxiliary pixels",
  "Scanning for loose commas",
  "Decrypting the captain's doodle",
  "Inventorying laser batteries",
  "Priming the turbo clipboard",
  "Tightening the console latch",
  "Reheating the star chart",
  "Cycling the space windshield",
  "Repacking the toolkit",
  "Testing zero-g cupholders",
  "Stabilizing the time drawer",
  "Loading orbital elevator music",
  "Finding the backup button",
  "Recharging the idea cannon",
  "Adjusting the moon mirror",
  "Flossing the fiber uplink",
  "Polishing the escape pod",
  "Resetting the drama dampener",
  "Opening channel banana",
  "Patching the astro modem",
  "Checking the warp warranty",
  "Sorting the asteroid queue",
  "Measuring the cosmic shrug",
  "Sealing the vacuum zipper",
  "Cycling the launch chime",
  "Rebooting the gravity fan",
  "Massaging the matrix",
  "Tuning the ion kazoo",
  "Refilling the star ink",
  "Aligning the blink lights",
  "Priming the orbit blender",
  "Counting laser freckles",
  "Unlocking the science drawer",
  "Greasing the docking rails",
  "Pinging the command moon",
  "Refactoring the hyperspace",
  "Starting the tiny supernova",
  "Scanning for friendly qubits",
  "Tapping the fusion meter",
  "Loading the patience module",
  "Dialing the photon desk",
  "Rotating the starboard waffle",
  "Checking the captain's checklist",
  "Balancing the antenna fork",
  "Rewinding the time cassette",
  "Powering the polite thruster",
  "Tuning the orbit guitar",
  "Loading the moon compiler",
  "Untying the data knot",
  "Calibrating the comet broom",
  "Charging the signal lantern",
  "Rebooting the hatch bell",
  "Flipping the plasma pancake",
  "Opening the auxiliary curtain",
  "Testing the vacuum whistle",
  "Priming the starboard toaster",
  "Buffing the quantum knob",
  "Refreshing the nebula cache",
  "Warming the rocket socks",
  "Assembling the space sandwich",
  "Aligning the laser stapler",
  "Checking the orbit invoice",
  "Tuning the warp harmonica",
  "Feeding the command queue",
  "Stacking spare timelines",
  "Cleaning the photon lens",
  "Patching the hatch firmware",
  "Loading the console confetti",
  "Rehearsing the docking wink",
  "Starting the plasma metronome",
  "Counting backup universes",
  "Tightening the starlight jar",
  "Polishing the telemetry spoon",
  "Resetting the orbital toaster",
  "Opening the moon drawer",
  "Charging the debug beacon",
  "Tuning the static hammock",
  "Repacking the nebula toolbox",
  "Scanning for lost semicolons",
  "Priming the turbo antenna",
  "Adjusting the time zipper",
  "Loading the starboard playlist",
  "Checking the gravity receipt",
  "Dusting the launch button",
  "Rebooting the comet scheduler",
  "Finding the cosmic clipboard",
  "Balancing the sensor teacup",
  "Tapping the hatch twice",
  "Folding the wormhole napkin",
  "Charging the orbital lantern",
  "Polishing the warp sprocket",
  "Refreshing the photon pantry",
  "Checking the space calendar",
  "Tuning the navigation kazoo",
  "Loading the answer thrusters",
  "Rewiring the stardust modem",
  "Opening the cargo fortune",
  "Measuring the launch grin",
  "Unclogging the plasma funnel",
  "Counting the quiet beeps",
  "Calibrating the quantum teapot",
  "Priming the orbit stapler",
  "Fixing the dashboard wobble",
  "Testing the starboard wink",
  "Recharging the thought lantern",
  "Sorting hyperspace coupons",
  "Polishing the signal mirror",
  "Loading the hatch password",
  "Cycling the antimatter fan",
  "Checking the moon gasket",
  "Tuning the sensor marimba",
  "Launching the tiny checklist",
  "Aligning the nebula ruler",
  "Rebooting the captain's chair",
  "Packing spare photons",
  "Opening the diagnostics pantry",
  "Priming the laser accordion",
  "Untangling the orbit spaghetti",
  "Charging the polite laser",
  "Checking the fusion cup",
  "Defrosting the comet tray",
  "Retuning the space banjo",
  "Loading the answer cartridge",
  "Patching the moon socket",
  "Counting celestial paperclips",
  "Stabilizing the blinkenlights",
  "Warming the response engine",
  "Rebalancing the starboard vibes",
  "Opening the tiny airlock",
  "Testing the hyperspace zipper",
  "Refreshing the command buffer",
  "Calibrating the orbit spoon",
  "Charging the answer beacon",
  "Checking the last hatch",
] as const;

function randomAssistantWaitingPhrase() {
  return ASSISTANT_WAITING_PHRASES[
    Math.floor(Math.random() * ASSISTANT_WAITING_PHRASES.length)
  ];
}

function createAssistantChatMessage(
  role: AssistantChatMessage["role"],
  content: string,
  intent?: AssistantPromptIntent,
): AssistantChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    intent,
    createdAt: new Date().toISOString(),
  };
}

function createAssistantChatThreadId() {
  return `assistant-chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function assistantThreadTitle(messages: AssistantChatMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const title = firstUserMessage?.content.trim().replace(/\s+/g, " ") || "New chat";
  return title.length > 56 ? `${title.slice(0, 53)}...` : title;
}

function assistantThreadPreview(thread: AssistantChatThread) {
  const lastMessage = thread.messages[thread.messages.length - 1];
  const preview = lastMessage?.content.trim().replace(/\s+/g, " ") || "No messages";
  return preview.length > 64 ? `${preview.slice(0, 61)}...` : preview;
}

function formatAssistantMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const hours = date.getHours();
  const hour12 = hours % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  return `${hour12}:${minutes}${period}`;
}

function sortedAssistantThreads(threads: AssistantChatThread[]) {
  return [...threads].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

function upsertAssistantChatThread(
  threads: AssistantChatThread[],
  thread: AssistantChatThread,
) {
  const withoutThread = threads.filter((item) => item.id !== thread.id);
  return sortedAssistantThreads([thread, ...withoutThread]);
}

function assistantIntentForPrompt(
  activeIntent: AssistantPromptIntent,
  prompt: string,
): AssistantPromptIntent {
  if (activeIntent === "extensionCreation") {
    return activeIntent;
  }

  const normalized = prompt.toLowerCase();
  const asksForExtension =
    /\b(extension|plugin|addon|add-on)\b/.test(normalized) &&
    /\b(create|build|generate|write|draft|scaffold|make)\b/.test(normalized);
  return asksForExtension ? "extensionCreation" : "chat";
}

function readAssistantChatHistory(): AssistantChatThread[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const rawHistory = window.localStorage.getItem(ASSISTANT_CHAT_HISTORY_KEY);
    if (!rawHistory) {
      return [];
    }
    const parsed = JSON.parse(rawHistory);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.flatMap(normalizeAssistantChatThread);
  } catch {
    return [];
  }
}

function writeAssistantChatHistory(threads: AssistantChatThread[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(ASSISTANT_CHAT_HISTORY_KEY, JSON.stringify(threads));
}

function normalizeAssistantChatThread(value: unknown): AssistantChatThread[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  const candidate = value as Partial<AssistantChatThread>;
  const messages = Array.isArray(candidate.messages)
    ? candidate.messages.flatMap(normalizeAssistantChatMessage)
    : [];
  if (messages.length === 0) {
    return [];
  }
  const createdAt = normalizeDateString(candidate.createdAt) ?? messages[0].createdAt;
  const updatedAt =
    normalizeDateString(candidate.updatedAt) ?? messages[messages.length - 1].createdAt;
  return [
    {
      id: typeof candidate.id === "string" && candidate.id ? candidate.id : createAssistantChatThreadId(),
      title:
        typeof candidate.title === "string" && candidate.title.trim()
          ? candidate.title.trim()
          : assistantThreadTitle(messages),
      contextLabel:
        typeof candidate.contextLabel === "string" && candidate.contextLabel.trim()
          ? candidate.contextLabel.trim()
          : "Workspace",
      messages,
      createdAt,
      updatedAt,
    },
  ];
}

function normalizeAssistantChatMessage(value: unknown): AssistantChatMessage[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  const candidate = value as Partial<AssistantChatMessage>;
  if (candidate.role !== "assistant" && candidate.role !== "user") {
    return [];
  }
  if (typeof candidate.content !== "string" || !candidate.content.trim()) {
    return [];
  }
  return [
    {
      id: typeof candidate.id === "string" && candidate.id ? candidate.id : `${candidate.role}-${Date.now()}`,
      role: candidate.role,
      content: candidate.content,
      createdAt: normalizeDateString(candidate.createdAt) ?? new Date().toISOString(),
    },
  ];
}

function normalizeDateString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

const ASSISTANT_CHAT_HISTORY_KEY = "admindeck.aiAssistant.chatHistory.v1";

export function AssistantPanel({
  onOpenSettings,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onOpenSettings: () => void;
  onToggleCollapsed: () => void;
}) {
  const activeTab = useWorkspaceStore((state) =>
    state.tabs.find((tab) => tab.id === state.activeTabId),
  );
  const assistantContextSnippet = useWorkspaceStore((state) => state.assistantContextSnippet);
  const clearAssistantContextSnippet = useWorkspaceStore(
    (state) => state.clearAssistantContextSnippet,
  );
  const aiProviderSettings = useWorkspaceStore((state) => state.aiProviderSettings);
  const aiProviderHasApiKey = useWorkspaceStore((state) => state.aiProviderHasApiKey);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState(createAssistantChatThreadId);
  const [chatHistory, setChatHistory] = useState<AssistantChatThread[]>(readAssistantChatHistory);
  const [showAllChats, setShowAllChats] = useState(false);
  const [chatError, setChatError] = useState("");
  const [isSendingPrompt, setIsSendingPrompt] = useState(false);
  const [assistantIntent, setAssistantIntent] = useState<AssistantPromptIntent>("chat");
  const [waitingPhrase, setWaitingPhrase] = useState("");
  const [waitingDots, setWaitingDots] = useState(0);
  const [messageCopyStatus, setMessageCopyStatus] = useState("");
  const [terminalSendStatus, setTerminalSendStatus] = useState("");
  const [addContextMenuOpen, setAddContextMenuOpen] = useState(false);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const addContextMenuRef = useRef<HTMLDivElement | null>(null);
  const contextLabel = activeTab
    ? `${activeTab.title} - ${workspaceKindLabel(activeTab)}`
    : "No active session";
  const connectionLabel = activeTab?.connection
    ? `${activeTab.connection.user}@${activeTab.connection.host}`
    : "Workspace";
  const providerDefinition = getAiProviderDefinition(aiProviderSettings.providerKind);
  const activeTerminalPaneId =
    activeTab?.kind === "terminal" ? activeTab.focusedPaneId ?? activeTab.panes[0]?.id : undefined;
  const sortedChatHistory = useMemo(() => sortedAssistantThreads(chatHistory), [chatHistory]);
  const recentChatHistory = sortedChatHistory.slice(0, 5);

  useEffect(() => {
    writeAssistantChatHistory(chatHistory);
  }, [chatHistory]);

  useEffect(() => {
    if (!isSendingPrompt) {
      setWaitingDots(0);
      return;
    }

    const interval = window.setInterval(() => {
      setWaitingDots((current) => (current + 1) % 4);
    }, 300);

    return () => {
      window.clearInterval(interval);
    };
  }, [isSendingPrompt]);

  useEffect(() => {
    if (!isSendingPrompt) {
      return;
    }

    const interval = window.setInterval(() => {
      setWaitingPhrase(randomAssistantWaitingPhrase());
    }, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isSendingPrompt]);

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

  function handleSendCodeToTerminal(code: string) {
    if (!activeTerminalPaneId) {
      setTerminalSendStatus("Open and focus a terminal first.");
      return;
    }

    const data = code.endsWith("\n") ? code : `${code}\n`;
    if (writeInputToPane(activeTerminalPaneId, data)) {
      setTerminalSendStatus("Sent to focused terminal.");
      return;
    }

    setTerminalSendStatus("Focused terminal is still starting.");
  }

  function handleChatSubmit(event: FormEvent) {
    event.preventDefault();
    void submitAssistantPrompt();
  }

  function handleNewChat() {
    if (isSendingPrompt) {
      return;
    }
    saveCurrentChat();
    setMessages([]);
    setCurrentThreadId(createAssistantChatThreadId());
    setPrompt("");
    setChatError("");
    setTerminalSendStatus("");
    setMessageCopyStatus("");
    setWaitingPhrase("");
    setAssistantIntent("chat");
    setShowAllChats(false);
  }

  function saveCurrentChat() {
    if (messages.length === 0) {
      return;
    }
    const now = new Date().toISOString();
    const thread: AssistantChatThread = {
      id: currentThreadId,
      title: assistantThreadTitle(messages),
      contextLabel,
      messages,
      createdAt: messages[0]?.createdAt ?? now,
      updatedAt: messages[messages.length - 1]?.createdAt ?? now,
    };
    setChatHistory((current) => upsertAssistantChatThread(current, thread));
  }

  function resumeChat(thread: AssistantChatThread) {
    if (isSendingPrompt) {
      return;
    }
    saveCurrentChat();
    setCurrentThreadId(thread.id);
    setMessages(thread.messages);
    setPrompt("");
    setChatError("");
    setTerminalSendStatus("");
    setMessageCopyStatus("");
    setWaitingPhrase("");
    setAssistantIntent("chat");
    setShowAllChats(false);
  }

  async function handleCopyMessage(message: AssistantChatMessage) {
    await writeToClipboard(message.content);
    setMessageCopyStatus(`${message.role === "user" ? "Your" : "Assistant"} message copied.`);
  }

  async function handleCopyCode(code: string) {
    await writeToClipboard(code);
    setMessageCopyStatus("Code copied.");
  }

  function handleStartExtensionDraft() {
    if (isSendingPrompt) {
      return;
    }

    setAddContextMenuOpen(false);
    setAssistantIntent("extensionCreation");
    setTerminalSendStatus("");
    setMessageCopyStatus("Extension drafts stay review-only until you explicitly approve future install or run steps.");
    if (!prompt.trim()) {
      setPrompt(EXTENSION_DRAFT_PROMPT);
      window.requestAnimationFrame(() => {
        composerTextareaRef.current?.focus();
        composerTextareaRef.current?.setSelectionRange(
          EXTENSION_DRAFT_PROMPT.length,
          EXTENSION_DRAFT_PROMPT.length,
        );
      });
    } else {
      composerTextareaRef.current?.focus();
    }
  }

  function handleStubContextOption(label: string) {
    setAddContextMenuOpen(false);
    setTerminalSendStatus("");
    setMessageCopyStatus(`${label} is staged in the UI and will be implemented later.`);
  }

  async function submitAssistantPrompt() {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt || isSendingPrompt) {
      return;
    }
    const requestIntent = assistantIntentForPrompt(assistantIntent, normalizedPrompt);
    setAssistantIntent(requestIntent);
    const userMessage = createAssistantChatMessage("user", normalizedPrompt, requestIntent);
    try {
      validateAiProviderForChat(aiProviderSettings, aiProviderHasApiKey);
    } catch (error) {
      const assistantMessage = createAssistantChatMessage(
        "assistant",
        `AI provider settings error: ${error instanceof Error ? error.message : String(error)}`,
        requestIntent,
      );
      setMessages((current) => [...current, userMessage, assistantMessage]);
      setPrompt("");
      setChatError("");
      return;
    }

    const history = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
    setMessages((current) => [...current, userMessage]);
    setPrompt("");
    setChatError("");
    setWaitingPhrase(randomAssistantWaitingPhrase());
    setIsSendingPrompt(true);
    try {
      const systemContext = await inspectActiveSshSystemContext(activeTab);
      const response = await invokeCommand("run_ai_agent", {
        request: {
          prompt: normalizedPrompt,
          contextLabel,
          intent: requestIntent,
          selectedOutput:
            assistantContextSnippet?.kind === "text" ? assistantContextSnippet.text : undefined,
          screenshot:
            assistantContextSnippet?.kind === "screenshot"
              ? {
                  sourceLabel: assistantContextSnippet.sourceLabel,
                  dataUrl: assistantContextSnippet.imageDataUrl,
                }
              : undefined,
          systemContext,
          messages: history,
        },
      });
      const assistantMessage = createAssistantChatMessage(
        "assistant",
        response.content,
        requestIntent,
      );
      setMessages((current) => [...current, assistantMessage]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setChatError(message);
      setMessages((current) => [
        ...current,
        createAssistantChatMessage("assistant", `AI Assistant error: ${message}`, requestIntent),
      ]);
    } finally {
      setIsSendingPrompt(false);
      setWaitingPhrase("");
    }
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

  return (
    <aside className="assistant-panel">
      <div className="assistant-topbar">
        <h2>AI Assistant</h2>
        <button
          aria-label="Refresh AI Assistant"
          className="assistant-toolbar-button"
          title="Refresh AI Assistant"
          type="button"
        >
          <RefreshCw size={16} />
        </button>
        <button
          aria-label="AI Assistant settings"
          className="assistant-toolbar-button"
          onClick={onOpenSettings}
          title="AI Assistant settings"
          type="button"
        >
          <Settings size={16} />
        </button>
        <button
          aria-label="New AI Assistant chat"
          className="assistant-toolbar-button"
          disabled={isSendingPrompt}
          onClick={handleNewChat}
          title="New chat"
          type="button"
        >
          <Plus size={16} />
        </button>
        <button
          aria-label="Collapse AI Assistant panel"
          className="assistant-toolbar-button"
          onClick={onToggleCollapsed}
          title="Collapse AI Assistant panel"
          type="button"
        >
          <PanelRight size={17} />
        </button>
      </div>

      <div className="assistant-context active-session-hint">
        <Bot size={16} />
        <span>
          <strong>{contextLabel}</strong>
          <small>{connectionLabel}</small>
        </span>
      </div>

      {assistantIntent === "extensionCreation" ? (
        <div className="assistant-context assistant-extension-context">
          <Plus size={16} />
          <span>
            <strong>Extension draft</strong>
            <small>Review-only; no install or run without explicit approval.</small>
          </span>
        </div>
      ) : null}

      <section className="assistant-tasks">
        <header>
          <span>Chats</span>
          <button
            className="assistant-view-all-button"
            disabled={sortedChatHistory.length === 0}
            onClick={() => setShowAllChats(true)}
            type="button"
          >
            View All({sortedChatHistory.length})
          </button>
        </header>
        {recentChatHistory.length > 0 ? (
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
          <p>No chats yet.</p>
        )}
      </section>

      {showAllChats ? (
        <div className="assistant-chat-history-backdrop" role="presentation">
          <section className="assistant-chat-history-dialog" role="dialog" aria-label="All chats">
            <header>
              <div>
                <span>Chats</span>
                <small>{sortedChatHistory.length} saved</small>
              </div>
              <button
                className="assistant-toolbar-button"
                onClick={() => setShowAllChats(false)}
                type="button"
                aria-label="Close chat history"
                title="Close"
              >
                <X size={15} />
              </button>
            </header>
            <div className="assistant-chat-history-list">
              {sortedChatHistory.map((thread) => (
                <button
                  className="assistant-chat-history-row"
                  key={thread.id}
                  onClick={() => resumeChat(thread)}
                  type="button"
                >
                  <strong>{thread.title}</strong>
                  <span>{assistantThreadPreview(thread)}</span>
                  <small>{formatAssistantMessageTime(thread.updatedAt)}</small>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {assistantContextSnippet ? (
        <section className="assistant-selection-context">
          <header>
            <span>{assistantContextSnippet.sourceLabel}</span>
            <button
              className="row-action"
              aria-label="Clear selected output context"
              onClick={clearAssistantContextSnippet}
              title="Clear selected output context"
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

      <div className="assistant-chat-log">
        {messages.map((message) => (
          <AssistantMessageView
            key={message.id}
            message={message}
            onCopyCode={handleCopyCode}
            onCopyMessage={handleCopyMessage}
            onSendCode={handleSendCodeToTerminal}
          />
        ))}
        {isSendingPrompt ? (
          <article className="assistant-message assistant-waiting" aria-live="polite">
            <span className="assistant-spinner" aria-hidden="true" />
            <span>{waitingPhrase || "Charging the answer beacon"}<span className="assistant-waiting-dots" aria-hidden="true">{".".repeat(waitingDots)}</span></span>
          </article>
        ) : null}
      </div>

      {terminalSendStatus ? <p className="assistant-send-status">{terminalSendStatus}</p> : null}
      {messageCopyStatus ? <p className="assistant-send-status">{messageCopyStatus}</p> : null}
      {chatError ? <p className="form-error">{chatError}</p> : null}

      <form className="assistant-chat-composer" onSubmit={handleChatSubmit}>
        <textarea
          ref={composerTextareaRef}
          onKeyDown={handleComposerKeyDown}
          onChange={(event) => setPrompt(event.currentTarget.value)}
          disabled={isSendingPrompt}
          placeholder="Ask AI Assistant anything."
          rows={3}
          value={prompt}
        />
        <div className="assistant-composer-footer">
          <div className="assistant-add-menu-wrapper" ref={addContextMenuRef}>
            <button
              {...menuButtonAria(addContextMenuOpen)}
              className="assistant-plus-button"
              disabled={isSendingPrompt}
              onClick={() => setAddContextMenuOpen((open) => !open)}
              type="button"
              aria-label="Add context"
              title="Add context"
            >
              <Plus size={18} />
            </button>
            {addContextMenuOpen ? (
              <div className="assistant-add-menu" role="menu" aria-label="Add context">
                <button
                  className="assistant-add-menu-item"
                  onClick={() => handleStubContextOption("Add Files/Photos")}
                  role="menuitem"
                  type="button"
                >
                  <FileImage size={15} />
                  Add Files/Photos
                </button>
                <button
                  className="assistant-add-menu-item"
                  onClick={() => handleStubContextOption("Add Screenshot")}
                  role="menuitem"
                  type="button"
                >
                  <Camera size={15} />
                  Add Screenshot
                </button>
                <button
                  className="assistant-add-menu-item"
                  onClick={() => handleStubContextOption("Add Terminal Buffer")}
                  role="menuitem"
                  type="button"
                >
                  <ScrollText size={15} />
                  Add Terminal Buffer
                </button>
                <div className="assistant-add-menu-submenu">
                  <button
                    aria-haspopup="menu"
                    className="assistant-add-menu-item"
                    role="menuitem"
                    type="button"
                  >
                    <Puzzle size={15} />
                    Extensions
                    <ChevronRight className="assistant-add-menu-chevron" size={13} />
                  </button>
                  <div className="assistant-add-menu assistant-add-menu-submenu-panel" role="menu">
                    <button
                      {...ariaChecked(assistantIntent === "extensionCreation")}
                      className="assistant-add-menu-item"
                      onClick={handleStartExtensionDraft}
                      role="menuitemcheckbox"
                      type="button"
                    >
                      <Plus size={14} />
                      Draft Extension
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <span>{aiProviderSettings.model || providerDefinition.defaultModel}</span>
          <button
            aria-label="Send message"
            className="assistant-send-button"
            disabled={!prompt.trim() || isSendingPrompt}
            type="submit"
          >
            <SendHorizontal size={18} />
          </button>
        </div>
      </form>
    </aside>
  );
}

function AssistantMessageView({
  message,
  onCopyCode,
  onCopyMessage,
  onSendCode,
}: {
  message: AssistantChatMessage;
  onCopyCode: (code: string) => void;
  onCopyMessage: (message: AssistantChatMessage) => void;
  onSendCode: (code: string) => void;
}) {
  const userMessageLineCount = message.role === "user" ? message.content.split(/\r?\n/).length : 0;
  const shouldTruncateUserMessage = message.role === "user" && userMessageLineCount > 10;
  const canSendCode = message.intent !== "extensionCreation";
  const [isUserMessageExpanded, setIsUserMessageExpanded] = useState(false);

  return (
    <article className={`assistant-message ${message.role}`}>
      <div
        className={`assistant-message-bubble${shouldTruncateUserMessage && !isUserMessageExpanded ? " assistant-message-bubble-truncated" : ""}`}
      >
        <MarkdownContent
          canSendCode={canSendCode}
          content={message.content}
          onCopyCode={onCopyCode}
          onSendCode={onSendCode}
        />
      </div>
      {shouldTruncateUserMessage ? (
        <button
          className="assistant-message-expand"
          onClick={() => setIsUserMessageExpanded((expanded) => !expanded)}
          type="button"
        >
          {isUserMessageExpanded ? "Show less" : "More"}
        </button>
      ) : null}
      <div className="assistant-message-actions">
        <time dateTime={message.createdAt}>{formatAssistantMessageTime(message.createdAt)}</time>
        <button
          aria-label="Copy message"
          onClick={() => onCopyMessage(message)}
          title="Copy message"
          type="button"
        >
          <Copy size={10} />
        </button>
      </div>
    </article>
  );
}

type MarkdownBlock =
  | { kind: "code"; code: string; language: string }
  | { kind: "text"; text: string };

function MarkdownContent({
  canSendCode,
  content,
  onCopyCode,
  onSendCode,
}: {
  canSendCode: boolean;
  content: string;
  onCopyCode: (code: string) => void;
  onSendCode: (code: string) => void;
}) {
  return (
    <div className="markdown-content">
      {parseMarkdownBlocks(content).map((block, index) =>
        block.kind === "code" ? (
          <div className="markdown-code-block" key={`code-${index}`}>
            <div className="markdown-code-toolbar">
              <span>{block.language || "code"}</span>
              <div className="markdown-code-actions">
                <button
                  className="assistant-code-send"
                  onClick={() => onCopyCode(block.code)}
                  type="button"
                >
                  <Copy size={13} />
                  Copy
                </button>
                <button
                  className="assistant-code-send"
                  disabled={!canSendCode}
                  onClick={() => onSendCode(block.code)}
                  title={
                    canSendCode
                      ? "Send to focused terminal"
                      : "Extension drafts are review-only"
                  }
                  type="button"
                >
                  <Terminal size={13} />
                  Send
                </button>
              </div>
            </div>
            <pre>
              <code>{block.code}</code>
            </pre>
          </div>
        ) : (
          <MarkdownTextBlock block={block.text} key={`text-${index}`} />
        ),
      )}
    </div>
  );
}

function MarkdownTextBlock({ block }: { block: string }) {
  const trimmed = block.trim();
  if (!trimmed) {
    return null;
  }

  if (/^#{1,3}\s+/.test(trimmed)) {
    return <h3>{renderInlineMarkdown(trimmed.replace(/^#{1,3}\s+/, ""), "heading")}</h3>;
  }

  const lines = trimmed.split(/\r?\n/);
  if (lines.every((line) => /^[-*]\s+/.test(line.trim()))) {
    return (
      <ul>
        {lines.map((line, index) => (
          <li key={`${line}-${index}`}>
            {renderInlineMarkdown(line.trim().replace(/^[-*]\s+/, ""), `li-${index}`)}
          </li>
        ))}
      </ul>
    );
  }

  if (lines.every((line) => /^>\s?/.test(line.trim()))) {
    return (
      <blockquote>
        {renderInlineMarkdown(
          lines.map((line) => line.trim().replace(/^>\s?/, "")).join(" "),
          "blockquote",
        )}
      </blockquote>
    );
  }

  return <p>{renderInlineMarkdown(trimmed.replace(/\n+/g, " "), "paragraph")}</p>;
}

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const textBuffer: string[] = [];
  const codeBuffer: string[] = [];
  let codeLanguage = "";
  let inCodeBlock = false;

  function flushText() {
    if (textBuffer.length === 0) {
      return;
    }
    blocks.push({ kind: "text", text: textBuffer.join("\n") });
    textBuffer.length = 0;
  }

  function flushCode() {
    blocks.push({ kind: "code", code: codeBuffer.join("\n"), language: codeLanguage });
    codeBuffer.length = 0;
    codeLanguage = "";
  }

  for (const line of content.split(/\r?\n/)) {
    const fence = line.match(/^```\s*([A-Za-z0-9_+.-]*)\s*$/);
    if (fence) {
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        flushText();
        codeLanguage = fence[1] ?? "";
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
    } else if (line.trim() === "") {
      flushText();
    } else {
      textBuffer.push(line);
    }
  }

  if (inCodeBlock) {
    flushCode();
  }
  flushText();
  return blocks;
}

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${match.index}`;
    if (token.startsWith("`")) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}
