import { supabase } from '../../../core/supabase.js';
import { type Result, success, failure } from '../../../shared/utils/result';
import { FORUM_CATEGORIES } from '../../../shared/utils/constants';
import type { ForumThread, Media } from '../../../shared/types/index';

function mapThread(t: any): ForumThread {
  const cat = Array.isArray(t.category) ? t.category[0] : t.category;
  const media = Array.isArray(t.media) ? t.media[0] : t.media;

  let subjectMedia: Media | undefined;
  if (media) {
    subjectMedia = {
      media_id: media.id,
      media_type: media.media_type,
      title: {
        romaji: media.title_romaji,
        english: media.title_english,
        native: media.title_native,
      },
      description: '',
      format: media.format,
      source: null,
      status: '',
      episodes: null,
      chapters: null,
      volumes: null,
      duration: null,
      season: null,
      seasonYear: media.season_year,
      genres: [],
      tags: [],
      startDate: { year: null, month: null, day: null },
      endDate: { year: null, month: null, day: null },
    };
  }

  return {
    id: t.id,
    title: t.title,
    categoryId: t.category_id,
    category: cat ? { id: cat.id, name: cat.name, slug: cat.slug, description: null, sortOrder: 0 } : undefined,
    authorId: t.author_id,
    author: t.author ?? { username: 'Unknown', avatar_url: null },
    subjectMediaId: t.media_id,
    subjectMedia,
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
  last_post_author:profiles!forum_threads_last_post_author_id_fkey(username, avatar_url),
  media:media!forum_threads_media_id_fkey(id, media_type, title_romaji, title_english, title_native, format, season_year)
`;

export const ForumThreadService = {
  async getThreadsByCategory(categorySlug: string, page: number = 0, pageSize: number = 20): Promise<Result<ForumThread[]>> {
    const from = page * pageSize;
    const to = (page + 1) * pageSize - 1;

    const cat = FORUM_CATEGORIES.find((c) => c.slug === categorySlug);
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

    return success(mapThread(data));
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
