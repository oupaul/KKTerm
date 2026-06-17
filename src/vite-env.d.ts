/// <reference types="vite/client" />

declare module "widget-lib:*" {
  const source: string;
  export default source;
}

// The `qrcode` package ships no TypeScript types; declare the small surface
// the QR Code dashboard widget uses.
declare module "qrcode" {
  interface QRCodeToCanvasOptions {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    margin?: number;
    width?: number;
    color?: { dark?: string; light?: string };
  }
  const QRCode: {
    toCanvas(
      canvas: HTMLCanvasElement,
      text: string,
      options?: QRCodeToCanvasOptions,
    ): Promise<HTMLCanvasElement>;
  };
  export default QRCode;
}

// The `papaparse` package's bundled types are not installed; declare the small
// synchronous parse surface the Document's CSV/TSV table mode uses.
declare module "papaparse" {
  interface ParseConfig {
    delimiter?: string;
    skipEmptyLines?: boolean | "greedy";
    header?: boolean;
  }
  interface ParseResult<T> {
    data: T[];
    errors: unknown[];
    meta: { delimiter: string; aborted: boolean; truncated: boolean };
  }
  const Papa: {
    parse<T>(input: string, config?: ParseConfig): ParseResult<T>;
  };
  export default Papa;
}

