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
 * Includes a basic JS fallback mechanism if Wasm is unavailable.
 */
export function calculateAllStats(
  mediaLists: Record<string, ListEntry[]>,
  metadata: Record<string, Media>
): Record<string, StatsResult> {
  const result: Record<string, StatsResult> = {};
  const types = ['anime', 'manga', 'light_novel'];

  try {
    for (const type of types) {
      const list = mediaLists[type] || [];
      const engine = new ListEngine(list, metadata);
      const statusGroups = getStatusGroups(type).map(g => ({ id: g.id, label: g.label, color: g.color }));
      result[type] = engine.calculate_stats(type, statusGroups);
    }
    return result;
  } catch (e) {
    console.warn("WASM_STATS_FALLBACK: Wasm engine unavailable, returning empty stats", e);

    // Return empty but valid structures to prevent UI crashes
    for (const type of types) {
      result[type] = createEmptyStats(type);
    }
    return result;
  }
}

function createEmptyStats(type: string): StatsResult {
  const statusGroups = getStatusGroups(type);
  return {
    total: 0,
    metricLabel: type === "anime" ? "Days Watched" : "Progress",
    metricValue: "0.0",
    medianScore: "0.0",
    avgScore: "0.0",
    totalProgress: 0,
    daysPlanned: "0.0",
    scoreDistribution: new Array(11).fill(0),
    statusDistribution: statusGroups.map(g => ({ ...g, count: 0, percent: 0 })),
    yearStats: {},
    genreStats: {}
  };
}
