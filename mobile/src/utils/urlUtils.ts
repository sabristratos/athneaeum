const DEV_API_HOST = '192.168.1.102:8000';

export function normalizeAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!__DEV__) return url;

  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      parsed.host = DEV_API_HOST;
      return parsed.toString();
    }
  } catch {
    return url;
  }
  return url;
}
