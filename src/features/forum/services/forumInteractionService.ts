import { supabase } from '../../../core/supabase.js';
import { type Result, success, failure } from '../../../shared/utils/result';

export const ForumInteractionService = {
  async toggleLike(postId: number, userId: string): Promise<Result<number>> {
    const { data, error } = await supabase.rpc('toggle_forum_post_like', {
      p_post_id: postId,
      p_user_id: userId,
    });

    if (error) return failure(error.message);
    return success(data as number);
  },
};
