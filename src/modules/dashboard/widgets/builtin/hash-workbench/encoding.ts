// Pure text transforms for the Hash & Encoding Workbench widget.

export function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function decodeBase64(text: string): string | null {
  try {
    const binary = atob(text.trim());
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function encodeUrl(text: string): string {
  return encodeURIComponent(text);
}

export function decodeUrl(text: string): string | null {
  try {
    return decodeURIComponent(text);
  } catch {
    return null;
  }
}

export function bytesToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function bytesToHexString(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function leftRotate(value: number, shift: number): number {
  return (value << shift) | (value >>> (32 - shift));
}

function add32(...values: number[]): number {
  return values.reduce((sum, value) => (sum + value) >>> 0, 0);
}

export function md5Hex(bytes: Uint8Array): string {
  const originalBitLength = bytes.length * 8;
  const paddedLength = (((bytes.length + 8) >>> 6) + 1) << 6;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, originalBitLength >>> 0, true);
  view.setUint32(paddedLength - 4, Math.floor(originalBitLength / 0x100000000), true);

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;
  const shifts = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const constants = Array.from({ length: 64 }, (_, index) =>
    Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) >>> 0,
  );

  for (let offset = 0; offset < paddedLength; offset += 64) {
    const words = Array.from({ length: 16 }, (_, index) =>
      view.getUint32(offset + index * 4, true),
    );
    let aa = a;
    let bb = b;
    let cc = c;
    let dd = d;

    for (let i = 0; i < 64; i += 1) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (bb & cc) | (~bb & dd);
        g = i;
      } else if (i < 32) {
        f = (dd & bb) | (~dd & cc);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = bb ^ cc ^ dd;
        g = (3 * i + 5) % 16;
      } else {
        f = cc ^ (bb | ~dd);
        g = (7 * i) % 16;
      }
      const next = dd;
      dd = cc;
      cc = bb;
      bb = add32(bb, leftRotate(add32(aa, f, constants[i], words[g]), shifts[i]));
      aa = next;
    }

    a = add32(a, aa);
    b = add32(b, bb);
    c = add32(c, cc);
    d = add32(d, dd);
  }

  const digest = new Uint8Array(16);
  const digestView = new DataView(digest.buffer);
  digestView.setUint32(0, a, true);
  digestView.setUint32(4, b, true);
  digestView.setUint32(8, c, true);
  digestView.setUint32(12, d, true);
  return bytesToHexString(digest);
}

const CRC32_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

export function crc32Hex(bytes: Uint8Array): string {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}
