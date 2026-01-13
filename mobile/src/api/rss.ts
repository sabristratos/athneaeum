import rssParser, { type RSSFeedItem } from 'react-native-rss-parser';
import { storage } from '@/lib/storage';

export interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  source: 'lithub' | 'millions';
}

interface CachedFeed {
  items: RSSItem[];
  timestamp: number;
}

const RSS_FEEDS = {
  lithub: 'https://lithub.com/feed/',
  millions: 'https://themillions.com/feed/',
} as const;

const CACHE_TTL = 60 * 60 * 1000;
const MAX_ITEMS_PER_FEED = 3;

export async function fetchRSSFeed(source: 'lithub' | 'millions'): Promise<RSSItem[]> {
  const cacheKey = `rss-${source}`;
  const cached = getCachedFeed(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(RSS_FEEDS[source], {
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    const parsed = await rssParser.parse(text);

    const items: RSSItem[] = parsed.items
      .slice(0, MAX_ITEMS_PER_FEED)
      .map((item: RSSFeedItem) => ({
        title: item.title || 'Untitled',
        link: item.links?.[0]?.url || item.id || '',
        pubDate: item.published || new Date().toISOString(),
        source,
      }));

    setCachedFeed(cacheKey, items);
    return items;
  } catch {
    return [];
  }
}

export async function fetchAllFeeds(): Promise<RSSItem[]> {
  const [lithub, millions] = await Promise.all([
    fetchRSSFeed('lithub'),
    fetchRSSFeed('millions'),
  ]);

  const combined = [...lithub, ...millions];

  combined.sort((a, b) => {
    const dateA = new Date(a.pubDate).getTime();
    const dateB = new Date(b.pubDate).getTime();
    return dateB - dateA;
  });

  return combined.slice(0, 5);
}

function getCachedFeed(key: string): RSSItem[] | null {
  try {
    if (!storage) return null;
    const cached = storage.getString(key);
    if (!cached) return null;

    const parsed: CachedFeed = JSON.parse(cached);
    const now = Date.now();

    if (now - parsed.timestamp > CACHE_TTL) {
      storage.remove(key);
      return null;
    }

    return parsed.items;
  } catch {
    return null;
  }
}

function setCachedFeed(key: string, items: RSSItem[]): void {
  try {
    if (!storage) return;
    const data: CachedFeed = {
      items,
      timestamp: Date.now(),
    };
    storage.set(key, JSON.stringify(data));
  } catch {
  }
}

export function clearRSSCache(): void {
  storage?.remove('rss-lithub');
  storage?.remove('rss-millions');
}

export function getLastUpdated(source: 'lithub' | 'millions'): Date | null {
  try {
    if (!storage) return null;
    const cached = storage.getString(`rss-${source}`);
    if (!cached) return null;

    const parsed: CachedFeed = JSON.parse(cached);
    return new Date(parsed.timestamp);
  } catch {
    return null;
  }
}
