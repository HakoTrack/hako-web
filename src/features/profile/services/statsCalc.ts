import type { ListEntry, Media } from '../../../shared/types/index';
import { getStatusGroups } from '../../../shared/utils/constants';
import { calculate_all_profile_data_wasm } from "$wasm/hako_wasm";

export interface StatsResult {
  total: number;
  metricLabel: string;
  metricValue: string;
  medianScore: string;
  avgScore: string;
  totalProgress: number;
  daysPlanned: string;
  scoreDistribution: number[];
  statusDistribution: { id: string; label: string; color: string; count: number; percent: number }[];
  yearStats: Record<number, { count: number; minutes: number; scores: number[] }>;
  genreStats: Record<string, { completed: number; totalMinutes: number; scores: number[]; topTitles: { id: number; score: number }[] }>;
}

export interface ProfileDataResults {
  stats: Record<string, StatsResult>;
  affinities: Record<string, any[]>;
}

/**
 * Calculates high-performance statistics and affinities using the Rust Wasm engine.
 * Optimized to perform all calculations in a single pass over the metadata.
 */
export function calculateAllStats(
  mediaLists: Record<string, ListEntry[]>,
  metadata: Record<string, Media>
): ProfileDataResults {
  const statusGroups: Record<string, any[]> = {};
  const types = ['anime', 'manga', 'light_novel'];

  for (const type of types) {
    statusGroups[type] = getStatusGroups(type).map(g => ({
      id: g.id,
      label: g.label,
      color: g.color
    }));
  }

  try {
    const result = calculate_all_profile_data_wasm(mediaLists, metadata, statusGroups);
    return result as ProfileDataResults;
  } catch (e) {
    console.error("WASM Profile Calculation Error:", e);
    return { stats: {}, affinities: {} };
  }
}
