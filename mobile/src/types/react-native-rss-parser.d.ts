declare module 'react-native-rss-parser' {
  interface RSSLink {
    url: string;
    rel?: string;
  }

  interface RSSFeedItem {
    id?: string;
    title?: string;
    links?: RSSLink[];
    description?: string;
    content?: string;
    published?: string;
    updated?: string;
    authors?: Array<{ name: string }>;
    categories?: string[];
    enclosures?: Array<{ url: string; type?: string; length?: string }>;
  }

  interface RSSFeed {
    type: string;
    title: string;
    links: RSSLink[];
    description: string;
    language?: string;
    copyright?: string;
    authors?: Array<{ name: string }>;
    lastUpdated?: string;
    lastPublished?: string;
    categories?: string[];
    image?: { url: string; title?: string; link?: string };
    items: RSSFeedItem[];
  }

  function parse(xml: string): Promise<RSSFeed>;

  export default { parse };
  export { parse, RSSFeed, RSSFeedItem, RSSLink };
}
