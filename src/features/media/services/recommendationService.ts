import { supabase } from '../../../core/supabase.js';
import { type Result, success, failure } from '../../../shared/utils/result';

export interface MediaRecommendation {
  id: number;
  sourceMediaId: number;
  recommendedMediaId: number;
  score: number;
  userVote: number | null;
}

export interface VibeRecommendation {
  media_id: number;
  similarity: number;
}

export const RecommendationService = {
  async getRecommendations(mediaId: number, userId?: string | null): Promise<Result<MediaRecommendation[]>> {
    const { data, error } = await supabase.rpc('get_media_recommendations', {
      p_media_id: mediaId,
      p_user_id: userId || null,
    });

    if (error) return failure(error.message);
    return success((data || []).map((r: any) => ({
      id: r.id,
      sourceMediaId: r.source_media_id,
      recommendedMediaId: r.recommended_media_id,
      score: r.score ?? 0,
      userVote: r.user_vote ?? null,
    })));
  },

  async createRecommendation(sourceMediaId: number, recommendedMediaId: number, userId: string): Promise<Result<void>> {
    const { error } = await supabase
      .from('media_recommendations')
      .insert({ source_media_id: sourceMediaId, recommended_media_id: recommendedMediaId });

    if (error) return failure(error.message);
    return success(undefined);
  },

  async vote(recommendationId: number, userId: string, vote: 1 | -1): Promise<Result<void>> {
    const { error } = await supabase
      .from('media_recommendation_votes')
      .upsert(
        { user_id: userId, recommendation_id: recommendationId, vote },
        { onConflict: 'user_id, recommendation_id' },
      );

    if (error) return failure(error.message);
    return success(undefined);
  },

  async removeVote(recommendationId: number, userId: string): Promise<Result<void>> {
    const { error } = await supabase
      .from('media_recommendation_votes')
      .delete()
      .eq('user_id', userId)
      .eq('recommendation_id', recommendationId);

    if (error) return failure(error.message);
    return success(undefined);
  },

  async searchMedia(query: string): Promise<Result<{ id: number; title: string }[]>> {
    const { data, error } = await supabase
      .from('media')
      .select('id, title_romaji, title_english')
      .or(`title_romaji.ilike.%${query}%,title_english.ilike.%${query}%`)
      .limit(10);

    if (error) return failure(error.message);
    return success((data || []).map((m: any) => ({
      id: m.id,
      title: m.title_romaji || m.title_english,
    })));
  },

  async getVibeRecommendations(mediaId: number): Promise<Result<VibeRecommendation[]>> {
    const { data, error } = await supabase.rpc('get_vibe_recommendations', {
      p_media_id: mediaId,
    });
    if (error) return failure(error.message);
    return success((data || []).map((r: any) => ({
      media_id: r.media_id,
      similarity: r.similarity ?? 0,
    })));
  },
};
