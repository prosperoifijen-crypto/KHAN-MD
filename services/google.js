function cleanText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

export function isValidSearch(query) {
  return Boolean(cleanText(query));
}

function decodeHtml(text = "") {
  return String(text)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]*>/g, "")
    .trim();
}

export async function googleSearch(query, limit = 10) {
  query = cleanText(query);

  if (!isValidSearch(query)) {
    throw new Error("Please provide a search query.");
  }

  limit = Math.min(Math.max(Number(limit) || 10, 1), 10);

  const response = await fetch(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/150.0 Mobile Safari/537.36"
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Search failed: HTTP ${response.status}`);
  }

  const html = await response.text();
  const results = [];
  const seen = new Set();

  const pattern =
    /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(pattern)) {
    let url = match[1];

    try {
      url = decodeURIComponent(url);

      if (url.startsWith("//duckduckgo.com/l/?")) {
        const redirect = new URL(`https:${url}`);
        url = redirect.searchParams.get("uddg") || "";
      }
    } catch {}

    const title = decodeHtml(match[2]);

    if (!url || !/^https?:\/\//i.test(url) || !title) {
      continue;
    }

    if (seen.has(url)) {
      continue;
    }

    seen.add(url);

    results.push({
      title,
      url
    });

    if (results.length >= limit) {
      break;
    }
  }

  return {
    query,
    results
  };
}

export function buildGoogleResult(data) {
  const lines = [
    "╭━━━━━━━━━━━━━━━━━━━━╮",
    "        𖣔 𓁹 𖣔",
    "       GOOGLE SEARCH",
    "╰━━━━━━━━━━━━━━━━━━━━╯",
    "",
    `┃𖣔│ Query: ${data?.query || "Unknown"}`,
    ""
  ];

  if (!data?.results?.length) {
    lines.push("┃𖣔│ No results found.");
  } else {
    data.results.forEach((result, index) => {
      lines.push(`┃𖣔│ ${index + 1}. ${result.title}`);
      lines.push(`┃𖣔│ ${result.url}`);
      lines.push("");
    });
  }

  lines.push("༒════════════════════༒");

  return lines.join("\n");
}

export default {
  isValidSearch,
  googleSearch,
  buildGoogleResult
};
