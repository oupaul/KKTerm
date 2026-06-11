// Self-contained macOS RDP view: renders the IronRDP framebuffer to a <canvas>
// and sends mouse + hybrid keyboard input. Kept independent of the VNC/Windows
// ActiveX paths in RemoteDesktopWorkspace so neither is affected.
//
// Keyboard model (see research in the IronRDP/RDP keyboard notes):
//   - Printable text, including IME composition, dead keys and accents, is sent
//     as RDP Unicode keyboard events via `send_rdp_client_text` (the local OS/IME
//     composes; the final characters are layout-independent).
//   - Control / navigation / modifier keys and Ctrl/Alt/Meta shortcuts are sent
//     as scancodes via `send_rdp_client_key_event`.

import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { invokeCommand, isTauriRuntime } from "../../../../lib/tauri";
import type { Connection } from "../../../../types";
import { connectionPasswordOwnerId } from "../utils";
import { isCharacterCode, scancodeForCode } from "./rdpScancodes";

type RdpCanvasEvent =
  | { kind: "connected"; sessionId: string; name: string }
  | { kind: "resolution"; sessionId: string; width: number; height: number }
  | {
      kind: "rawImage";
      sessionId: string;
      x: number;
      y: number;
      width: number;
      height: number;
      rgba: string;
    }
  | {
      kind: "setCursor";
      sessionId: string;
      width: number;
      height: number;
      hotX: number;
      hotY: number;
      rgba: string;
    }
  | { kind: "error"; sessionId: string; message: string }
  | { kind: "disconnected"; sessionId: string };

function createRdpSessionId() {
  return `rdp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function RdpCanvasView({
  cadSignal = 0,
  connection,
  surfaceRef,
}: {
  cadSignal?: number;
  connection: Connection;
  surfaceRef?: RefObject<HTMLCanvasElement | null>;
}) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const buttonMaskRef = useRef(0);
  const composingRef = useRef(false);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [errorMessage, setErrorMessage] = useState("");

  // Session lifecycle + framebuffer rendering.
  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }
    let disposed = false;
    let unlisten: (() => void) | undefined;
    const sessionId = createRdpSessionId();
    sessionIdRef.current = sessionId;
    setStatus("connecting");
    setErrorMessage("");

    const draw = (event: RdpCanvasEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      if (event.kind === "resolution") {
        canvas.width = event.width;
        canvas.height = event.height;
        return;
      }
      if (event.kind === "rawImage") {
        if (event.width === 0 || event.height === 0) {
          return;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return;
        }
        const bytes = base64ToBytes(event.rgba);
        const expected = event.width * event.height * 4;
        if (bytes.length < expected) {
          return;
        }
        const clamped = new Uint8ClampedArray(expected);
        clamped.set(bytes.subarray(0, expected));
        const image = new ImageData(clamped, event.width, event.height);
        ctx.putImageData(image, event.x, event.y);
      }
    };

    void listen<RdpCanvasEvent>("rdp-canvas-event", (event) => {
      if (disposed || event.payload.sessionId !== sessionIdRef.current) {
        return;
      }
      const payload = event.payload;
      switch (payload.kind) {
        case "connected":
          setStatus("connected");
          break;
        case "error":
          setErrorMessage(payload.message);
          break;
        case "disconnected":
          setStatus("disconnected");
          break;
        default:
          draw(payload);
      }
    }).then((dispose) => {
      if (disposed) {
        dispose();
        return;
      }
      unlisten = dispose;
    });

    void invokeCommand("start_rdp_client_session", {
      request: {
        sessionId,
        host: connection.host,
        port: connection.port,
        username: connection.user ?? "",
        secretOwnerId: connectionPasswordOwnerId(connection),
      },
    }).catch((error) => {
      if (!disposed) {
        setErrorMessage(error instanceof Error ? error.message : String(error));
        setStatus("disconnected");
      }
    });

    return () => {
      disposed = true;
      unlisten?.();
      void invokeCommand("close_rdp_client_session", { request: { sessionId } }).catch(() => undefined);
      sessionIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.id, connection.host, connection.port, connection.user]);

  // ── Mouse ──────────────────────────────────────────────────────────────────
  const remotePoint = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return null;
    }
    const x = Math.max(0, Math.min(canvas.width - 1, Math.round(((clientX - rect.left) / rect.width) * canvas.width)));
    const y = Math.max(0, Math.min(canvas.height - 1, Math.round(((clientY - rect.top) / rect.height) * canvas.height)));
    return { x, y };
  };

  const sendPointer = (clientX: number, clientY: number, buttonMask: number) => {
    const sessionId = sessionIdRef.current;
    const point = remotePoint(clientX, clientY);
    if (!sessionId || !point) {
      return;
    }
    void invokeCommand("send_rdp_client_pointer_event", {
      request: { sessionId, x: point.x, y: point.y, buttonMask },
    }).catch(() => undefined);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    sendPointer(e.clientX, e.clientY, buttonMaskRef.current);
  };
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    inputRef.current?.focus();
    const bit = e.button === 1 ? 1 : e.button === 2 ? 2 : e.button === 0 ? 0 : -1;
    if (bit >= 0) {
      buttonMaskRef.current |= 1 << bit;
    }
    sendPointer(e.clientX, e.clientY, buttonMaskRef.current);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const bit = e.button === 1 ? 1 : e.button === 2 ? 2 : e.button === 0 ? 0 : -1;
    if (bit >= 0) {
      buttonMaskRef.current &= ~(1 << bit);
    }
    sendPointer(e.clientX, e.clientY, buttonMaskRef.current);
  };
  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    // Bit 3 = wheel up, bit 4 = wheel down (momentary, matching the backend).
    const wheelBit = e.deltaY < 0 ? 1 << 3 : 1 << 4;
    sendPointer(e.clientX, e.clientY, buttonMaskRef.current | wheelBit);
  };

  // ── Keyboard ────────────────────────────────────────────────────────────────
  const sendScancode = (scancode: number, down: boolean) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) {
      return;
    }
    void invokeCommand("send_rdp_client_key_event", {
      request: { sessionId, scancode, down },
    }).catch(() => undefined);
  };

  const sendText = (text: string) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || text.length === 0) {
      return;
    }
    void invokeCommand("send_rdp_client_text", { request: { sessionId, text } }).catch(() => undefined);
  };

  const setCanvasRef = (node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
    if (surfaceRef) {
      surfaceRef.current = node;
    }
  };

  const sendCtrlAltDelete = () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) {
      return;
    }
    void invokeCommand("send_rdp_client_ctrl_alt_delete", { request: { sessionId } }).catch(() => undefined);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (cadSignal === 0) {
      return;
    }
    sendCtrlAltDelete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadSignal]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (composingRef.current || e.key === "Process") {
      return; // IME is composing — let composition events handle it.
    }
    const shortcut = e.ctrlKey || e.altKey || e.metaKey;
    const isText = isCharacterCode(e.code);
    if (isText && !shortcut) {
      return; // Plain printable key → handled by the Unicode/input path below.
    }
    const scancode = scancodeForCode(e.code);
    if (scancode !== undefined) {
      e.preventDefault();
      sendScancode(scancode, true);
    }
  };

  const onKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (composingRef.current) {
      return;
    }
    const shortcut = e.ctrlKey || e.altKey || e.metaKey;
    const isText = isCharacterCode(e.code);
    if (isText && !shortcut) {
      return;
    }
    const scancode = scancodeForCode(e.code);
    if (scancode !== undefined) {
      e.preventDefault();
      sendScancode(scancode, false);
    }
  };

  const onCompositionStart = () => {
    composingRef.current = true;
  };
  const onCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    composingRef.current = false;
    if (e.data) {
      sendText(e.data);
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };
  const onInput = (e: React.FormEvent<HTMLInputElement>) => {
    if (composingRef.current) {
      return; // wait for compositionend
    }
    const native = e.nativeEvent as InputEvent;
    if (native.inputType === "insertText" && native.data) {
      sendText(native.data);
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const statusText =
    status === "connecting"
      ? t("remoteDesktop.connecting")
      : status === "disconnected"
        ? t("remoteDesktop.disconnected")
        : "";

  return (
    <div className="rdp-canvas-view" onPointerDown={() => inputRef.current?.focus()}>
      <canvas
        ref={setCanvasRef}
        className="rdp-canvas-surface"
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
      {/* Visually-hidden focus target that captures IME composition + text input. */}
      <input
        ref={inputRef}
        className="rdp-canvas-ime-input"
        aria-label={t("remoteDesktop.displayAria")}
        title={t("remoteDesktop.displayAria")}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onInput={onInput}
        onCompositionStart={onCompositionStart}
        onCompositionUpdate={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
      />
      {(statusText || errorMessage) && (
        <div className="rdp-canvas-status">{errorMessage || statusText}</div>
      )}
    </div>
  );
}
