interface HexDecodeRequest {
  id: number;
  base64: string;
}

const workerSelf = self as unknown as {
  onmessage: ((event: MessageEvent<HexDecodeRequest>) => void) | null;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};

workerSelf.onmessage = (event: MessageEvent<HexDecodeRequest>) => {
  const { id, base64 } = event.data;
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    workerSelf.postMessage({ id, buffer: bytes.buffer }, [bytes.buffer]);
  } catch (error) {
    workerSelf.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export {};
