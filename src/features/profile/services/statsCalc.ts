import type { ListEntry, Media } from '../../../shared/types/index';
import { getStatusGroups } from '../../../shared/utils/constants';
import { ListEngine } from "$wasm/hako_wasm";

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

/**
 * Calculates high-performance statistics using the Rust Wasm engine.
 */
export function calculateAllStats(
  mediaLists: Record<string, ListEntry[]>,
  metadata: Record<string, Media>
): Record<string, StatsResult> {
  const result: Record<string, StatsResult> = {};
  const types = ['anime', 'manga', 'light_novel'];

  for (const type of types) {
    const list = mediaLists[type] || [];
    const engine = new ListEngine(list, metadata);
    const statusGroups = getStatusGroups(type).map(g => ({ id: g.id, label: g.label, color: g.color }));
    result[type] = engine.calculate_stats(type, statusGroups);
  }
  return result;
}
