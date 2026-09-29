const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

const mockAssets = [
  {
    id: "asset-001",
    title: "Maitri Winterover Glacier Margin Survey",
    type: "report",
    region: "Antarctica",
    year: 2024,
    summary: "Seasonal ice margin observations from Maitri Station during the winterover period.",
    tags: ["glacier", "winterover", "antarctica"],
  },
  {
    id: "asset-002",
    title: "Bharati Aurora Borealis Time Series",
    type: "dataset",
    region: "Antarctica",
    year: 2023,
    summary: "Auroral variability and weather correlations recorded across the 2023 campaign.",
    tags: ["aurora", "weather", "bharati"],
  },
  {
    id: "asset-003",
    title: "Kongsfjorden CTD Salinity Profile",
    type: "dataset",
    region: "Arctic",
    year: 2022,
    summary: "CTD depth profile measuring salinity and temperature at Kongsfjorden.",
    tags: ["ctd", "salinity", "arctic"],
  },
];

const mockStories = [
  {
    id: "story-001",
    title: "Cryosphere Watching from the Indian Polar Network",
    slug: "cryosphere-watching-from-the-indian-polar-network",
    excerpt: "A narrative summary of how long-term monitoring supports climate resilience work.",
    published_at: "2024-06-15T00:00:00Z",
  },
  {
    id: "story-002",
    title: "From Ice Cores to Community Outreach",
    slug: "from-ice-cores-to-community-outreach",
    excerpt: "Translating polar science into local climate literacy and public engagement.",
    published_at: "2024-03-05T00:00:00Z",
  },
];

const mockExpeditions = [
  {
    id: "exp-001",
    name: "Maitri Winterover 2023-24",
    region: "Schirmacher Oasis",
    status: "active",
  },
  {
    id: "exp-002",
    name: "Bharati Coastal Sensing Campaign",
    region: "Larsemann Hills",
    status: "completed",
  },
];

const mockSearchResults = {
  results: [
    {
      id: "sr-001",
      title: "Adélie Penguin Rookery Census",
      type: "report",
      region: "Antarctica",
      year: 2024,
      score: 0.97,
      summary: "Population and breeding activity census around the Maitri observation grid.",
    },
    {
      id: "sr-002",
      title: "Sutri Dhaka Glacier Mass Balance",
      type: "dataset",
      region: "Himalaya",
      year: 2023,
      score: 0.91,
      summary: "Mass balance observations tracked across the Himalayan cryosphere segment.",
    },
  ],
  total: 2,
  parsed_year_range: { from: 2023, to: 2024 },
};

function mockResponseFor(endpoint: string): any {
  if (endpoint === "/assets" || endpoint.startsWith("/assets?")) {
    return mockAssets;
  }

  if (endpoint === "/stories" || endpoint.startsWith("/stories?")) {
    return mockStories;
  }

  if (endpoint === "/expeditions" || endpoint.startsWith("/expeditions?")) {
    return mockExpeditions;
  }

  if (endpoint.startsWith("/search")) {
    return mockSearchResults;
  }

  if (endpoint === "/analytics/summary") {
    return {
      total_assets: mockAssets.length,
      total_stories: mockStories.length,
      total_expeditions: mockExpeditions.length,
      updated_at: new Date().toISOString(),
    };
  }

  if (endpoint === "/config") {
    return { api_mode: "demo", ready: true };
  }

  return null;
}

export async function fetchFromAPI(endpoint: string, options?: RequestInit) {
  const url = `${API_BASE}${endpoint}`;

  try {
    const res = await fetch(url, {
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
    const fallback = mockResponseFor(endpoint);
    if (fallback !== null) {
      return fallback;
    }

    console.error(`Fetch failed for ${endpoint}:`, err);
    throw err;
  }
}

function listFromResponse(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const response = value as { items?: unknown; results?: unknown };
    if (Array.isArray(response.items)) return response.items;
    if (Array.isArray(response.results)) return response.results;
  }
  return [];
}

export const api = {
  // Expeditions
  getExpeditions: () => fetchFromAPI("/expeditions"),
  getExpedition: (id: string) => fetchFromAPI(`/expeditions/${id}`),

  // Assets
  getAssets: async (params?: { type?: string; expedition_id?: string; region?: string; year?: number }) => {
    const q = new URLSearchParams();
    if (params?.type) q.append("type", params.type);
    if (params?.expedition_id) q.append("expedition_id", params.expedition_id);
    if (params?.region) q.append("region", params.region);
    if (params?.year) q.append("year", params.year.toString());
    const response = await fetchFromAPI(`/assets?${q.toString()}`);
    return listFromResponse(response);
  },
  getAsset: (id: string) => fetchFromAPI(`/assets/${id}`),

  // Hybrid Search
  search: async (params: {
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
    const response = await fetchFromAPI(`/search?${q.toString()}`);
    return {
      ...response,
      results: listFromResponse(response),
      total: response?.total ?? listFromResponse(response).length,
    };
  },

  // Image search
  searchImages: async (query: string) => {
    const response = await fetchFromAPI(`/search/images?q=${encodeURIComponent(query)}`);
    return {
      ...response,
      results: listFromResponse(response),
      total: response?.total ?? listFromResponse(response).length,
    };
  },

  // Grounded Generation
  generateContent: async (payload: {
    asset_ids?: string[];
    expedition_id?: string;
    theme?: string;
    formats: string[];
    tone: string;
  }) => {
    const result = await fetchFromAPI("/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return Array.isArray(result) ? result : result ? [result] : [];
  },

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
      body: JSON.stringify({ action: action === "resubmit" ? "submit" : action, comment, scheduled_at }),
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
