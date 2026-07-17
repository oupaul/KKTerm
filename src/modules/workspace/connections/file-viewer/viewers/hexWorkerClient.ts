type PendingDecode = {
  resolve: (bytes: Uint8Array) => void;
  reject: (reason?: unknown) => void;
};

let nextId = 1;
let worker: Worker | null = null;
const pending = new Map<number, PendingDecode>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./hexWorker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<{ id: number; buffer?: ArrayBuffer; error?: string }>) => {
      const entry = pending.get(event.data.id);
      if (!entry) {
        return;
      }
      pending.delete(event.data.id);
      if (event.data.error || !event.data.buffer) {
        entry.reject(new Error(event.data.error ?? "Hex decode returned no data"));
        return;
      }
      entry.resolve(new Uint8Array(event.data.buffer));
    };
    worker.onerror = (event) => {
      const error = new Error(event.message);
      for (const entry of pending.values()) {
        entry.reject(error);
      }
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  }
  return worker;
}

export function decodeHexBase64InWorker(base64: string): Promise<Uint8Array> {
  const id = nextId;
  nextId += 1;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, base64 });
  });
}
