import { supabase } from '../../../core/supabase.js';
import { type Result, success, failure } from '../../../shared/utils/result';
import { ActivityService } from './activityService';
import { PostSchema, type Post, type PostMetadata } from '../../../shared/types/index';

// Simple regex to block common URL shorteners (library not recommended for this as maintenance is high)
const SHORTENER_REGEX = /(bit\.ly|t\.co|tinyurl\.com|is\.gd|goo\.gl|ow\.ly|j\.mp|buff\.ly|adf\.ly|tny\.im)\//i;

export const FeedService = {
  /**
   * Fetches posts for a specific profile.
   */
  async getPostsByProfile(profileId: string, page: number = 0, pageSize: number = 20): Promise<Result<Post[]>> {
    const from = page * pageSize;
    const to = (page + 1) * pageSize - 1;
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, author_id, target_profile_id, post_type, metadata, content, created_at,
        author:profiles!posts_author_id_fkey(username, avatar_url),
        likes:post_likes(user_id),
        likes_count,
        comments_count,
        shares_count
      `)
      .eq('target_profile_id', profileId)
      .order('created_at', { ascending: false })
      .range(from, to);

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
    const from = page * pageSize;
    const to = (page + 1) * pageSize - 1;
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, author_id, target_profile_id, post_type, metadata, content, created_at,
        author:profiles!posts_author_id_fkey(username, avatar_url),
        likes:post_likes(user_id),
        likes_count,
        comments_count,
        shares_count
      `)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return failure(error.message);
    }

    const result = PostSchema.array().safeParse(data?.map(post => ({
      ...post,
      metadata: post.metadata || {}
    })));
    if (!result.success) {
      return failure("Global feed validation failed");
    }

    return success(result.data);
  },

  /**
   * Fetches the circle feed (posts from followed users).
   */
  async getCircleFeed(followerId: string, page: number = 0, pageSize: number = 20): Promise<Result<Post[]>> {
    const from = page * pageSize;
    const to = (page + 1) * pageSize - 1;
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
        id, author_id, target_profile_id, post_type, metadata, content, created_at,
        author:profiles!posts_author_id_fkey(username, avatar_url),
        likes:post_likes(user_id),
        likes_count,
        comments_count,
        shares_count
      `)
      .in('author_id', followedIds)
      .order('created_at', { ascending: false })
      .range(from, to);

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
    if (content && SHORTENER_REGEX.test(content)) {
      return failure("URL shorteners are not allowed in posts.");
    }

    const { error } = await supabase.from('posts').insert({
      author_id: userId,
      target_profile_id: targetProfileId,
      post_type: type,
      metadata: metadata,
      content: content
    });

    if (error) return failure(error.message);

    return success(undefined);
  },

  async createListUpdatePost(userId: string, targetProfileId: string, entryId: number, title: string, progress: number, total: number | string, mediaType: string, status: string = 'updated'): Promise<Result<void>> {
    return this.createPost(userId, targetProfileId, 'list_update', {
      media_id: entryId,
      media_type: mediaType,
      title: title,
      status: status,
      progress: progress,
      total: total
    });
  },

  async createThoughtPost(userId: string, targetProfileId: string, content: string): Promise<Result<void>> {
    return await this.createPost(userId, targetProfileId, 'thought', {}, content);
  }
};
