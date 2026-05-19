import { supabase } from '../utils/supabase.js';
import { type Result, success, failure } from '../utils/result';
import { ActivityService } from './activityService';
import { PostSchema, type Post, type PostMetadata } from '../types/index';

export const FeedService = {
  /**
   * Fetches posts for a specific profile.
   */
  async getPostsByProfile(profileId: string, page: number = 0, pageSize: number = 20): Promise<Result<Post[]>> {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey(username, avatar_url)
      `)
      .eq('target_profile_id', profileId)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) return failure(error.message);
    // Validate each post with Zod
    const result = PostSchema.array().safeParse(data?.map(post => ({
      ...post,
      metadata: post.metadata || {}
    })));
    if (!result.success) {
      console.error("DEBUG: Feed data validation failed:", result.error);
      return failure("Feed data validation failed");
    }
    return success(result.data);
  },

  /**
   * Fetches the global feed (all posts).
   */
  async getGlobalFeed(page: number = 0, pageSize: number = 20): Promise<Result<Post[]>> {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey(username, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) return failure(error.message);

    const result = PostSchema.array().safeParse(data?.map(post => ({
      ...post,
      metadata: post.metadata || {}
    })));
    if (!result.success) {
      console.error("DEBUG: Global feed validation failed:", result.error);
      return failure("Global feed validation failed");
    }

    return success(result.data);
  },

  /**
   * Fetches the circle feed (posts from followed users).
   */
  async getCircleFeed(followerId: string, page: number = 0, pageSize: number = 20): Promise<Result<Post[]>> {
    const { data: followed, error: followError } = await supabase
      .from('follows')
      .select('followed_id')
      .eq('follower_id', followerId);

    if (followError) return failure(followError.message);

    const followedIds: string[] = followed.map(f => f.followed_id);
    if (followedIds.length === 0) return success([]);

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey(username, avatar_url)
      `)
      .in('author_id', followedIds)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) return failure(error.message);

    const result = PostSchema.array().safeParse(data?.map(post => ({
      ...post,
      metadata: post.metadata || {}
    })));
    if (!result.success) return failure("Circle feed validation failed");

    return success(result.data);
  },

  /**
   * Creates a new post in the feed.
   */
  async createPost(userId: string, targetProfileId: string, type: 'thought' | 'list_update', metadata: PostMetadata = {}, content: string | null = null): Promise<Result<void>> {
    const { error } = await supabase.from('posts').insert({
      author_id: userId,
      target_profile_id: targetProfileId,
      post_type: type,
      metadata: metadata,
      content: content
    });

    if (error) return failure(error.message);

    try {
      await ActivityService.trackActivity(userId);
      return success(undefined);
    } catch (err: any) {
      return failure(err.message || 'Failed to track activity');
    }
  },

  async createListUpdatePost(userId: string, targetProfileId: string, entryId: number, title: string, progress: number, total: number | string, action: string = 'updated'): Promise<Result<void>> {
    return this.createPost(userId, targetProfileId, 'list_update', {
      media_id: entryId,
      title: title,
      action: action,
      progress: progress,
      total: total
    });
  },

  async createThoughtPost(userId: string, targetProfileId: string, content: string): Promise<void> {
    await this.createPost(userId, targetProfileId, 'thought', {}, content);
  }
};
