import { supabase } from '../utils/supabase.js';

export const ProfileService = {
  async getProfileByUsername(username) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', username)
      .single();

    if (error || !profile) throw new Error('User not found');

    // Fetch user anime list entries
    const { data: animeList, error: animeError } = await supabase
      .from('profile_anime_list')
      .select('anime_id, progress, score, status')
      .eq('profile_id', profile.id);

    if (animeError) console.error("Error fetching anime list for stats:", animeError);

    profile.animeList = animeList || [];
    return profile;
  }
};
