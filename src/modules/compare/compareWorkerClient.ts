type Pending = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

let nextId = 1;
let worker: Worker | null = null;
const pending = new Map<number, Pending>();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./compareWorker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<{ id: number; error?: string }>) => {
      const entry = pending.get(event.data.id);
      if (!entry) {
        return;
      }
      pending.delete(event.data.id);
      if (event.data.error) {
        entry.reject(new Error(event.data.error));
      } else {
        entry.resolve(event.data);
      }
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

function request<T>(message: Record<string, unknown>, transfer?: Transferable[]): Promise<T> {
  const id = nextId;
  nextId += 1;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
    getWorker().postMessage({ ...message, id }, transfer ?? []);
  });
}

export async function decodeBase64InWorker(base64: string): Promise<Uint8Array> {
  const response = await request<{ buffer: ArrayBuffer }>({ type: "decodeBase64", base64 });
  return new Uint8Array(response.buffer);
}

export async function buildHeatmapInWorker({
  width,
  height,
  tolerance,
  left,
  right,
}: {
  width: number;
  height: number;
  tolerance: number;
  left: Uint8ClampedArray;
  right: Uint8ClampedArray;
}): Promise<{ imageData: ImageData; percent: number }> {
  const leftCopy = new Uint8ClampedArray(left);
  const rightCopy = new Uint8ClampedArray(right);
  const response = await request<{ pixels: Uint8ClampedArray; percent: number }>(
    { type: "heatmap", width, height, tolerance, left: leftCopy, right: rightCopy },
    [leftCopy.buffer, rightCopy.buffer],
  );
  return { imageData: new ImageData(response.pixels as Uint8ClampedArray<ArrayBuffer>, width, height), percent: response.percent };
}
