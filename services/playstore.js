const GOOGLE_PLAY_SEARCH =
  "https://play.google.com/store/search?q=";

export function isValidAppName(name) {
  return Boolean(String(name || "").trim());
}

function cleanText(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}

export async function searchPlayStore(appName) {
  if (!isValidAppName(appName)) {
    throw new Error("Please provide an app name.");
  }

  const query = encodeURIComponent(cleanText(appName));

  const response = await fetch(
    `${GOOGLE_PLAY_SEARCH}${query}&c=apps&hl=en`
  );

  if (!response.ok) {
    throw new Error(
      `Google Play Store request failed: ${response.status}`
    );
  }

  const html = await response.text();

  const links = [
    ...html.matchAll(
      /href="(\/store\/apps\/details\?id=[^"]+)"/g
    )
  ].map(match => match[1]);

  const uniqueLinks = [...new Set(links)];

  if (!uniqueLinks.length) {
    return {
      found: false,
      query: cleanText(appName),
      results: []
    };
  }

  const results = uniqueLinks.slice(0, 10).map(link => {
    const idMatch = link.match(/[?&]id=([^&"]+)/);

    return {
      package: idMatch?.[1] || null,
      url: `https://play.google.com${link}`
    };
  });

  return {
    found: true,
    query: cleanText(appName),
    results
  };
}

export function buildPlayStoreResult(data) {
  if (!data?.found || !data.results?.length) {
    return `𖣔 No Play Store results found for: ${data?.query || "unknown app"}`;
  }

  const lines = [
    "╭━━━━━━━━━━━━━━━━━━━━╮",
    "        𖣔 𓁹 𖣔",
    "       PLAY STORE",
    "╰━━━━━━━━━━━━━━━━━━━━╯",
    "",
    `┃𖣔│ Search: ${data.query}`,
    ""
  ];

  data.results.forEach((app, index) => {
    lines.push(`┃𖣔│ ${index + 1}. ${app.package || "Unknown package"}`);
    lines.push(`┃𖣔│ ${app.url}`);
  });

  lines.push("");
  lines.push("༒════════════════════༒");

  return lines.join("\n");
}

export default {
  isValidAppName,
  searchPlayStore,
  buildPlayStoreResult
};
