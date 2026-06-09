import { supabase } from '../../../core/supabase.js';
import { type Result, success, failure } from '../../../shared/utils/result';
import { MetadataService } from '../../../features/media/services/metadataService';
import { ActivityOrchestrator } from '../../feed/services/activityOrchestrator';
import { CacheService } from '../../../core/cache';

interface ListConfig {
  table: string;
  idField: string;
}

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
    const cached = await CacheService.getList(cacheKey);

    try {
      // 1. Optimized deletion check (count check)
      const { count: serverCount, error: countError } = await supabase
        .from(config.table)
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .eq('media_type', type);

      if (countError) throw countError;

      if (cached && serverCount === cached.data.length) {
        // 2. Delta fetch (updates only)
        const { data: updates, error: deltaError } = await supabase
          .from(config.table)
          .select('media_id, score, progress, progress_volumes, status, updated_at, profile_id, started_at, completed_at')
          .eq('profile_id', profileId)
          .eq('media_type', type)
          .gt('updated_at', cached.lastSync);

        if (deltaError) throw deltaError;

        if (updates && updates.length > 0) {
          // Merge updates into cache
          const mergedData = [...cached.data];
          const updateMap = new Map(updates.map(u => [u.media_id, u]));

          const finalData = mergedData.map(item => updateMap.has(item.media_id) ? updateMap.get(item.media_id) : item);

          // Add new items if any (though count check should handle this, let's be safe)
          const existingIds = new Set(mergedData.map(i => i.media_id));
          updates.forEach(u => {
            if (!existingIds.has(u.media_id)) finalData.push(u);
          });

          const lastSync = new Date().toISOString();
          await CacheService.setList(cacheKey, finalData, lastSync);
          return success(finalData);
        }

        return success(cached.data);
      }

      // 3. Fallback: Full Fetch (if no cache or count mismatch)
      const { data, error } = await supabase
        .from(config.table)
        .select('media_id, score, progress, progress_volumes, status, updated_at, profile_id, started_at, completed_at')
        .eq('profile_id', profileId)
        .eq('media_type', type);

      if (error) return failure(error.message);

      const list = data || [];
      const lastSync = new Date().toISOString();
      await CacheService.setList(cacheKey, list, lastSync);
      return success(list);

    } catch (err: any) {
      console.error('List Sync Error:', err);
      // Fallback to cache if network fails
      if (cached) return success(cached.data);
      return failure(err.message || 'Unknown sync error');
    }
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

    await ActivityOrchestrator.handleListUpdate(
      profileId,
      { ...dbUpdates, total, media_id: mediaId, status: dbUpdates.status, metadata: oldEntry.metadata },
      oldEntry,
      type
    );

    // Invalidate local cache to force refresh
    await CacheService.deleteList(`${type}_${profileId}`);
    MetadataService.invalidate(mediaId);

    return success(undefined);
  },

  invalidateList(profileId: string, type: string): void {
    CacheService.deleteList(`${type}_${profileId}`);
  }
};
