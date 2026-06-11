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
