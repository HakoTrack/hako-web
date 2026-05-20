import type { ListEntry, Media } from '../types/index';

export interface StatsResult {
  total: number;
  metricLabel: string;
  metricValue: string;
  medianScore: string;
  statusDistribution: { id: string; label: string; color: string; count: number; percent: number }[];
}

export function calculateAllStats(
  mediaLists: Record<string, ListEntry[]>,
  metadata: Record<string, Media>
): Record<string, StatsResult> {
  const result: Record<string, StatsResult> = {};

  for (const [type, list] of Object.entries(mediaLists)) {
    result[type] = calculateStatsForType(list, metadata, type);
  }

  return result;
}

function calculateStatsForType(list: ListEntry[], metadata: Record<string, Media>, type: string): StatsResult {
  const total = list.length;
  let totalMinutes = 0;
  let totalChapters = 0;
  let totalVolumes = 0;
  const scores: number[] = [];

  const statusGroups = [
    { id: "current", label: type === "anime" ? "Watching" : "Reading", color: "bg-green-500" },
    { id: "completed", label: "Completed", color: "bg-sky-500" },
    { id: "paused", label: "Paused", color: "bg-orange-500" },
    { id: "dropped", label: "Dropped", color: "bg-red-500" },
    { id: "planning", label: "Planning", color: "bg-slate-500" },
  ];

  list.forEach((entry) => {
    const meta = metadata[entry.media_id.toString()];

    const duration = Number(meta?.duration || 0);
    const progress = Number(entry.progress || 0);

    if (type === "anime" && duration > 0 && progress > 0) {
      totalMinutes += progress * duration;
    } else if (type === "manga") {
      totalChapters += progress;
    } else if (type === "light_novel") {
      totalVolumes += progress;
    }

    if (entry.score && entry.score > 0) {
      scores.push(entry.score);
    }
  });

  const getMetric = () => {
    if (type === "anime") return { label: "Days Watched", value: (totalMinutes / 1440).toFixed(1) };
    if (type === "manga") return { label: "Chapters Read", value: totalChapters.toString() };
    if (type === "light_novel") return { label: "Volumes Read", value: totalVolumes.toString() };
    return { label: "Progress", value: "0" };
  };

  const metric = getMetric();

  const getMedian = (arr: number[]) => {
    if (arr.length === 0) return "0.0";
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid].toFixed(1)
      : ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1);
  };

  const statusDistribution = statusGroups.map((group) => {
    const count = list.filter((i) => (i.status || "").toLowerCase() === group.id).length;
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
    statusDistribution
  };
}
