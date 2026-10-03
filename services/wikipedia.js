function cleanText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

export function isValidWikipediaQuery(query) {
  return Boolean(cleanText(query));
}

export async function wikipediaSearch(query) {
  query = cleanText(query);

  if (!isValidWikipediaQuery(query)) {
    throw new Error("Please provide a Wikipedia topic.");
  }

  const url =
    `https://en.wikipedia.org/w/api.php` +
    `?action=query` +
    `&generator=search` +
    `&gsrsearch=${encodeURIComponent(query)}` +
    `&gsrlimit=5` +
    `&prop=extracts|info` +
    `&exintro=1` +
    `&explaintext=1` +
    `&inprop=url` +
    `&format=json` +
    `&origin=*`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Wikipedia request failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  const pages = Object.values(data?.query?.pages || {});

  if (!pages.length) {
    return {
      found: false,
      query,
      results: []
    };
  }

  const results = pages
    .sort((a, b) => Number(a.index || 0) - Number(b.index || 0))
    .map(page => ({
      title: page.title || "Unknown",
      extract: cleanText(page.extract || ""),
      url:
        page.fullurl ||
        `https://en.wikipedia.org/wiki/${encodeURIComponent(
          String(page.title || "").replace(/ /g, "_")
        )}`
    }));

  return {
    found: true,
    query,
    results
  };
}

export function buildWikipediaResult(data) {
  const lines = [
    "╭━━━━━━━━━━━━━━━━━━━━╮",
    "        𖣔 𓁹 𖣔",
    "        WIKIPEDIA",
    "╰━━━━━━━━━━━━━━━━━━━━╯",
    "",
    `┃𖣔│ Topic: ${data?.query || "Unknown"}`,
    ""
  ];

  if (!data?.results?.length) {
    lines.push("┃𖣔│ No Wikipedia results found.");
  } else {
    const result = data.results[0];

    lines.push(`┃𖣔│ ${result.title}`);

    if (result.extract) {
      lines.push("");
      lines.push(`┃𖣔│ ${result.extract.slice(0, 1800)}`);
    }

    lines.push("");
    lines.push(`┃𖣔│ ${result.url}`);
  }

  lines.push("");
  lines.push("༒════════════════════༒");

  return lines.join("\n");
}

export default {
  isValidWikipediaQuery,
  wikipediaSearch,
  buildWikipediaResult
};
