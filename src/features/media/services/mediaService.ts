import { supabase } from '../../../core/supabase.js';
import { type Result, success, failure } from '../../../shared/utils/result';
import { type Media } from '../../../shared/types/index';
import { mapSupabaseMedia } from '../../../shared/utils/mediaData';

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
