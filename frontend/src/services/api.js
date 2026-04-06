const BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

// ── In-memory cache (60 s TTL) ───────────────────────────────────────────────
const _cache = new Map(); // key → { data, ts }
const TTL = 60_000;

function _cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL) { _cache.delete(key); return null; }
  return entry.data;
}
function _cacheSet(key, data) { _cache.set(key, { data, ts: Date.now() }); }
export function clearCache() { _cache.clear(); }

// ── Base GET with caching ────────────────────────────────────────────────────
async function get(path, params = {}) {
  const url = new URL(BASE + path, window.location.origin);
  Object.entries(params).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, v));
  const key = url.toString();

  const cached = _cacheGet(key);
  if (cached) return cached;

  const res = await fetch(key);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  _cacheSet(key, data);
  return data;
}

export const api = {
  getStores:         ()       => get("/stores"),
  getKpiSummary:     (period) => get("/kpi-summary", { period }),
  getRevenue:        (params) => get("/revenue", params),
  getTopProducts:    (params) => get("/top-products", params),
  getPeakHours:      (params) => get("/peak-hours", params),
  getStoreComparison:(params) => get("/store-comparison", params),
  getDayOfWeek:      (params) => get("/day-of-week", params),
  getRevenueForecast:(params) => get("/revenue-forecast", params),
  getMenu:           (params) => get("/menu", params),

  chat: async (messages) => {
    const res = await fetch(`${BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) throw new Error(`Chat API error ${res.status}`);
    return res.json();
  },

  // Streaming chat — returns a ReadableStream reader
  chatStream: async (messages) => {
    const res = await fetch(`${BASE}/chat-stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) throw new Error(`Chat API error ${res.status}`);
    return res.body.getReader();
  },
};
