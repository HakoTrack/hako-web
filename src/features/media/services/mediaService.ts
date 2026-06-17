import { supabase } from '../../../core/supabase.js';
import { type Result, success, failure } from '../../../shared/utils/result';
import { type Media } from '../../../shared/types/index';
import { mapSupabaseMedia } from '../../../shared/utils/mediaData';
import { CacheService } from '../../../core/cache';
import { settings } from '../../../core/settings.svelte';
import { ListEngine } from '$wasm/hako_wasm';
import { wasmInitialized } from '../../../core/wasm-init';
import { get } from 'svelte/store';

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
        const allCached = await CacheService.getAllMedia();
        if (allCached.length > 0) {
          const mockItems = allCached.map(m => ({
            media_id: m.data.media_id,
            status: 'cached'
          }));

          const metadataMap: Record<string, any> = {};
          allCached.forEach(m => {
            const id = m.data.media_id;
            metadataMap[id] = m.data;
            metadataMap[id.toString()] = m.data;
          });

          const engine = new ListEngine(mockItems, metadataMap);
          const filtered = engine.filter_and_sort(
            query,
            "Title",
            "all",
            settings.titlePreference
          );

          wasmResults = (filtered as any[])
            .filter(item => item?.meta != null)
            .map(item => item.meta);
        }
      } catch (e) {
        console.warn("WASM search execution failed:", e);
      }
    }

    // 2. Query Supabase per type (trigram indexes make these fast)
    const SELECT = `*, genres (genre), tags (tag, rank)`;
    const filter = `title_english.ilike.%${query}%,title_native.ilike.%${query}%,title_romaji.ilike.%${query}%`;

    const [animeRes, mangaRes, lnRes] = await Promise.all([
      supabase.from('media').select(SELECT).or(filter).eq('media_type', 'anime').order('id', { ascending: true }).limit(perTypeLimit),
      supabase.from('media').select(SELECT).or(filter).eq('media_type', 'manga').order('id', { ascending: true }).limit(perTypeLimit),
      supabase.from('media').select(SELECT).or(filter).eq('media_type', 'light_novel').order('id', { ascending: true }).limit(perTypeLimit),
    ]);

    if (animeRes.error) return failure(animeRes.error.message);

    const mapResult = (r: typeof animeRes) =>
      (r.data || []).map(mapSupabaseMedia).filter((m): m is Media => m !== null);

    // 3. Merge: per-type Supabase results first, then WASM fuzzy matches
    const seenIds = new Set<number>();
    const mergedResults: Media[] = [];

    for (const batch of [mapResult(animeRes), mapResult(mangaRes), mapResult(lnRes)]) {
      for (const m of batch) {
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
          format
        )
      `)
      .eq('media_id', mediaId);

    if (error) return failure(error.message);
    return success(data || []);
  },
};
