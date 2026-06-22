export const MAX_IMAGE_PIXELS = 50_000_000;
export const MAX_IMAGE_DIMENSION = 16_384;

export type ImageOutputFormat = "jpg" | "png" | "webp";
export type ImageDimensionError = "invalid" | "dimension" | "pixels";

export interface ImageDimensions {
  width: number;
  height: number;
}

function wholePixel(value: number) {
  return Math.max(1, Math.round(value));
}

export function calculatePercentageDimensions(
  originalWidth: number,
  originalHeight: number,
  percentage: number,
): ImageDimensions {
  const scale = percentage / 100;
  return {
    width: wholePixel(originalWidth * scale),
    height: wholePixel(originalHeight * scale),
  };
}

export function calculateExactDimensions(
  originalWidth: number,
  originalHeight: number,
  width: number,
  height: number,
  changed: "width" | "height",
  lockAspectRatio: boolean,
): ImageDimensions {
  const nextWidth = wholePixel(width);
  const nextHeight = wholePixel(height);
  if (!lockAspectRatio) return { width: nextWidth, height: nextHeight };
  if (changed === "width") {
    return {
      width: nextWidth,
      height: wholePixel(nextWidth * (originalHeight / originalWidth)),
    };
  }
  return {
    width: wholePixel(nextHeight * (originalWidth / originalHeight)),
    height: nextHeight,
  };
}

export function validateImageDimensions(
  width: number,
  height: number,
): ImageDimensionError | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return "invalid";
  }
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) return "dimension";
  if (width * height > MAX_IMAGE_PIXELS) return "pixels";
  return null;
}

export function outputFilename(inputName: string, format: ImageOutputFormat) {
  const extension = format === "jpg" ? "jpg" : format;
  const base = inputName.replace(/\.(?:jpe?g|png|webp)$/i, "") || "image";
  return `${base}.${extension}`;
}

export function outputMimeType(format: ImageOutputFormat) {
  if (format === "jpg") return "image/jpeg";
  return `image/${format}`;
}
