<script lang="ts">
  import MediaCover from "../../../shared/components/MediaCover.svelte";

  let { genre, stats, type, activeMetric } = $props<{
    genre: string;
    type: string;
    activeMetric: "median" | "avg";
    stats: {
      completed: number;
      totalMinutes: number;
      scores: number[];
      topTitles: { id: number; score: number }[];
    };
  }>();

  // Helper for median
  const median = $derived(() => {
    if (stats.scores.length === 0) return "0.0";
    const sorted = [...stats.scores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    // Use Number.prototype.toFixed(1) only at the very end
    return sorted.length % 2 !== 0
      ? sorted[mid].toFixed(1)
      : ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1);
  });

  // Helper for average
  const average = $derived(() => {
    if (stats.scores.length === 0) return "0.0";
    // Summing scores as numbers, then applying toFixed(1) for display
    const sum = stats.scores.reduce((a: number, b: number) => a + b, 0);
    return (sum / stats.scores.length).toFixed(1);
  });
</script>

<div
  class="bg-card p-6 rounded-xl border border-(--surface-elevated) space-y-4"
>
  <h4 class="text-(--hako-fg) font-bold text-lg">{genre}</h4>

  <div class="grid grid-cols-2 gap-4 text-sm">
    <div class="text-slate-400">Completed</div>
    <div class="text-(--hako-fg) font-bold text-right">{stats.completed}</div>
    <div class="text-slate-400">
      {activeMetric === "median" ? "Median" : "Average"} Score
    </div>
    <div class="text-(--hako-fg) font-bold text-right">
      {activeMetric === "median" ? median() : average()}
    </div>
    <div class="text-slate-400">Days Watched</div>
    <div class="text-(--hako-fg) font-bold text-right">
      {(stats.totalMinutes / 1440).toFixed(1)}
    </div>
  </div>

  <div class="pt-4 border-t border-(--surface-elevated)">
    <div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
      Top Titles
    </div>
    <div class="flex gap-2">
      {#each stats.topTitles as title}
        <MediaCover mediaId={title.id} {type} size="small" />
      {/each}
    </div>
  </div>
</div>
