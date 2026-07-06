export interface ExtrasCategory {
  folder: string;
  label: string;
  type: "strip" | "masonry";
  files?: string[];
  variants?: string[];
}

interface Manifest {
  categories: ExtrasCategory[];
}

const manifestCache = new Map<number, { data: ExtrasCategory[]; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000;

export async function getExtrasCategories(mediaId: number): Promise<ExtrasCategory[]> {
  const cached = manifestCache.get(mediaId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const BASE = location.hostname === 'localhost' ? "" : "https://assets.hako.moe";

  try {
    const res = await fetch(`${BASE}/extras/${mediaId}/manifest.json`);
    if (!res.ok) return [];

    const manifest: Manifest = await res.json();
    manifestCache.set(mediaId, { data: manifest.categories, ts: Date.now() });
    return manifest.categories;
  } catch {
    return [];
  }
}
