// In-memory cache for already-decoded images (blob URLs)
// Prevents re-fetching when scrolling back up
const imageCache = new Map();

export const setCachedImage = (originalUrl, blobUrl) => {
  imageCache.set(originalUrl, blobUrl);
};

export const getCachedImage = (url) => {
  return imageCache.get(url) || null;
};

export const hasCachedImage = (url) => {
  return imageCache.has(url);
};
