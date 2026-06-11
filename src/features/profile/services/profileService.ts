import { supabase } from '../../../core/supabase.js';
import { type Result, success, failure } from '../../../shared/utils/result';
import type { Profile } from '../../../shared/types';
import { ListService } from './listService';
import { CacheService } from '../../../core/cache';

async function fetchProfile(column: string, value: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, about_me, avatar_url, banner_url, join_date, quote, updated_at, user_roles(role)')
    .eq(column, value)
    .single();

  if (error || !data) return null;
  const profile = {
    ...data,
    role: (data.user_roles as any)?.[0]?.role || 'user',
    mediaLists: {}
  } as Profile;

  const lastSync = new Date().toISOString();
  await CacheService.setProfile(profile.id, profile, lastSync);
  await CacheService.setProfile(profile.username, profile, lastSync);

  return profile;
}

/**
 * Robust helper to fetch all profile list rows, handling Supabase's 1000-row limit.
 */
async function fetchAllProfileListRows(profileId: string, lastSync?: string) {
  let allData: any[] = [];
  let from = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    let query = supabase
      .from('profile_list')
      .select('media_id, score, progress, progress_volumes, status, updated_at, profile_id, started_at, completed_at, media_type')
      .eq('profile_id', profileId)
      .range(from, from + PAGE_SIZE - 1);

    if (lastSync) {
      query = query.gt('updated_at', lastSync);
    }

    const { data, error } = await query;
    if (error) throw error;

    allData = [...allData, ...(data || [])];

    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allData;
}

export const ProfileService = {
  async getProfileByUsername(username: string): Promise<Result<Profile>> {
    if (!username || username === 'user') return failure('Placeholder username');

    const cached = await CacheService.getProfile(username);

    try {
      if (cached) {
        const { data, error } = await supabase
          .from('profiles')
          .select('updated_at')
          .eq('username', username)
          .single();

        if (!error && data && data.updated_at === cached.data.updated_at) {
          return success(cached.data);
        }
      }

      const profile = await fetchProfile('username', username);
      if (!profile) return failure('User not found');
      return success(profile);
    } catch (e) {
      if (cached) return success(cached.data);
      return failure('Network error');
    }
  },

  async getMediaLists(profileId: string): Promise<Record<string, any[]>> {
    const cacheKey = `all_lists_${profileId}`;
    const cached = await CacheService.getList(cacheKey);

    try {
      // 1. Bulk Count Check
      const { count: serverCount, error: countError } = await supabase
        .from('profile_list')
        .select('media_id', { count: 'exact', head: true })
        .eq('profile_id', profileId);

      if (countError) throw countError;

      const mediaLists: Record<string, any[]> = {
        anime: [],
        manga: [],
        light_novel: [],
        visual_novels: []
      };

      if (cached && serverCount === cached.data.length) {
        // 2. Optimized "Latest Update" check (Tiny request)
        const { data: latestRow, error: latestError } = await supabase
          .from('profile_list')
          .select('updated_at')
          .eq('profile_id', profileId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        // If no rows changed or latest update matches cache, return cache instantly
        if (!latestError && latestRow && latestRow.updated_at <= cached.lastSync) {
          cached.data.forEach(item => {
            if (mediaLists[item.media_type]) mediaLists[item.media_type].push(item);
          });
          return mediaLists;
        }

        // 3. Delta fetch (only if latest check suggests a change)
        const updates = await fetchAllProfileListRows(profileId, cached.lastSync);

        if (updates && updates.length > 0) {
          const mergedData = [...cached.data];
          const updateMap = new Map(updates.map(u => [`${u.media_type}_${u.media_id}`, u]));

          const finalData = mergedData.map(item => {
            const key = `${item.media_type}_${item.media_id}`;
            return updateMap.has(key) ? updateMap.get(key) : item;
          });

          const existingKeys = new Set(mergedData.map(i => `${i.media_type}_${i.media_id}`));
          updates.forEach(u => {
            if (!existingKeys.has(`${u.media_type}_${u.media_id}`)) finalData.push(u);
          });

          await CacheService.setList(cacheKey, finalData, new Date().toISOString());

          finalData.forEach(item => {
            if (mediaLists[item.media_type]) mediaLists[item.media_type].push(item);
          });
          return mediaLists;
        }

        cached.data.forEach(item => {
          if (mediaLists[item.media_type]) mediaLists[item.media_type].push(item);
        });
        return mediaLists;
      }

      // 4. Fallback: Full Bulk Fetch
      const list = await fetchAllProfileListRows(profileId);
      await CacheService.setList(cacheKey, list, new Date().toISOString());

      list.forEach(item => {
        if (mediaLists[item.media_type]) mediaLists[item.media_type].push(item);
      });
      return mediaLists;

    } catch (err) {
      console.error('Profile Bulk Sync Error:', err);
      if (cached) {
        const mediaLists: Record<string, any[]> = { anime: [], manga: [], light_novel: [], visual_novels: [] };
        cached.data.forEach(item => {
          if (mediaLists[item.media_type]) mediaLists[item.media_type].push(item);
        });
        return mediaLists;
      }
      return {};
    }
  },

  async getProfileById(id: string): Promise<Result<Profile>> {
    const cached = await CacheService.getProfile(id);

    try {
      if (cached) {
        const { data, error } = await supabase
          .from('profiles')
          .select('updated_at')
          .eq('id', id)
          .single();

        if (!error && data && data.updated_at === cached.data.updated_at) {
          return success(cached.data);
        }
      }

      const profile = await fetchProfile('id', id);
      return profile ? success(profile) : failure('Profile not found');
    } catch (e) {
      if (cached) return success(cached.data);
      return failure('Network error');
    }
  }
};
