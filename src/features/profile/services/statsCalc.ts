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
  statusDistribution: { id: string; label: string; count: number; percent: number }[];
  yearStats: Record<number, { count: number; minutes: number; scores: number[] }>;
  genreStats: Record<string, { completed: number; totalMinutes: number; scores: number[]; topTitles: { id: number; score: number }[] }>;
}

export function calculateAllStats(
  mediaLists: Record<string, ListEntry[]>,
  metadata: Record<string, Media>
): Record<string, StatsResult> {
  const result: Record<string, StatsResult> = {};
  const types = ['anime', 'manga', 'light_novel'];

  try {
    // Try Wasm first
    for (const type of types) {
      const list = mediaLists[type] || [];
      const engine = new ListEngine(list, metadata);
      const statusGroups = getStatusGroups(type).map(g => ({ id: g.id, label: g.label, color: g.color }));
      result[type] = engine.calculate_stats(type, statusGroups);
    }
    return result;
  } catch (e) {

    console.warn("Wasm stats calculation failed or not initialized, falling back to JS", e);
    for (const type of types) {
      const list = mediaLists[type] || [];
      result[type] = calculateStatsForTypeJS(list, metadata, type);
    }
    return result;
  }
}

function calculateStatsForTypeJS(list: ListEntry[], metadata: Record<string, Media>, type: string): StatsResult {
  const total = list.length;
  let totalMinutes = 0;
  let totalMinutesPlanned = 0;
  let totalProgress = 0;
  let totalScore = 0;
  let scoresCount = 0;
  const scores: number[] = [];
  const scoreDistribution = new Array(11).fill(0);
  const yearStats: Record<number, { count: number; minutes: number; scores: number[] }> = {};
  const genreStats: Record<string, { completed: number; totalMinutes: number; scores: number[]; topTitles: { id: number; score: number }[] }> = {};

  const statusGroups = getStatusGroups(type);

  const counts: Record<string, number> = {};
  list.forEach((entry) => {
    const status = (entry.status || "").toLowerCase();
    counts[status] = (counts[status] || 0) + 1;

    const meta = metadata[entry.media_id.toString()];
    const year = meta?.startDate?.year || 0;
    const duration = Number(meta?.duration || 0);
    const progress = Number(entry.progress || 0);
    const episodes = Number(meta?.episodes || 0);
    const genres = meta?.genres || [];

    if (year > 0) {
      if (!yearStats[year]) yearStats[year] = { count: 0, minutes: 0, scores: [] };
      yearStats[year].count++;
    }

    // Genre Stats Aggregation
    genres.forEach(genre => {
      if (!genreStats[genre]) genreStats[genre] = { completed: 0, totalMinutes: 0, scores: [], topTitles: [] };
      if (status === 'completed') genreStats[genre].completed++;
      if (entry.score && entry.score > 0) {
        genreStats[genre].scores.push(entry.score);
        genreStats[genre].topTitles.push({ id: entry.media_id, score: entry.score });
      }
      if (duration > 0 && progress > 0) {
        genreStats[genre].totalMinutes += progress * duration;
      }
    });

    totalProgress += progress;

    if (type === "anime") {
      if (status === 'planning' && episodes > 0 && duration > 0) {
        totalMinutesPlanned += (episodes * duration);
      }
      if (duration > 0 && progress > 0) {
        totalMinutes += progress * duration;
        if (year > 0) yearStats[year].minutes += progress * duration;
      }
    }

    if (entry.score && entry.score > 0) {
      totalScore += entry.score;
      scoresCount++;
      scores.push(entry.score);
      if (year > 0) yearStats[year].scores.push(entry.score);

      const bin = Math.min(10, Math.floor(entry.score));
      scoreDistribution[bin]++;
    }
  });

  const getMedian = (arr: number[]) => {
    if (arr.length === 0) return "0.0";
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid].toFixed(1)
      : ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1);
  };

  // Finalize genre stats
  for (const genre in genreStats) {
    genreStats[genre].topTitles.sort((a, b) => b.score - a.score);
    genreStats[genre].topTitles = genreStats[genre].topTitles.slice(0, 4);
    // We can add a medianScore field here if needed later
  }

  const getMetric = () => {
    if (type === "anime") return { label: "Days Watched", value: (totalMinutes / 1440).toFixed(1) };
    if (type === "manga") return { label: "Chapters Read", value: totalProgress.toString() };
    if (type === "light_novel") return { label: "Volumes Read", value: totalProgress.toString() };
    return { label: "Progress", value: "0" };
  };

  const metric = getMetric();

  const statusDistribution = statusGroups.map((group) => {
    const count = counts[group.id] || 0;
    return {
      ...group,
      count,
      percent: total > 0 ? (count / total) * 100 : 0,
    };
  });

  return {
    total,
    metricLabel: metric.label,
    metricValue: metric.value,
    medianScore: getMedian(scores),
    avgScore: scoresCount > 0 ? (totalScore / scoresCount).toFixed(1) : "0.0",
    totalProgress,
    daysPlanned: (totalMinutesPlanned / 1440).toFixed(1),
    scoreDistribution,
    statusDistribution,
    yearStats,
    genreStats
  };
}
