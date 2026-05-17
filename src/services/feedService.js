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
        author:profiles!posts_author_id_fkey(username, avatar_url)
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
        author:profiles!posts_author_id_fkey(username, avatar_url)
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
        author:profiles!posts_author_id_fkey(username, avatar_url)
      `)
      .in('author_id', followedIds)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) throw error;
    return data || [];
  },

  /**
   * Creates a new post in the feed.
   */
  async createPost(userId, targetProfileId, type, metadata = {}, content = null) {
    const { error } = await supabase.from('posts').insert({
      author_id: userId,
      target_profile_id: targetProfileId,
      post_type: type,
      metadata: metadata,
      content: content
    });
    if (error) throw error;
  },

  async createListUpdatePost(userId, targetProfileId, entryId, title, progress, total, action = 'updated') {
    return this.createPost(userId, targetProfileId, 'list_update', {
      media_id: entryId,
      title: title,
      action: action,
      progress: progress,
      total: total
    });
  },

  async createThoughtPost(userId, targetProfileId, content) {
    return this.createPost(userId, targetProfileId, 'thought', {}, content);
  }
};
