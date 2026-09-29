const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export async function fetchFromAPI(endpoint: string, options?: RequestInit) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`Fetch failed for ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Expeditions
  getExpeditions: () => fetchFromAPI("/expeditions"),
  getExpedition: (id: string) => fetchFromAPI(`/expeditions/${id}`),

  // Assets
  getAssets: (params?: { type?: string; expedition_id?: string; region?: string; year?: number }) => {
    const q = new URLSearchParams();
    if (params?.type) q.append("type", params.type);
    if (params?.expedition_id) q.append("expedition_id", params.expedition_id);
    if (params?.region) q.append("region", params.region);
    if (params?.year) q.append("year", params.year.toString());
    return fetchFromAPI(`/assets?${q.toString()}`);
  },
  getAsset: (id: string) => fetchFromAPI(`/assets/${id}`),

  // Hybrid Search
  search: (params: {
    q?: string;
    type?: string;
    expedition?: string;
    year_from?: number;
    year_to?: number;
    region?: string;
    tags?: string;
    sort?: string;
    page?: number;
  }) => {
    const q = new URLSearchParams();
    if (params.q) q.append("q", params.q);
    if (params.type) q.append("type", params.type);
    if (params.expedition) q.append("expedition", params.expedition);
    if (params.year_from) q.append("year_from", params.year_from.toString());
    if (params.year_to) q.append("year_to", params.year_to.toString());
    if (params.region) q.append("region", params.region);
    if (params.tags) q.append("tags", params.tags);
    if (params.sort) q.append("sort", params.sort);
    if (params.page) q.append("page", params.page.toString());
    return fetchFromAPI(`/search?${q.toString()}`);
  },

  // Image search
  searchImages: (query: string) => fetchFromAPI(`/search/images?q=${encodeURIComponent(query)}`),

  // Grounded Generation
  generateContent: (payload: {
    asset_ids?: string[];
    expedition_id?: string;
    theme?: string;
    formats: string[];
    tone: string;
  }) => fetchFromAPI("/generate", { method: "POST", body: JSON.stringify(payload) }),

  // Editorial
  getDrafts: (params?: { status?: string; kind?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append("status", params.status);
    if (params?.kind) q.append("kind", params.kind);
    return fetchFromAPI(`/editorial/drafts?${q.toString()}`);
  },
  getDraft: (id: string) => fetchFromAPI(`/editorial/drafts/${id}`),
  transitionDraft: (
    id: string,
    action: string,
    comment?: string,
    scheduled_at?: string
  ) =>
    fetchFromAPI(`/editorial/drafts/${id}/transition`, {
      method: "POST",
      body: JSON.stringify({ action, comment, scheduled_at }),
    }),
  getCalendar: (month?: string) => fetchFromAPI(`/editorial/calendar${month ? `?month=${month}` : ""}`),

  // Stories
  getStories: () => fetchFromAPI("/stories"),
  getStory: (id: string) => fetchFromAPI(`/stories/${id}`),

  // Analytics
  getAnalytics: () => fetchFromAPI("/analytics/summary"),

  // Config
  getConfig: () => fetchFromAPI("/config"),

  // Worker trigger
  tickWorker: () => fetchFromAPI("/worker/tick", { method: "POST" }),
};
