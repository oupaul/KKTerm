import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { chooseTutorialBalloonPlacement, type TutorialRect } from "./tutorialOverlayModel";

export type TutorialHighlightRequest = {
  targetId: string;
  title: string;
  body: string;
};

const BALLOON_SIZE = {
  width: 280,
  height: 132,
};

const HIGHLIGHT_PADDING = 6;

export function findTutorialTargetElement(targetId: string): HTMLElement | undefined {
  const trimmedTargetId = targetId.trim();
  if (!trimmedTargetId) {
    return undefined;
  }
  return Array.from(document.querySelectorAll<HTMLElement>("[data-tutorial-id]")).find(
    (element) => element.dataset.tutorialId === trimmedTargetId,
  );
}

export function TutorialOverlay({
  onDismiss,
  request,
}: {
  onDismiss: () => void;
  request?: TutorialHighlightRequest;
}) {
  const [targetRect, setTargetRect] = useState<DOMRect | undefined>();
  const lastRequestRef = useRef<TutorialHighlightRequest | undefined>(undefined);

  useLayoutEffect(() => {
    if (!request) {
      setTargetRect(undefined);
      return;
    }
    lastRequestRef.current = request;

    function updateTargetRect() {
      if (!request) {
        return;
      }
      const target = findTutorialTargetElement(request.targetId);
      setTargetRect(target?.getBoundingClientRect());
    }

    updateTargetRect();
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);
    return () => {
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [request]);

  useEffect(() => {
    if (!request) {
      return;
    }

    function dismiss() {
      onDismiss();
    }

    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("keydown", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss, true);
      document.removeEventListener("keydown", dismiss, true);
    };
  }, [onDismiss, request]);

  const activeRequest = request ?? lastRequestRef.current;
  if (!activeRequest || !targetRect) {
    return null;
  }

  const target = rectFromDomRect(targetRect);
  const viewport = {
    left: 0,
    top: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  };
  const placement = chooseTutorialBalloonPlacement(target, viewport, BALLOON_SIZE);
  const highlightStyle = {
    left: `${Math.max(0, target.left - HIGHLIGHT_PADDING)}px`,
    top: `${Math.max(0, target.top - HIGHLIGHT_PADDING)}px`,
    width: `${target.width + HIGHLIGHT_PADDING * 2}px`,
    height: `${target.height + HIGHLIGHT_PADDING * 2}px`,
  };
  const balloonStyle = {
    left: `${placement.left}px`,
    top: `${placement.top}px`,
  };

  return (
    <div className="tutorial-overlay" aria-live="polite" role="presentation">
      <div className="tutorial-overlay-dim" />
      <div className="tutorial-highlight" style={highlightStyle} />
      <aside
        className="tutorial-balloon"
        data-side={placement.side}
        role="status"
        style={balloonStyle}
      >
        <strong>{activeRequest.title}</strong>
        <p>{activeRequest.body}</p>
      </aside>
    </div>
  );
}

function rectFromDomRect(rect: DOMRect): TutorialRect {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}
