import { type KeyboardEvent } from "react";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      onChange(!checked);
    }
  }

  return (
    <div
      aria-checked={checked}
      className={`toggle-switch ${checked ? "toggle-switch-on" : ""}`}
      onClick={() => onChange(!checked)}
      onKeyDown={handleKeyDown}
      role="switch"
      tabIndex={0}
    >
      <span className="toggle-switch-track">
        <span className="toggle-switch-knob" />
      </span>
    </div>
  );
}
