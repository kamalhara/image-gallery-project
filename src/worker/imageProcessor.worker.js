self.onmessage = async (e) => {
  const imageUrl = e.data;

  const response = await fetch(imageUrl);
  const blob = await response.blob();

  const bitmap = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");

  // draw image
  ctx.drawImage(bitmap, 0, 0);

  // watermark
  const text = "Celebrare";
  const fontSize = Math.max(30, bitmap.width * 0.04); // Dynamic font size based on image width
  ctx.font = `bold ${fontSize}px sans-serif`;

  // Add shadow for better visibility on both light and dark images
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = Math.max(5, fontSize * 0.2);
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";

  // Position bottom right
  const padding = fontSize * 0.8;
  const textMetrics = ctx.measureText(text);
  const x = canvas.width - textMetrics.width - padding;
  const y = canvas.height - padding;

  ctx.fillText(text, x, y);

  const finalBlob = await canvas.convertToBlob();

  self.postMessage(finalBlob);
};
