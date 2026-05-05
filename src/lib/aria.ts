export function ariaExpanded(isExpanded: boolean) {
  return { "aria-expanded": isExpanded ? "true" : "false" } as const;
}

export function ariaPressed(isPressed: boolean) {
  return { "aria-pressed": isPressed ? "true" : "false" } as const;
}

export function menuButtonAria(isExpanded: boolean) {
  return { "aria-haspopup": "menu", ...ariaExpanded(isExpanded) } as const;
}

export function dialogButtonAria(isExpanded: boolean) {
  return { "aria-haspopup": "dialog", ...ariaExpanded(isExpanded) } as const;
}
