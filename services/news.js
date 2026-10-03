import { services } from "./config.js";

const API_ENV =
  services.news?.apiKeyEnv || "NEWS_API_KEY";

const TOP_HEADLINES_URL =
  "https://newsapi.org/v2/top-headlines";

const EVERYTHING_URL =
  "https://newsapi.org/v2/everything";

function getApiKey() {
  return process.env[API_ENV] || "";
}

function cleanText(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}

export function isNewsReady() {
  return Boolean(getApiKey());
}

export function isValidCategory(category) {
  return [
    "general",
    "technology",
    "sports"
  ].includes(
    String(category || "").toLowerCase()
  );
}

function normalizeArticles(articles = []) {
  return articles
    .filter(article => article?.title)
    .map(article => ({
      title: cleanText(article.title),
      description: cleanText(article.description || ""),
      source: cleanText(
        article.source?.name || "Unknown"
      ),
      author: cleanText(article.author || ""),
      url: article.url || "",
      image: article.urlToImage || null,
      publishedAt: article.publishedAt || null
    }));
}

/*
 * News API's Nigeria top-headlines feed can return
 * HTTP 200 with zero articles.
 *
 * Therefore:
 * 1. Try Top Headlines.
 * 2. If Nigeria returns nothing, automatically
 *    fall back to Everything with Nigeria searches.
 */

function getNigeriaSearchQuery(category) {
  switch (category) {
    case "technology":
      return (
        'Nigeria AND ' +
        '(technology OR tech OR software OR AI OR ' +
        'cybersecurity OR startup OR digital)'
      );

    case "sports":
      return (
        'Nigeria AND ' +
        '(football OR soccer OR sports OR ' +
        '"Super Eagles" OR NPFL)'
      );

    default:
      return (
        '(Nigeria OR Nigerian)'
      );
  }
}

async function requestTopHeadlines(
  category,
  country,
  limit,
  apiKey
) {
  const params = new URLSearchParams({
    country,
    category,
    pageSize: String(limit)
  });

  const response = await fetch(
    `${TOP_HEADLINES_URL}?${params.toString()}`,
    {
      headers: {
        "X-Api-Key": apiKey,
        "User-Agent": "AURELIAN-PRIMORDIAL-LORD"
      }
    }
  );

  const data = await response.json();

  if (!response.ok || data?.status !== "ok") {
    throw new Error(
      data?.message ||
      `News API request failed: HTTP ${response.status}`
    );
  }

  return {
    totalResults: data.totalResults || 0,
    articles: normalizeArticles(
      data.articles || []
    )
  };
}

async function requestEverything(
  category,
  limit,
  apiKey
) {
  const query = getNigeriaSearchQuery(category);

  const params = new URLSearchParams({
    q: query,
    language: "en",
    sortBy: "publishedAt",
    pageSize: String(limit)
  });

  const response = await fetch(
    `${EVERYTHING_URL}?${params.toString()}`,
    {
      headers: {
        "X-Api-Key": apiKey,
        "User-Agent": "AURELIAN-PRIMORDIAL-LORD"
      }
    }
  );

  const data = await response.json();

  if (!response.ok || data?.status !== "ok") {
    throw new Error(
      data?.message ||
      `News search failed: HTTP ${response.status}`
    );
  }

  return {
    totalResults: data.totalResults || 0,
    articles: normalizeArticles(
      data.articles || []
    )
  };
}

export async function getNews(
  category = "general",
  country = "ng",
  limit = 5
) {
  category =
    String(category || "general").toLowerCase();

  country =
    String(country || "ng").toLowerCase();

  if (!isValidCategory(category)) {
    throw new Error(
      "Invalid news category. Use general, technology, or sports."
    );
  }

  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error(`Missing ${API_ENV}`);
  }

  limit = Math.min(
    Math.max(Number(limit) || 5, 1),
    10
  );

  /*
   * Nigeria:
   * Try country/category headlines first.
   */
  if (country === "ng") {
    const top = await requestTopHeadlines(
      category,
      country,
      limit,
      apiKey
    );

    if (top.articles.length > 0) {
      return {
        category,
        country,
        totalResults: top.totalResults,
        sourceType: "top-headlines",
        articles: top.articles
      };
    }

    /*
     * Nigeria fallback:
     * Search the wider News API article database.
     */
    const fallback = await requestEverything(
      category,
      limit,
      apiKey
    );

    return {
      category,
      country,
      totalResults: fallback.totalResults,
      sourceType: "everything",
      articles: fallback.articles
    };
  }

  /*
   * Non-Nigeria countries can still use
   * the normal Top Headlines endpoint.
   */
  const top = await requestTopHeadlines(
    category,
    country,
    limit,
    apiKey
  );

  return {
    category,
    country,
    totalResults: top.totalResults,
    sourceType: "top-headlines",
    articles: top.articles
  };
}

export function buildNewsResult(data) {
  const categoryNames = {
    general: "GENERAL NEWS",
    technology: "TECH NEWS",
    sports: "SPORTS NEWS"
  };

  const title =
    categoryNames[data?.category] || "NEWS";

  const lines = [
    "╭━━━━━━━━━━━━━━━━━━━━╮",
    "        𖣔 𓁹 𖣔",
    `       ${title}`,
    "╰━━━━━━━━━━━━━━━━━━━━╯",
    "",
    `┃𖣔│ Country: ${(data?.country || "ng").toUpperCase()}`,
    `┃𖣔│ Results: ${data?.totalResults || 0}`,
    `┃𖣔│ Source: ${
      data?.sourceType === "everything"
        ? "Nigeria Search"
        : "Top Headlines"
    }`,
    ""
  ];

  if (!data?.articles?.length) {
    lines.push(
      "┃𖣔│ No headlines found."
    );

    lines.push("");
    lines.push(
      "༒════════════════════༒"
    );

    return lines.join("\n");
  }

  data.articles.forEach(
    (article, index) => {
      lines.push(
        `┃𖣔│ ${index + 1}. ${article.title}`
      );

      lines.push(
        `┃𖣔│ 📰 ${article.source}`
      );

      if (article.description) {
        lines.push(
          `┃𖣔│ ${article.description.slice(0, 250)}`
        );
      }

      if (article.url) {
        lines.push(
          `┃𖣔│ 🔗 ${article.url}`
        );
      }

      lines.push("");
    }
  );

  lines.push(
    "༒════════════════════༒"
  );

  return lines.join("\n");
}

export async function getHeadlines(limit = 5) {
  return getNews(
    "general",
    "ng",
    limit
  );
}

export async function getTechNews(limit = 5) {
  return getNews(
    "technology",
    "ng",
    limit
  );
}

export async function getSportsNews(limit = 5) {
  return getNews(
    "sports",
    "ng",
    limit
  );
}

export default {
  isNewsReady,
  isValidCategory,
  getNews,
  getHeadlines,
  getTechNews,
  getSportsNews,
  buildNewsResult
};
