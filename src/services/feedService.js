import { supabase } from '../utils/supabase.js';

export const FeedService = {
  /**
   * Fetches posts for a specific profile.
   */
  async getPostsByProfile(profileId, page = 0, pageSize = 20) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles(username, avatar_url)
      `)
      .eq('target_profile_id', profileId)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;
    return data || [];
  },

  /**
   * Fetches the global feed (all posts).
   */
  async getGlobalFeed(page = 0, pageSize = 20) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles(username, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;
    return data || [];
  },

  /**
   * Fetches the circle feed (posts from followed users).
   */
  async getCircleFeed(followerId, page = 0, pageSize = 20) {
    // 1. Get IDs of followed users
    const { data: followed, error: followError } = await supabase
      .from('follows')
      .select('followed_id')
      .eq('follower_id', followerId);

    if (followError) throw followError;

    const followedIds = followed.map(f => f.followed_id);

    if (followedIds.length === 0) return [];

    // 2. Fetch posts from those users
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles(username, avatar_url)
      `)
      .in('author_id', followedIds)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;
    return data || [];
  }
};
