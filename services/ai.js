import { services } from "./config.js";

const API_ENV = services.ai?.apiKeyEnv || "GEMINI_API_KEY";

function getApiKey() {
  return process.env[API_ENV] || "";
}

export function isAIReady() {
  return Boolean(getApiKey());
}

export async function askAI(prompt) {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error(`Missing ${API_ENV}`);
  }

  if (!prompt || !String(prompt).trim()) {
    throw new Error("Please provide a question.");
  }

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: String(prompt).trim()
              }
            ]
          }
        ]
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || `Gemini API error: ${response.status}`
    );
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

export async function translateText(text, language) {
  return askAI(
    `Translate the following text into ${language}. Return only the translation.\n\n${text}`
  );
}

export async function summarizeText(text) {
  return askAI(
    `Summarize the following text clearly and briefly. Preserve the important facts.\n\n${text}`
  );
}

export async function explainText(text) {
  return askAI(
    `Explain the following in simple terms. Use examples when useful.\n\n${text}`
  );
}

export async function rewriteText(text, style = "clear and natural") {
  return askAI(
    `Rewrite the following in a ${style} style while preserving its meaning.\n\n${text}`
  );
}

export async function generateCode(request) {
  return askAI(
    `Help with this programming request. Provide practical, working code and a brief explanation.\n\n${request}`
  );
}

export default {
  isAIReady,
  askAI,
  translateText,
  summarizeText,
  explainText,
  rewriteText,
  generateCode
};
