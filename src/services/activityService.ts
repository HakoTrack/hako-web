import { supabase } from '../utils/supabase.js';

interface ActivitySummary {
  activity_date: string;
  activity_count: number;
}

interface HeatmapDay {
  date: string;
  count: number;
}

/**
 * Service for tracking user activity for features like heatmaps.
 */
export const ActivityService = {
  /**
   * Tracks an activity event for a user on a specific date.
   * @param {string} profileId
   * @param {string} [date] - ISO date string (YYYY-MM-DD), defaults to today
   */
  async trackActivity(profileId: string, date: string = new Date().toISOString().split('T')[0]): Promise<void> {
    const { error } = await supabase.rpc('increment_activity', {
      target_profile_id: profileId,
      target_date: date
    });

    if (error) {
      console.error("Error tracking activity:", error);
      throw error;
    }
  },

  /**
   * Fetches activity summary for a profile within a date range.
   * @param {string} profileId
   * @param {string} startDate
   * @param {string} endDate
   */
  async getActivitySummary(profileId: string, startDate: string, endDate: string): Promise<ActivitySummary[]> {
    const { data, error } = await supabase
      .from('activity_summary')
      .select('activity_date, activity_count')
      .eq('profile_id', profileId)
      .gte('activity_date', startDate)
      .lte('activity_date', endDate)
      .order('activity_date', { ascending: true });

    if (error) {
      console.error("Error fetching activity summary:", error);
      return [];
    }
    return data || [];
  },

  /**
   * Fetches activity summary and fills missing dates for the heatmap.
   * @param {string} profileId
   * @param {number} days
   */
  async getHeatmapData(profileId: string, days: number = 160): Promise<HeatmapDay[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const activityData = await this.getActivitySummary(
      profileId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    const activityMap = new Map<string, number>(activityData.map((a: ActivitySummary) => [a.activity_date, a.activity_count]));
    const result: HeatmapDay[] = [];

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(endDate.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        count: activityMap.get(dateStr) || 0
      });
    }
    return result;
  }
};
