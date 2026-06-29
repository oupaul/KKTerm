interface DecodeBase64Request {
  type: "decodeBase64";
  id: number;
  base64: string;
}

interface HeatmapRequest {
  type: "heatmap";
  id: number;
  width: number;
  height: number;
  tolerance: number;
  left: Uint8ClampedArray;
  right: Uint8ClampedArray;
}

type CompareWorkerRequest = DecodeBase64Request | HeatmapRequest;

function decodeBase64(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function buildHeatmap({ width, height, tolerance, left, right }: HeatmapRequest) {
  const out = new Uint8ClampedArray(width * height * 4);
  let changed = 0;
  const total = width * height;
  for (let i = 0; i < out.length; i += 4) {
    const lLum = (left[i] * 0.299 + left[i + 1] * 0.587 + left[i + 2] * 0.114) * (left[i + 3] / 255);
    const rLum = (right[i] * 0.299 + right[i + 1] * 0.587 + right[i + 2] * 0.114) * (right[i + 3] / 255);
    const delta = lLum - rLum;
    if (Math.abs(delta) <= tolerance) {
      out[i] = 12;
      out[i + 1] = 16;
      out[i + 2] = 24;
      out[i + 3] = 255;
      continue;
    }
    changed += 1;
    const magnitude = Math.min(255, 80 + Math.abs(delta));
    if (delta > 0) {
      out[i] = magnitude;
      out[i + 1] = 30;
      out[i + 2] = 40;
    } else {
      out[i] = 40;
      out[i + 1] = 60;
      out[i + 2] = magnitude;
    }
    out[i + 3] = 255;
  }
  return { pixels: out, percent: total > 0 ? (changed / total) * 100 : 0 };
}

const workerSelf = self as unknown as {
  onmessage: ((event: MessageEvent<CompareWorkerRequest>) => void) | null;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};

workerSelf.onmessage = (event: MessageEvent<CompareWorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === "decodeBase64") {
      const buffer = decodeBase64(request.base64);
      workerSelf.postMessage({ id: request.id, buffer }, [buffer]);
      return;
    }
    const result = buildHeatmap(request);
    workerSelf.postMessage({ id: request.id, pixels: result.pixels, percent: result.percent }, [result.pixels.buffer]);
  } catch (error) {
    workerSelf.postMessage({ id: request.id, error: error instanceof Error ? error.message : String(error) });
  }
};

export {};
