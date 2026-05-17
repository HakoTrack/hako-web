import { supabase } from '../utils/supabase.js';
import { MetadataService } from './metadataService.js';

const listCache = new Map();

// All lists now use the unified 'profile_list' table
const TYPE_CONFIG = {
  anime: { table: 'profile_list', idField: 'media_id' },
  manga: { table: 'profile_list', idField: 'media_id' },
  light_novels: { table: 'profile_list', idField: 'media_id' },
  visual_novels: { table: 'profile_list', idField: 'media_id' }
};

export const ListService = {
  async getList(profileId, type) {
    const config = TYPE_CONFIG[type];
    if (!config) throw new Error(`Unsupported media type: ${type}`);

    const cacheKey = `${type}_${profileId}`;
    if (listCache.has(cacheKey)) return listCache.get(cacheKey);

    const { data, error } = await supabase
      .from(config.table)
      .select(`*`)
      .eq('profile_id', profileId)
      .eq('media_type', type);

    if (error) throw error;

    listCache.set(cacheKey, data);
    return data;
  },

  async updateListEntry(profileId, type, mediaId, updates) {
    const config = TYPE_CONFIG[type];
    if (!config) throw new Error(`Unsupported media type: ${type}`);

    const { error } = await supabase
      .from(config.table)
      .upsert(
        {
          profile_id: profileId,
          media_id: mediaId,
          media_type: type,
          ...updates
        },
        { onConflict: 'profile_id, media_id, media_type' }
      );

    if (error) throw error;

    // Invalidate caches
    listCache.delete(`${type}_${profileId}`);
    MetadataService.invalidate(mediaId);

    return { success: true };
  },

  invalidateList(profileId, type) {
    listCache.delete(`${type}_${profileId}`);
  }
};
