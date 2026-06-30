import { supabase } from '../../../core/supabase.js';
import { type Result, success, failure } from '../../../shared/utils/result';
import { type Media, type MediaCompanies, type Company } from '../../../shared/types/index';
import { mapSupabaseMedia } from '../../../shared/utils/mediaData';
import { CacheService } from '../../../core/cache';
import { settings } from '../../../core/settings.svelte';
import { ListEngine } from '$wasm/hako_wasm';
import { wasmInitialized } from '../../../core/wasm-init';
import { get } from 'svelte/store';

let cachedAllMedia: { data: Media }[] | null = null;
let cachedEngine: ListEngine | null = null;

async function ensureWasmEngine(): Promise<{ allCached: { data: Media }[]; engine: ListEngine } | null> {
  if (cachedEngine && cachedAllMedia) {
    return { allCached: cachedAllMedia, engine: cachedEngine };
  }

  cachedAllMedia = await CacheService.getAllMedia();
  if (!cachedAllMedia || cachedAllMedia.length === 0) {
    return null;
  }

  const metadataMap: Record<string, any> = {};
  cachedAllMedia.forEach(m => {
    metadataMap[m.data.media_id.toString()] = m.data;
  });
  const mockItems = cachedAllMedia.map(m => ({
    media_id: m.data.media_id,
    status: 'cached',
  }));

  cachedEngine = new ListEngine(mockItems, metadataMap);
  return { allCached: cachedAllMedia, engine: cachedEngine };
}

export const MediaService = {
  /**
   * Searches for media by title (english, native, or romaji).
   * Returns up to `perTypeLimit` results per media type.
   * Uses WASM for fast local fuzzy matching on cached data,
   * and Supabase as a fallback for global results.
   */
  async searchMedia(query: string, perTypeLimit: number = 20): Promise<Result<Media[]>> {
    if (!query) return success([]);

    let wasmResults: Media[] = [];

    // 1. Try WASM Local Search first if initialized
    if (get(wasmInitialized)) {
      try {
        const ctx = await ensureWasmEngine();
        if (ctx) {
          const filteredIds: number[] = ctx.engine.filter_and_sort(
            query,
            "Title",
            "all",
            settings.titlePreference
          );

          const idSet = new Set(filteredIds);
          wasmResults = ctx.allCached
            .map(m => m.data)
            .filter((m): m is Media => m != null && idSet.has(m.media_id));
        }
      } catch (e) {
        console.warn("WASM search execution failed:", e);
      }
    }

    // 2. Query Supabase per type (trigram indexes make these fast)
    const SELECT = `*, genre_ids, tags (tag, rank)`;
    const filter = `title_english.ilike.%${query}%,title_native.ilike.%${query}%,title_romaji.ilike.%${query}%`;

    const [animeRes, mangaRes, lnRes] = await Promise.all([
      supabase.from('media').select(SELECT).or(filter).eq('media_type', 'anime').order('id', { ascending: true }).limit(perTypeLimit),
      supabase.from('media').select(SELECT).or(filter).eq('media_type', 'manga').order('id', { ascending: true }).limit(perTypeLimit),
      supabase.from('media').select(SELECT).or(filter).eq('media_type', 'light_novel').order('id', { ascending: true }).limit(perTypeLimit),
    ]);

    if (animeRes.error) return failure(animeRes.error.message);

    // 3. Merge: per-type Supabase results first, then WASM fuzzy matches
    const seenIds = new Set<number>();
    const mergedResults: Media[] = [];

    for (const r of [animeRes, mangaRes, lnRes]) {
      for (const m of (r.data ?? []).map(mapSupabaseMedia).filter((m): m is Media => m !== null)) {
        if (!seenIds.has(m.media_id)) {
          mergedResults.push(m);
          seenIds.add(m.media_id);
        }
      }
    }

    for (const res of wasmResults) {
      if (!seenIds.has(res.media_id)) {
        mergedResults.push(res);
        seenIds.add(res.media_id);
      }
    }

    return success(mergedResults);
  },

  /**
   * Fetches recently added media by type.
   */
  async getRecentlyAdded(type: string, limit: number = 5): Promise<Result<Media[]>> {
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .eq('media_type', type)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return failure(error.message);

    const media = (data || []).map(mapSupabaseMedia).filter((m): m is Media => m !== null);
    return success(media);
  },

  /**
   * Fetches relations for a given media ID.
   */
  async getMediaRelations(mediaId: number): Promise<Result<any[]>> {
    const { data, error } = await supabase
      .from('media_relations')
      .select(`
        relation_type,
        related_media:related_media_id (
          id,
          title_romaji,
          title_english,
          title_native,
          format,
          media_type
        )
      `)
      .eq('media_id', mediaId);

    if (error) return failure(error.message);
    return success(data || []);
  },

  async getMediaCompanies(mediaId: number): Promise<MediaCompanies> {
    const { data, error } = await supabase
      .from('media_companies')
      .select(`
        type,
        company:company_id (
          id,
          name
        )
      `)
      .eq('media_id', mediaId);

    if (error || !data) return { studios: [], producers: [] };

    const result: MediaCompanies = { studios: [], producers: [] };
    for (const row of data) {
      const c = row.company as unknown as Company;
      if (row.type === 'animation_studio') {
        result.studios.push(c);
      } else {
        result.producers.push(c);
      }
    }
    return result;
  },
};
