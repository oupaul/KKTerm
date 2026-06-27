// Pointer-capture drag handle for the Git Browser's resizable panes and window
// grip. Mirrors the workspace chrome's `beginDragResize` pattern but is axis-aware
// (x / y / both) and reports incremental deltas so callers can nudge a clamped
// layout value. The cursor + text-selection lock is applied to <body> for the
// duration of the drag.
import { useCallback, type PointerEvent as ReactPointerEvent } from "react";

type Axis = "x" | "y" | "xy";

const CURSOR: Record<Axis, string> = {
  x: "ew-resize",
  y: "ns-resize",
  xy: "nwse-resize",
};

export function GitResizeHandle({
  axis,
  className,
  ariaLabel,
  onResize,
}: {
  axis: Axis;
  className: string;
  ariaLabel: string;
  /** Called on each pointer move with the delta since the previous move. */
  onResize: (dx: number, dy: number) => void;
}) {
  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);
      let lastX = event.clientX;
      let lastY = event.clientY;

      const previousCursor = document.body.style.cursor;
      const previousSelect = document.body.style.userSelect;
      document.body.style.cursor = CURSOR[axis];
      document.body.style.userSelect = "none";

      const move = (moveEvent: PointerEvent) => {
        onResize(moveEvent.clientX - lastX, moveEvent.clientY - lastY);
        lastX = moveEvent.clientX;
        lastY = moveEvent.clientY;
      };
      const stop = () => {
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousSelect;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop);
    },
    [axis, onResize],
  );

  return (
    <div
      className={className}
      role="separator"
      aria-label={ariaLabel}
      aria-orientation={axis === "y" ? "horizontal" : "vertical"}
      onPointerDown={onPointerDown}
    />
  );
}
