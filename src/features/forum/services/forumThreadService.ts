import { supabase } from '../../../core/supabase.js';
import { type Result, success, failure } from '../../../shared/utils/result';
import { mapSupabaseMedia } from '../../../shared/utils/mediaData';
import type { ForumThread, Media } from '../../../shared/types/index';

async function fetchSubjectMedia(mediaId: number | null | undefined): Promise<Media | null | undefined> {
  if (!mediaId) return undefined;
  const { data } = await supabase
    .from('media')
    .select('*')
    .eq('id', mediaId)
    .single();
  return data ? mapSupabaseMedia(data) : undefined;
}

function mapThread(t: any, subjectMedia?: Media | null): ForumThread {
  const cat = Array.isArray(t.category) ? t.category[0] : t.category;

  return {
    id: t.id,
    title: t.title,
    categoryId: t.category_id,
    category: cat ? { id: cat.id, name: cat.name, slug: cat.slug, description: null, sortOrder: 0 } : undefined,
    authorId: t.author_id,
    author: t.author ?? { username: 'Unknown', avatar_url: null },
    subjectMediaId: t.media_id,
    subjectMedia: subjectMedia ?? undefined,
    isPinned: t.is_pinned,
    isLocked: t.is_locked,
    postCount: t.post_count,
    viewCount: t.view_count,
    lastPostAt: t.last_post_at,
    lastPostAuthor: t.last_post_author ?? null,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

const THREAD_SELECT = `
  id, title, category_id, author_id, media_id, is_pinned, is_locked,
  post_count, view_count, last_post_at, created_at, updated_at,
  category:forum_categories!forum_threads_category_id_fkey(id, name, slug),
  author:profiles!forum_threads_author_id_fkey(username, avatar_url),
  last_post_author:profiles!forum_threads_last_post_author_id_fkey(username, avatar_url)
`;

export const ForumThreadService = {
  async getThreadsByCategory(categorySlug: string, page: number = 0, pageSize: number = 20): Promise<Result<ForumThread[]>> {
    const from = page * pageSize;
    const to = (page + 1) * pageSize - 1;

    const { data: cat } = await supabase
      .from('forum_categories')
      .select('id')
      .eq('slug', categorySlug)
      .single();

    if (!cat) return failure('Category not found');

    const { data, error } = await supabase
      .from('forum_threads')
      .select(THREAD_SELECT)
      .eq('category_id', cat.id)
      .order('is_pinned', { ascending: false })
      .order('last_post_at', { ascending: false, nullsFirst: false })
      .range(from, to);

    if (error) return failure(error.message);

    return success((data || []).map((t: any) => mapThread(t)));
  },

  async getThreadById(id: number): Promise<Result<ForumThread | null>> {
    const { data, error } = await supabase
      .from('forum_threads')
      .select(THREAD_SELECT)
      .eq('id', id)
      .single();

    if (error) return error.code === 'PGRST116' ? success(null) : failure(error.message);

    const subjectMedia = await fetchSubjectMedia(data.media_id);

    return success(mapThread(data, subjectMedia));
  },

  async getRecentThreads(limit: number = 10): Promise<Result<ForumThread[]>> {
    const { data, error } = await supabase
      .from('forum_threads')
      .select(THREAD_SELECT)
      .order('last_post_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) return failure(error.message);

    return success((data || []).map((t: any) => mapThread(t)));
  },

  async createThread(userId: string, categoryId: number, title: string, content: string, mediaId?: number | null): Promise<Result<number>> {
    const { data: thread, error: threadError } = await supabase
      .from('forum_threads')
      .insert({ title, category_id: categoryId, author_id: userId, media_id: mediaId || null })
      .select('id')
      .single();

    if (threadError) return failure(threadError.message);

    const { error: postError } = await supabase
      .from('forum_posts')
      .insert({ thread_id: thread.id, author_id: userId, content });

    if (postError) return failure(postError.message);

    const { error: bumpError } = await supabase.rpc('bump_thread', { p_thread_id: thread.id, p_user_id: userId });
    if (bumpError) console.error('Failed to bump thread:', bumpError);

    const { error: countError } = await supabase.rpc('increment_thread_post_count', { p_thread_id: thread.id });
    if (countError) console.error('Failed to increment count:', countError);

    return success(thread.id);
  },

  async incrementViewCount(threadId: number): Promise<void> {
    await supabase.rpc('increment_thread_view_count', { p_thread_id: threadId });
  },
};
