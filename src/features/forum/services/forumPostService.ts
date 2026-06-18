import { supabase } from '../../../core/supabase.js';
import { type Result, success, failure } from '../../../shared/utils/result';
import type { ForumPost } from '../../../shared/types/index';

export const ForumPostService = {
  async getPostsByThread(threadId: number, page: number = 0, pageSize: number = 20, userId?: string): Promise<Result<ForumPost[]>> {
    const from = page * pageSize;
    const to = (page + 1) * pageSize - 1;

    const { data, error } = await supabase
      .from('forum_posts')
      .select(`
        id, thread_id, author_id, content, created_at, updated_at,
        author:profiles!forum_posts_author_id_fkey(username, avatar_url, join_date, quote),
        likes_count:forum_post_likes(count)
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) return failure(error.message);

    let likedPostIds: Set<number> = new Set();
    if (userId && data && data.length > 0) {
      const postIds = data.map((p: any) => p.id);
      const { data: likes } = await supabase
        .from('forum_post_likes')
        .select('post_id')
        .in('post_id', postIds)
        .eq('user_id', userId);

      if (likes) {
        likedPostIds = new Set(likes.map((l: any) => l.post_id));
      }
    }

    const posts: ForumPost[] = (data || []).map((p: any) => ({
      id: p.id,
      threadId: p.thread_id,
      authorId: p.author_id,
      author: p.author ?? { username: 'Unknown', avatar_url: null, join_date: null, quote: null },
      content: p.content,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      likesCount: p.likes_count?.[0]?.count ?? 0,
      isLiked: likedPostIds.has(p.id),
    }));

    return success(posts);
  },

  async createPost(userId: string, threadId: number, content: string): Promise<Result<ForumPost>> {
    const { data, error } = await supabase
      .from('forum_posts')
      .insert({ thread_id: threadId, author_id: userId, content })
      .select(`
        id, thread_id, author_id, content, created_at, updated_at,
        author:profiles!forum_posts_author_id_fkey(username, avatar_url, join_date, quote)
      `)
      .single();

    if (error) return failure(error.message);

    await supabase.rpc('bump_thread', { p_thread_id: threadId, p_user_id: userId });
    await supabase.rpc('increment_thread_post_count', { p_thread_id: threadId });

    const author = Array.isArray(data.author) ? data.author[0] : data.author;

    return success({
      id: data.id,
      threadId: data.thread_id,
      authorId: data.author_id,
      author: author ?? { username: 'Unknown', avatar_url: null, join_date: null, quote: null },
      content: data.content,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      likesCount: 0,
      isLiked: false,
    });
  },

  async updatePost(postId: number, userId: string, content: string): Promise<Result<void>> {
    const { error } = await supabase
      .from('forum_posts')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', postId)
      .eq('author_id', userId);

    return error ? failure(error.message) : success(undefined);
  },
};
