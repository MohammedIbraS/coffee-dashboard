const BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

async function get(path, params = {}) {
  const url = new URL(BASE + path, window.location.origin);
  Object.entries(params).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export const api = {
  getStores: () => get("/stores"),
  getKpiSummary: (period) => get("/kpi-summary", { period }),
  getRevenue: (params) => get("/revenue", params),
  getTopProducts: (params) => get("/top-products", params),
  getPeakHours: (params) => get("/peak-hours", params),
  getStoreComparison: (params) => get("/store-comparison", params),
  getDayOfWeek: (params) => get("/day-of-week", params),
  getRevenueForecast: (params) => get("/revenue-forecast", params),
  getMenu: (params) => get("/menu", params),

  chat: async (messages) => {
    const res = await fetch(`${BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) throw new Error(`Chat API error ${res.status}`);
    return res.json();
  },
};
