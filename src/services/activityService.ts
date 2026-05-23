import { supabase } from '../utils/supabase.js';
import { getUTCDateString } from '../utils/date.js';

interface ActivityLog {
  created_at: string;
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
   * Fetches raw activity logs for a profile within a date range.
   * @param {string} profileId
   * @param {string} startDate
   * @param {string} endDate
   */
  async getActivityLogs(profileId: string, startDate: string, endDate: string): Promise<{ data: ActivityLog[], timezone: string }> {
    const { data: profile } = await supabase.from('profiles').select('timezone').eq('id', profileId).single();
    const timezone = profile?.timezone || 'UTC';

    const { data, error } = await supabase
      .from('activity_logs')
      .select('created_at')
      .eq('profile_id', profileId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) {
      console.error("Error fetching activity logs:", error);
      return { data: [], timezone };
    }
    return { data: data || [], timezone };
  },

  /**
   * Fetches activity summary and fills missing dates for the heatmap using local time.
   * @param {string} profileId
   * @param {number} days
   */
  async getHeatmapData(profileId: string, days: number = 167): Promise<HeatmapDay[]> {
    // heatmapCache.clear(); // For testing
    // if (heatmapCache.has(profileId)) return heatmapCache.get(profileId)!;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setUTCDate(endDate.getUTCDate() - (days + 2));

    const { data: activityData, timezone } = await this.getActivityLogs(
      profileId,
      startDate.toISOString(),
      endDate.toISOString()
    );

    // Grouping activity using the user's local timezone
    const activityMap = new Map<string, number>();
    activityData.forEach((a: ActivityLog) => {
      // Parse the ISO timestamp and convert to user's timezone date string
      const date = new Date(a.created_at);

      const dateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);

      activityMap.set(dateStr, (activityMap.get(dateStr) || 0) + 1);
    });

    const result: HeatmapDay[] = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - i);

      const dateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);

      result.push({
        date: dateStr,
        count: activityMap.get(dateStr) || 0
      });
    }

    heatmapCache.set(profileId, result);
    return result;
  }
};
