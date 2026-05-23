import { supabase } from '../utils/supabase.js';
import { type Result, success, failure } from '../utils/result';
import { type Media } from '../types/index';
import { mapSupabaseMedia } from '../utils/mediaData';

export const MediaService = {
  /**
   * Searches for media by title (english, native, or romaji).
   */
  async searchMedia(query: string, limit: number = 5): Promise<Result<Media[]>> {
    if (!query) return success([]);

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

    const media = (data || []).map(mapSupabaseMedia).filter((m): m is Media => m !== null);
    return success(media);
  }
};
