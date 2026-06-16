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
   * Uses WASM for fast local fuzzy matching on cached data,
   * and Supabase as a fallback for global results.
   */
  async searchMedia(query: string, limit: number = 20): Promise<Result<Media[]>> {
    if (!query) return success([]);

    let wasmResults: Media[] = [];

    // 1. Try WASM Local Search first if initialized
    if (get(wasmInitialized)) {
      try {
        const allCached = await CacheService.getAllMedia();
        if (allCached.length > 0) {
          // We treat cached media as a "list" for the WASM engine
          // The engine expects items (ListEntry) and metadata (Media)
          const mockItems = allCached.map(m => ({
            media_id: m.data.media_id,
            status: 'cached'
          }));

          const metadataMap: Record<string, any> = {};
          allCached.forEach(m => {
            metadataMap[m.data.media_id.toString()] = m.data;
          });

          const engine = new ListEngine(mockItems, metadataMap);
          const filtered = engine.filter_and_sort(
            query,
            "Title",
            "all",
            settings.titlePreference
          );

          // WASM returns ProcessedItem[] which contains 'meta'
          wasmResults = (filtered as any[]).map(item => item.meta);
        }
      } catch (e) {
        console.warn("WASM search execution failed:", e);
      }
    }
    // 2. Perform Supabase Global Search
    const { data, error } = await supabase
      .from('media')
      .select(`
        *,
        genres (genre),
        tags (tag, rank)
      `)
      .or(`title_english.ilike.%${query}%,title_native.ilike.%${query}%,title_romaji.ilike.%${query}%`)
      .limit(limit);

    if (error) return failure(error.message);

    const supabaseResults = (data || []).map(mapSupabaseMedia).filter((m): m is Media => m !== null);

    // 3. Merge Results (Prioritize WASM matches, then append new unique Supabase results)
    const seenIds = new Set(wasmResults.map(m => m.media_id));
    const mergedResults = [...wasmResults];

    for (const res of supabaseResults) {
      if (!seenIds.has(res.media_id)) {
        mergedResults.push(res);
        seenIds.add(res.media_id);
      }
    }

    return success(mergedResults.slice(0, limit));
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
