import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Click-to-copy helper shared by the utility widgets. `copy(key, text)` writes
 * to the clipboard and remembers `key` briefly so the row can flash a
 * "Copied" state.
 */
export function useCopyFeedback(timeoutMs = 1400) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const copy = useCallback(
    (key: string, text: string) => {
      navigator.clipboard
        ?.writeText(text)
        .then(() => {
          setCopiedKey(key);
          if (timerRef.current !== null) window.clearTimeout(timerRef.current);
          timerRef.current = window.setTimeout(() => setCopiedKey(null), timeoutMs);
        })
        .catch(() => {
          // Clipboard access can be denied; copying is best-effort.
        });
    },
    [timeoutMs],
  );

  return { copiedKey, copy };
}
