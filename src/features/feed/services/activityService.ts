import { supabase } from '../../../core/supabase.js';
import { getUTCDateString } from '../../../shared/utils/date.js';

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

    let allLogs: ActivityLog[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('created_at')
        .eq('profile_id', profileId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("Error fetching activity logs:", error);
        return { data: [], timezone };
      }

      if (data && data.length > 0) {
        allLogs = allLogs.concat(data);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          from += pageSize;
        }
      } else {
        hasMore = false;
      }
    }

    return { data: allLogs, timezone };
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
    // Fetch a slightly wider range to be safe for timezone conversions
    startDate.setUTCDate(endDate.getUTCDate() - (days + 7));

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
    const today = new Date();
    for (let i = days; i >= 0; i--) {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() - i);

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
