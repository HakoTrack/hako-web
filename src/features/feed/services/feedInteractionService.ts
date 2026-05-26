import { supabase } from '../../../core/supabase.js';
import { type Result, success, failure } from '../../../shared/utils/result';

export const FeedInteractionService = {
  async toggleLike(userId: string, postId: string, isCurrentlyLiked: boolean): Promise<Result<number>> {
    if (isCurrentlyLiked) {
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (error) return failure(error.message);

      const { data, error: rpcError } = await supabase.rpc('decrement_like_count', { p_id: postId });
      console.log("DEBUG: RPC Decrement result:", { data, rpcError });
      return rpcError ? failure(rpcError.message) : success(data as number);
    } else {
      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: userId });

      if (error) return failure(error.message);

      const { data, error: rpcError } = await supabase.rpc('increment_like_count', { p_id: postId });
      console.log("DEBUG: RPC Increment result:", { data, rpcError });
      return rpcError ? failure(rpcError.message) : success(data as number);

    }
  },


  async addComment(userId: string, postId: string, content: string): Promise<Result<void>> {
    const { error } = await supabase
      .from('comments')
      .insert({ post_id: postId, author_id: userId, content });
    return error ? failure(error.message) : success(undefined);
  },

  async sharePost(userId: string, postId: string): Promise<Result<void>> {
    const { error } = await supabase
      .from('post_shares')
      .insert({ post_id: postId, user_id: userId });
    return error ? failure(error.message) : success(undefined);
  }
};
