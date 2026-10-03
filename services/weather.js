import { services } from "./config.js";

const API_ENV =
  services.weather?.apiKeyEnv || "OPENWEATHER_API_KEY";

function getApiKey() {
  return process.env[API_ENV] || "";
}

function cleanText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

export function isValidLocation(location) {
  return Boolean(cleanText(location));
}

export function isWeatherReady() {
  return Boolean(getApiKey());
}

export async function getWeather(location) {
  location = cleanText(location);

  if (!isValidLocation(location)) {
    throw new Error("Please provide a city or location.");
  }

  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error(`Missing ${API_ENV}`);
  }

  const url =
    "https://api.openweathermap.org/data/2.5/weather" +
    `?q=${encodeURIComponent(location)}` +
    "&units=metric" +
    `&appid=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message
        ? `Weather: ${data.message}`
        : `Weather request failed: HTTP ${response.status}`
    );
  }

  return {
    city: data.name,
    country: data.sys?.country || "",
    temperature: data.main?.temp,
    feelsLike: data.main?.feels_like,
    humidity: data.main?.humidity,
    pressure: data.main?.pressure,
    windSpeed: data.wind?.speed,
    description: data.weather?.[0]?.description || "Unknown",
    icon: data.weather?.[0]?.icon || null
  };
}

export function buildWeatherResult(data) {
  if (!data) {
    return "𖣔 Weather information unavailable.";
  }

  return [
    "╭━━━━━━━━━━━━━━━━━━━━╮",
    "        𖣔 𓁹 𖣔",
    "          WEATHER",
    "╰━━━━━━━━━━━━━━━━━━━━╯",
    "",
    `┃𖣔│ Location: ${data.city}, ${data.country}`,
    `┃𖣔│ Condition: ${data.description}`,
    `┃𖣔│ Temperature: ${data.temperature}°C`,
    `┃𖣔│ Feels Like: ${data.feelsLike}°C`,
    `┃𖣔│ Humidity: ${data.humidity}%`,
    `┃𖣔│ Pressure: ${data.pressure} hPa`,
    `┃𖣔│ Wind: ${data.windSpeed} m/s`,
    "",
    "༒════════════════════༒"
  ].join("\n");
}

export default {
  isWeatherReady,
  isValidLocation,
  getWeather,
  buildWeatherResult
};
