import { supabase } from '../utils/supabase.js';
import { type Result, success, failure } from '../utils/result';

export interface Profile {
  id: string;
  username: string;
  about_me?: string;
  avatar_url?: string;
  banner_url?: string;
  display_name?: string;
  bio?: string;
  role?: string;
  mediaLists: Record<string, any[]>;
}

async function fetchProfile(column: string, value: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq(column, value)
    .single();

  if (error || !data) return null;
  return { ...data, mediaLists: {} } as Profile;
}

export const ProfileService = {
  async getProfileByUsername(username: string): Promise<Result<Profile>> {
    if (!username || username === 'user') return failure('Placeholder username');

    const profile = await fetchProfile('username', username);
    if (!profile) return failure('User not found');

    return success(profile);
  },

  async getMediaLists(profileId: string): Promise<Record<string, any[]>> {
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

    return mediaLists;
  },

  async getProfileById(id: string): Promise<Result<Profile>> {
    const profile = await fetchProfile('id', id);
    return profile ? success(profile) : failure('Profile not found');
  }
};
