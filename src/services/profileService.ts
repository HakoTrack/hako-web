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

    const { data, error } = await supabase
      .from('profile_list')
      .select('media_id, progress, score, status, media_type')
      .eq('profile_id', profile.id);

    if (error) {
      console.error("Error fetching media lists:", error);
      return failure('Failed to fetch media lists');
    }

    const listEntries = data as { media_id: number; progress: number; score: number; status: string; media_type: string }[];

    profile.mediaLists = listEntries.reduce((acc: Record<string, any[]>, entry) => {
      const type = entry.media_type || 'anime';
      if (!acc[type]) acc[type] = [];
      acc[type].push(entry);
      return acc;
    }, {});

    return success(profile);
  },

  async getProfileById(id: string): Promise<Result<Profile>> {
    const profile = await fetchProfile('id', id);
    return profile ? success(profile) : failure('Profile not found');
  }
};
