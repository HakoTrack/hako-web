import { supabase } from './supabase.js';
import type { Achievement, AchievementAwardResult } from '../shared/types';

const CODES: Record<string, string> = {
  anime: 'the_completionist_anime',
  manga: 'the_completionist_manga',
  light_novel: 'the_completionist_light_novel',
};

export const AchievementService = {
  async getAll(userId: string): Promise<Achievement[]> {
    const { data, error } = await supabase
      .rpc('get_user_achievements', { p_user_id: userId });

    if (error) {
      console.error('Error fetching achievements:', error);
      return [];
    }

    return (data || []) as Achievement[];
  },

  async checkAndAward(userId: string, code: string): Promise<AchievementAwardResult> {
    const { data, error } = await supabase
      .rpc('check_and_award_achievement', { p_user_id: userId, p_code: code });

    if (error) {
      console.error('Error checking achievement:', error);
      return { success: false, error: error.message };
    }

    return data as AchievementAwardResult;
  },

  async checkCompletedMilestones(userId: string, mediaType: string): Promise<AchievementAwardResult | null> {
    const code = CODES[mediaType];
    if (!code) return null;

    const result = await AchievementService.checkAndAward(userId, code);
    if (result.success) return result;
    return null;
  },
};
