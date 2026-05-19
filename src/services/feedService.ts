import { supabase } from '../utils/supabase.js';
import { type Result, success, failure } from '../utils/result';
import { ActivityService } from './activityService';

export interface Author {
  username: string;
  avatar_url: string | null;
}

export interface PostMetadata {
  media_id?: number;
  title?: string;
  action?: string;
  progress?: number;
  total?: number | string;
}

export interface Post {
  id: string;
  author_id: string;
  target_profile_id: string;
  post_type: 'thought' | 'list_update';
  metadata: PostMetadata;
  content: string | null;
  created_at: string;
  author: Author;
  stats?: {
    likes: number;
    comments: number;
    shares: number;
  };
}

export const FeedService = {
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
    return success((data as Post[]) || []);
  },

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
    return success((data as Post[]) || []);
  },

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
  }
};
