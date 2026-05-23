import { supabase } from '../utils/supabase.js';
import { type Result, success, failure } from '../utils/result';
import { type Comment, CommentSchema } from '../types/index';

export const CommentService = {
  /**
   * Fetches comments for a specific post.
   */
  async getComments(postId: string): Promise<Result<Comment[]>> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:profiles!comments_author_id_fkey(username, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) return failure(error.message);

    const result = CommentSchema.array().safeParse(data);
    if (!result.success) {
      console.error("DEBUG: Comment validation failed:", result.error);
      return failure("Comment validation failed");
    }

    return success(result.data);
  },

  /**
   * Creates a new comment and increments the post's comment count.
   */
  async createComment(postId: string, userId: string, content: string): Promise<Result<void>> {
    const { error: insertError } = await supabase.from('comments').insert({
      post_id: postId,
      author_id: userId,
      content: content
    });

    if (insertError) return failure(insertError.message);

    // Atomically increment the count via RPC
    const { error: rpcError } = await supabase.rpc('increment_comments', { row_id: postId });

    if (rpcError) {
      console.error("Failed to increment comments_count:", rpcError);
    }

    return success(undefined);
  }
};
