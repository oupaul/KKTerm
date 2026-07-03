export type AssistantScrollableLog = {
  scrollTop: number;
  scrollHeight: number;
};

export type AssistantScrollableViewport = AssistantScrollableLog & {
  clientHeight: number;
};

const ASSISTANT_BOTTOM_FOLLOW_THRESHOLD_PX = 32;

export function shouldFollowAssistantChat(
  log: AssistantScrollableViewport | null,
  threshold = ASSISTANT_BOTTOM_FOLLOW_THRESHOLD_PX,
) {
  if (!log) {
    return false;
  }

  return log.scrollHeight - log.clientHeight - log.scrollTop <= threshold;
}

export function scrollAssistantChatToBottom(log: AssistantScrollableLog | null) {
  if (!log) {
    return false;
  }

  log.scrollTop = log.scrollHeight;
  return true;
}
