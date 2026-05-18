import { supabase } from '../utils/supabase.js';

export const ProfileService = {
  async getProfileByUsername(username) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !profile) throw new Error('User not found');

    // Fetch user anime list entries from unified table
    const { data: animeList, error: animeError } = await supabase
      .from('profile_list')
      .select('media_id, progress, score, status')
      .eq('profile_id', profile.id)
      .eq('media_type', 'anime');

    if (animeError) console.error("Error fetching anime list for stats:", animeError);

    profile.animeList = animeList || [];
    return profile;
  },
  async getProfileById(id) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !profile) return null;
    return profile;
  }
};
