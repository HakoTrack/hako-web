import { supabase } from '../utils/supabase.js';
import { type Result, success, failure } from '../utils/result';
import type { Profile } from '../types';

async function fetchProfile(column: string, value: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq(column, value)
    .single();

  if (error || !data) return null;
  return { ...data, mediaLists: {} } as Profile;
}

const mediaListsCache = new Map<string, Record<string, any[]>>();

export const ProfileService = {
  async getProfileByUsername(username: string): Promise<Result<Profile>> {
    if (!username || username === 'user') return failure('Placeholder username');

    const profile = await fetchProfile('username', username);
    if (!profile) return failure('User not found');

    return success(profile);
  },

  async getMediaLists(profileId: string): Promise<Record<string, any[]>> {
    if (mediaListsCache.has(profileId)) return mediaListsCache.get(profileId)!;

    const mediaTypes = ['anime', 'manga', 'light_novel'];
    const results = await Promise.all(
      mediaTypes.map(async (type) => {
        const { data, error } = await supabase
          .from('profile_list')
          .select('*')
          .eq('profile_id', profileId)
          .eq('media_type', type);

        return { type, data: error ? [] : data || [] };
      })
    );

    const mediaLists: Record<string, any[]> = {};
    results.forEach(({ type, data }) => {
      mediaLists[type] = data;
    });

    mediaListsCache.set(profileId, mediaLists);
    return mediaLists;
  },

  async getProfileById(id: string): Promise<Result<Profile>> {
    const profile = await fetchProfile('id', id);
    return profile ? success(profile) : failure('Profile not found');
  }
};
