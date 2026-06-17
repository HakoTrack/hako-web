import { supabase } from '../../../core/supabase.js';
import { type Result, success, failure } from '../../../shared/utils/result';
import type { ForumCategory } from '../../../shared/types/index';

export const ForumCategoryService = {
  async getCategories(): Promise<Result<ForumCategory[]>> {
    const { data, error } = await supabase
      .from('forum_categories')
      .select(`
        id, name, slug, description, sort_order, created_at,
        thread_count:forum_threads(count)
      `)
      .order('sort_order', { ascending: true });

    if (error) return failure(error.message);

    const categories: ForumCategory[] = (data || []).map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      sortOrder: cat.sort_order,
      threadCount: cat.thread_count?.[0]?.count ?? 0,
    }));

    return success(categories);
  },

  async getCategoryBySlug(slug: string): Promise<Result<ForumCategory | null>> {
    const { data, error } = await supabase
      .from('forum_categories')
      .select('id, name, slug, description, sort_order')
      .eq('slug', slug)
      .single();

    if (error) return error.code === 'PGRST116' ? success(null) : failure(error.message);

    return success({
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      sortOrder: data.sort_order,
    });
  },
};
