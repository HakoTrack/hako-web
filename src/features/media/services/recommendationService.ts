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
    // Fetch extra candidates to allow room for cross-candidate dedup
    const { data, error } = await supabase.rpc('get_vibe_recommendations', {
      p_media_id: mediaId,
      p_limit: 40,
    });
    if (error) return failure(error.message);

    const recs: VibeRecommendation[] = (data || []).map((r: any) => ({
      media_id: r.media_id,
      similarity: r.similarity ?? 0,
    }));
    if (recs.length === 0) return success([]);

    // Fetch relations between recommended candidates so we can deduplicate
    // related pairs (e.g. sequels), keeping only the higher-ranked entry.
    const ids = recs.map(r => r.media_id);
    const idsList = ids.join(',');
    const { data: rawRelations } = await supabase
      .from('media_relations')
      .select('media_id, related_media_id, relation_type')
      .or(`media_id.in.(${idsList}),related_media_id.in.(${idsList})`);
    // Build adjacency graph and find connected components through the candidate set
    const candidateSet = new Set(ids);
    const adj = new Map<number, Set<number>>();
    for (const r of rawRelations ?? []) {
      if (r.relation_type === 'CHARACTER') continue;
      if (!candidateSet.has(r.media_id) || !candidateSet.has(r.related_media_id)) continue;
      if (!adj.has(r.media_id)) adj.set(r.media_id, new Set());
      if (!adj.has(r.related_media_id)) adj.set(r.related_media_id, new Set());
      adj.get(r.media_id)!.add(r.related_media_id);
      adj.get(r.related_media_id)!.add(r.media_id);
    }
    // Walk recs in rank order; for each, skip if already claimed by a component,
    // otherwise claim it and add all its transitive neighbors to the claimed set.
    const claimed = new Set<number>();
    const result: VibeRecommendation[] = [];
    for (const rec of recs) {
      if (claimed.has(rec.media_id)) continue;
      claimed.add(rec.media_id);
      result.push(rec);
      // Mark every node in this connected component as claimed
      const stack = [rec.media_id];
      while (stack.length > 0) {
        const id = stack.pop()!;
        for (const neighbor of adj.get(id) ?? []) {
          if (!claimed.has(neighbor)) {
            claimed.add(neighbor);
            stack.push(neighbor);
          }
        }
      }
      if (result.length >= 10) break;
    }

    return success(result);
  },
};
