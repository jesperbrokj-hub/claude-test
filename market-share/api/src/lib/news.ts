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
// API key/signup, unlike most dedicated news APIs. Multiple narrower queries
// (rather than one compound OR string, which tended to return zero hits)
// cover how different outlets and DST itself phrase this topic, including
// the organisations that get quoted on it (per the original brief).
//
// hl=da&gl=DK alone isn't a hard filter — it let through Norwegian outlets
// (Bergens Tidende, Statistisk sentralbyrå) and years-old unrelated hits.
// `site:.dk` restricts to Danish-domain sources. Stacking that with exact
// phrase quotes *and* when:365d on every query turned out to be too much
// at once — combined, they matched nothing live. Keeping site:.dk (does
// the language/country job on its own) and dropping the rest; results
// are already sorted newest-first, so recency still wins without a hard
// cutoff that can zero out a quiet news week.
const QUERIES = [
  "nyregistrerede virksomheder site:.dk",
  "nystiftede virksomheder site:.dk",
  "nye CVR-numre site:.dk",
  '"Dansk Erhverv" nye virksomheder site:.dk',
  "EIFO iværksættere site:.dk",
  "antal nye virksomheder statistik Danmark site:.dk",
  "stiftelse af virksomheder Danmark site:.dk",
  "konkurser nystiftede virksomheder Danmark site:.dk",
];

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

async function fetchQuery(query: string): Promise<NewsArticle[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=da&gl=DK&ceid=DK:da`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`News request failed (${res.status})`);
  }
  const xml = await res.text();
  return parseRss(xml).slice(0, 10);
}

function dedupe(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  const result: NewsArticle[] = [];
  for (const article of articles) {
    const key = article.link || article.title;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(article);
  }
  return result;
}

function byNewestFirst(a: NewsArticle, b: NewsArticle): number {
  const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
  const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
  return bTime - aTime;
}

async function fetchAllArticles(): Promise<NewsArticle[]> {
  // allSettled so one failing query (or an empty result set) doesn't wipe
  // out results from the others.
  const results = await Promise.allSettled(QUERIES.map(fetchQuery));
  const articles = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  return dedupe(articles).sort(byNewestFirst);
}

export async function fetchNews(limit = 8): Promise<NewsArticle[]> {
  const articles = await cache.getOrLoad("articles", fetchAllArticles);
  return articles.slice(0, limit);
}
