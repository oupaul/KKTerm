import { useEffect, useRef, useState } from "react";
import { invokeCommand, isTauriRuntime } from "../lib/tauri";

const RAIL_TOOLTIP_DELAY_MS = 650;
const RAIL_TOOLTIP_OFFSET_PX = 9;

export function RailTooltip({ label }: { label: string }) {
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const labelRef = useRef(label);
  const showTimerRef = useRef<number | null>(null);
  const hoverTokenRef = useRef(0);
  const [nativeTooltipSuppressed, setNativeTooltipSuppressed] = useState(false);

  useEffect(() => {
    labelRef.current = label;
  }, [label]);

  useEffect(() => {
    const tooltip = tooltipRef.current;
    const owner = tooltip?.parentElement;
    if (!tooltip || !owner || !isTauriRuntime()) {
      return;
    }
    const tooltipOwner = owner;

    function clearShowTimer() {
      if (showTimerRef.current !== null) {
        window.clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
    }

    function hideNativeTooltip() {
      clearShowTimer();
      hoverTokenRef.current += 1;
      setNativeTooltipSuppressed(false);
      void invokeCommand("hide_native_tooltip").catch(() => {
        // CSS tooltips remain the fallback if the native helper is unavailable.
      });
    }

    function scheduleNativeTooltip() {
      clearShowTimer();
      const hoverToken = hoverTokenRef.current + 1;
      hoverTokenRef.current = hoverToken;
      setNativeTooltipSuppressed(true);
      showTimerRef.current = window.setTimeout(() => {
        const bounds = tooltipOwner.getBoundingClientRect();
        const x = bounds.right + RAIL_TOOLTIP_OFFSET_PX;
        const y = bounds.top + bounds.height / 2;
        void invokeCommand("show_native_tooltip", {
          request: {
            label: labelRef.current,
            x,
            y,
          },
        })
          .then((shown) => {
            if (hoverTokenRef.current !== hoverToken) {
              void invokeCommand("hide_native_tooltip");
              return;
            }
            setNativeTooltipSuppressed(shown);
          })
          .catch(() => {
            if (hoverTokenRef.current === hoverToken) {
              setNativeTooltipSuppressed(false);
            }
          });
      }, RAIL_TOOLTIP_DELAY_MS);
    }

    tooltipOwner.addEventListener("pointerenter", scheduleNativeTooltip);
    tooltipOwner.addEventListener("pointerleave", hideNativeTooltip);
    tooltipOwner.addEventListener("focusin", scheduleNativeTooltip);
    tooltipOwner.addEventListener("focusout", hideNativeTooltip);

    return () => {
      tooltipOwner.removeEventListener("pointerenter", scheduleNativeTooltip);
      tooltipOwner.removeEventListener("pointerleave", hideNativeTooltip);
      tooltipOwner.removeEventListener("focusin", scheduleNativeTooltip);
      tooltipOwner.removeEventListener("focusout", hideNativeTooltip);
      hideNativeTooltip();
    };
  }, []);

  return (
    <span
      ref={tooltipRef}
      className={`rail-tooltip ${nativeTooltipSuppressed ? "native-suppressed" : ""}`}
      role="tooltip"
    >
      {label}
    </span>
  );
}
