import { supabase } from '../../../core/supabase.js';
import { type Result, success, failure } from '../../../shared/utils/result';
import { MetadataService } from '../../../features/media/services/metadataService';
import { ActivityOrchestrator } from '../../feed/services/activityOrchestrator';

interface ListConfig {
  table: string;
  idField: string;
}

const listCache = new Map<string, any[]>();

const TYPE_CONFIG: Record<string, ListConfig> = {
  anime: { table: 'profile_list', idField: 'media_id' },
  manga: { table: 'profile_list', idField: 'media_id' },
  light_novel: { table: 'profile_list', idField: 'media_id' },
  visual_novels: { table: 'profile_list', idField: 'media_id' }
};

export const ListService = {
  async getList(profileId: string, type: string): Promise<Result<any[]>> {
    const config = TYPE_CONFIG[type];
    if (!config) return failure(`Unsupported media type: ${type}`);

    const cacheKey = `${type}_${profileId}`;
    if (listCache.has(cacheKey)) return success(listCache.get(cacheKey)!);

    const { data, error } = await supabase
      .from(config.table)
      .select(`*`)
      .eq('profile_id', profileId)
      .eq('media_type', type);

    if (error) return failure(error.message);

    const list = data || [];
    listCache.set(cacheKey, list);
    return success(list);
  },

  async updateListEntry(profileId: string, type: string, mediaId: number, updates: Record<string, any>, oldEntry: any | null = null): Promise<Result<void>> {
    const config = TYPE_CONFIG[type];
    if (!config) return failure(`Unsupported media type: ${type}`);

    const { total, ...dbUpdates } = updates;

    const { error } = await supabase
      .from(config.table)
      .upsert(
        {
          profile_id: profileId,
          media_id: mediaId,
          media_type: type,
          ...dbUpdates
        },
        { onConflict: 'profile_id, media_id, media_type' }
      );

    if (error) return failure(error.message);

    // Track activity and handle feed posts via orchestrator
    await ActivityOrchestrator.handleListUpdate(
      profileId,
      { ...dbUpdates, total, media_id: mediaId, status: dbUpdates.status }, // Simplified entry object
      oldEntry,
      type
    );

    listCache.delete(`${type}_${profileId}`);
    MetadataService.invalidate(mediaId);

    return success(undefined);
  },

  invalidateList(profileId: string, type: string): void {
    listCache.delete(`${type}_${profileId}`);
  }
};
