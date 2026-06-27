import { useEffect, useRef } from "react";
import { ColorPalettePicker } from "kkterm";

// The picker's rich UI (color wheel + hex field) lives in a popover that only
// opens on click. Open it on mount via the component's own button so the card
// shows the real expanded state — no reimplementation, just a click.
function OpenPicker({ value }: { value: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector("button")?.click();
  }, []);
  // The popover is right-anchored (opens leftward, 224px wide), so center the
  // trigger to give it room instead of clipping against the card's left edge.
  return (
    <div
      ref={ref}
      style={{ display: "flex", justifyContent: "center", padding: 10, minHeight: 300 }}
    >
      <ColorPalettePicker value={value} onChange={() => {}} />
    </div>
  );
}

export const Open = () => <OpenPicker value="#5e5ce6" />;

export const Trigger = () => (
  <div style={{ padding: 10 }}>
    <ColorPalettePicker value="#34c759" onChange={() => {}} />
  </div>
);
