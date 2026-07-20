export function fitImageDimensions(
  imageWidth: number,
  imageHeight: number,
  stageWidth: number,
  stageHeight: number,
  padding: number,
) {
  const availableWidth = Math.max(1, stageWidth - padding * 2);
  const availableHeight = Math.max(1, stageHeight - padding * 2);
  const scale = Math.min(1, availableWidth / imageWidth, availableHeight / imageHeight);
  return {
    width: Math.max(1, Math.floor(imageWidth * scale)),
    height: Math.max(1, Math.floor(imageHeight * scale)),
  };
}
