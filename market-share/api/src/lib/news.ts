import { TtlCache } from "./cache";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes — news doesn't need to refresh every page load
const cache = new TtlCache<NewsArticle[]>(CACHE_TTL_MS);

export interface NewsArticle {
  title: string;
  link: string;
  source: string;
  publishedAt: string | null;
}

// Best-effort keyword search, not a curated feed — Google News RSS needs no
// API key/signup, unlike most dedicated news APIs.
const QUERY = "nye CVR-numre OR nystiftede virksomheder OR nye virksomheder Danmark";

function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeXmlEntities(match[1]) : null;
}

function parseRss(xml: string): NewsArticle[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.map((item) => {
    const rawTitle = extractTag(item, "title") ?? "";
    const link = extractTag(item, "link") ?? "";
    const publishedAt = extractTag(item, "pubDate");
    const sourceTag = extractTag(item, "source");

    // Google News titles are usually formatted "Headline - Source name".
    const dashIndex = rawTitle.lastIndexOf(" - ");
    const hasTrailingSource = !sourceTag && dashIndex !== -1;
    const title = hasTrailingSource ? rawTitle.slice(0, dashIndex) : rawTitle;
    const source = sourceTag ?? (hasTrailingSource ? rawTitle.slice(dashIndex + 3) : "");

    return { title, link, source, publishedAt };
  });
}

async function fetchAllArticles(): Promise<NewsArticle[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(QUERY)}&hl=da&gl=DK&ceid=DK:da`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`News request failed (${res.status})`);
  }
  const xml = await res.text();
  return parseRss(xml);
}

export async function fetchNews(limit = 8): Promise<NewsArticle[]> {
  const articles = await cache.getOrLoad("articles", fetchAllArticles);
  return articles.slice(0, limit);
}
