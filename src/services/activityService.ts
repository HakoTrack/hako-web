import { supabase } from '../utils/supabase.js';
import { getLocalDateString } from '../utils/date.js';

interface ActivitySummary {
  activity_date: string;
  activity_count: number;
}

interface HeatmapDay {
  date: string;
  count: number;
}

const heatmapCache = new Map<string, HeatmapDay[]>();

/**
 * Service for tracking user activity for features like heatmaps.
 */
export const ActivityService = {
  /**
   * Tracks an activity event for a user.
   * @param {string} profileId
   * @param {string} [timestamp] - ISO timestamp string, defaults to now
   */
  async trackActivity(profileId: string, timestamp: string = new Date().toISOString()): Promise<void> {
    const { error } = await supabase.rpc('increment_activity', {
      target_profile_id: profileId,
      target_timestamp: timestamp
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
      .select('activity_date::date, activity_count')
      .eq('profile_id', profileId)
      .gte('activity_date::date', startDate)
      .lte('activity_date::date', endDate)
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
  async getHeatmapData(profileId: string, days: number = 167): Promise<HeatmapDay[]> {
    if (heatmapCache.has(profileId)) return heatmapCache.get(profileId)!;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const activityData = await this.getActivitySummary(
      profileId,
      getLocalDateString(startDate),
      getLocalDateString(endDate)
    );

    const activityMap = new Map<string, number>(activityData.map((a: ActivitySummary) => [a.activity_date, a.activity_count]));
    const result: HeatmapDay[] = [];

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(endDate.getDate() - i);
      const dateStr = getLocalDateString(date);
      result.push({
        date: dateStr,
        count: activityMap.get(dateStr) || 0
      });
    }

    heatmapCache.set(profileId, result);
    return result;
  }
};
