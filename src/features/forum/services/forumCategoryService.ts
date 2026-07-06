import { supabase } from '../../../core/supabase.js';
import { type Result, success } from '../../../shared/utils/result';
import { FORUM_CATEGORIES } from '../../../shared/utils/constants';
import type { ForumCategory } from '../../../shared/types/index';

export const ForumCategoryService = {
  async getCategoryThreadCounts(): Promise<Result<ForumCategory[]>> {
    const { data, error } = await supabase
      .from('forum_threads')
      .select('category_id');

    if (error) {
      return success(FORUM_CATEGORIES.map((c) => ({
        id: c.id, name: c.name, slug: c.slug,
        description: c.description, sortOrder: c.sortOrder, threadCount: 0,
      })));
    }

    const counts: Record<number, number> = {};
    for (const row of data) {
      counts[row.category_id] = (counts[row.category_id] || 0) + 1;
    }

    return success(FORUM_CATEGORIES.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      sortOrder: c.sortOrder,
      threadCount: counts[c.id] || 0,
    })));
  },

  getCategoryBySlug(slug: string): ForumCategory | undefined {
    const c = FORUM_CATEGORIES.find((c) => c.slug === slug);
    if (!c) return undefined;
    return { id: c.id, name: c.name, slug: c.slug, description: c.description, sortOrder: c.sortOrder };
  },
};
