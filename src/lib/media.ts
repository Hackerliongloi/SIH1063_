export function getMediaUrl(keyOrUrl: string | null | undefined): string | null {
  if (!keyOrUrl) return null;
  if (keyOrUrl.startsWith("http://") || keyOrUrl.startsWith("https://") || keyOrUrl.startsWith("/api/storage")) {
    return keyOrUrl;
  }
  return `/api/storage/${keyOrUrl}`;
}
