<script lang="ts">
  import { onMount } from "svelte";
  import StatsMetricCard from "./StatsMetricCard.svelte";
  import GenreCard from "./GenreCard.svelte";
  import SegmentedControl from "../../../shared/components/SegmentedControl.svelte";
  import Select from "../../../shared/components/Select.svelte";
  import { ProfileService } from "../services/profileService";
  import { MetadataService } from "../../../features/media/services/metadataService";
  import { calculateAllStats, type StatsResult } from "../services/statsCalc";
  import Chart from "chart.js/auto";

  let { profileData } = $props<{ profileData: { id: string } }>();

  let activeCategory = $state("anime-general");
  let stats: Record<string, StatsResult> | null = $state(null);
  let isLoading = $state(true);
  let chartCanvas: HTMLCanvasElement | null = $state(null);
  let scoreLineChart: any = $state(null);
  let activeChart: "titles" | "hours" | "scores" = $state("titles");
  let scoreMetric: "median" | "avg" = $state("median");
  let activeGenreSort: "completed" | "median" | "days" = $state("median");

  const categories = [
    {
      id: "anime",
      label: "Anime",
      subcategories: [
        { id: "anime-general", label: "General Stats" },
        { id: "anime-genres", label: "Genre Stats" },
      ],
    },
    {
      id: "manga",
      label: "Manga",
      subcategories: [{ id: "manga-general", label: "General Stats" }],
    },
    {
      id: "light_novel",
      label: "Light Novels",
      subcategories: [{ id: "ln-general", label: "General Stats" }],
    },
  ];

  onMount(async () => {
    if (!profileData?.id) {
      isLoading = false;
      return;
    }
    const listData = await ProfileService.getMediaLists(profileData.id);
    const allIds = Object.values(listData)
      .flat()
      .map((item) => item.media_id);
    const metadata = await MetadataService.getMetadata(allIds);
    stats = calculateAllStats(listData, metadata);
    isLoading = false;
  });

  const getAnimeMetrics = $derived.by(() => {
    if (!stats || !stats.anime) return [];
    const anime = stats.anime;
    return [
      {
        label: "Completed",
        value:
          anime.statusDistribution.find((s) => s.id === "completed")?.count ||
          0,
        icon: "fa-check",
        color: "var(--c2)",
      },
      {
        label: "Episodes",
        value: anime.totalProgress,
        icon: "fa-tv",
        color: "var(--c4)",
      },
      {
        label: "Days Watched",
        value: anime.metricValue,
        icon: "fa-clock",
        color: "var(--c3)",
      },
      {
        label: "Days Planned",
        value: anime.daysPlanned,
        icon: "fa-calendar",
        color: "var(--c8)",
      },
      {
        label: "Median Score",
        value: anime.medianScore,
        icon: "fa-star-half-stroke",
        color: "var(--c15)",
      },
      {
        label: "Avg Score",
        value: anime.avgScore,
        icon: "fa-star",
        color: "var(--c5)",
      },
    ];
  });

  // Chart Logic
  $effect(() => {
    if (chartCanvas && stats && stats.anime) {
      const yearData = stats.anime.yearStats;
      const sortedYears = Object.keys(yearData)
        .map(Number)
        .sort((a, b) => a - b);

      const labels = sortedYears;
      const data = sortedYears.map((y) => {
        if (activeChart === "titles") return yearData[y].count;
        if (activeChart === "hours") return yearData[y].minutes / 60;
        const arr = yearData[y].scores;
        if (arr.length === 0) return 0;
        if (scoreMetric === "median") {
          const sorted = [...arr].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 !== 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
        }
        return arr.reduce((a, b) => a + b, 0) / arr.length;
      });

      const getComputedColor = (varName: string) =>
        getComputedStyle(document.documentElement)
          .getPropertyValue(varName)
          .trim();
      const accent = getComputedColor("--hako-accent");
      const surfaceElevated = getComputedColor("--surface-elevated");
      const textColor = getComputedColor("--c8");

      if (scoreLineChart) {
        scoreLineChart.data.labels = labels;
        scoreLineChart.data.datasets[0].data = data;
        scoreLineChart.data.datasets[0].label = activeChart;
        scoreLineChart.data.datasets[0].borderColor = accent;
        scoreLineChart.data.datasets[0].backgroundColor = `${accent}22`;
        scoreLineChart.update();
      } else {
        scoreLineChart = new Chart(chartCanvas, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: activeChart,
                data,
                borderColor: accent,
                backgroundColor: `${accent}22`,
                fill: true,
                tension: 0.3,
                pointRadius: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: surfaceElevated },
                ticks: { color: textColor },
              },
              x: { grid: { display: false }, ticks: { color: textColor } },
            },
          },
        });
      }
    }
  });
</script>

<div class="flex gap-8">
  <aside class="w-56 shrink-0 space-y-6">
    <div
      class="sticky top-24 bg-card rounded-xl overflow-hidden border border-(--surface-elevated)"
    >
      {#each categories as category}
        <div class="border-b border-(--surface-elevated) last:border-0">
          <div
            class="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider bg-(--surface-dim)"
          >
            {category.label}
          </div>
          {#each category.subcategories as sub}
            <button
              onclick={() => (activeCategory = sub.id)}
              class="w-full text-left px-4 py-3 text-sm font-medium transition-colors outline-none focus:ring-0 {activeCategory ===
              sub.id
                ? 'text(--hako-fg) bg-(--surface-dim) border-l-4 border-(--hako-accent)'
                : 'text-slate-400 hover:text(--hako-fg) border-l-4 border-transparent hover:bg-card'}"
            >
              {sub.label}
            </button>
          {/each}
        </div>
      {/each}
    </div>
  </aside>

  <main class="flex-1 p-0 rounded-xl space-y-8">
    <h3 class="text(--hako-fg) font-bold flex items-center justify-between h-8">
      <div class="flex items-center">
        <i class="fa-solid fa-chart-line text-accent mr-2"></i>
        {activeCategory === "anime-general"
          ? "Anime: General Stats"
          : activeCategory === "anime-genres"
            ? "Anime: Genre Stats"
            : activeCategory.replace("-", " ")}
      </div>

      {#if activeCategory === "anime-genres"}
        <div class="flex gap-2">
          <div
            class="w-32"
            style:visibility={activeGenreSort === "median"
              ? "visible"
              : "hidden"}
          >
            <Select
              variant="compact"
              bind:value={scoreMetric}
              items={[
                { value: "median", label: "Median" },
                { value: "avg", label: "Average" },
              ]}
            />
          </div>
          <SegmentedControl
            bind:value={activeGenreSort}
            options={[
              { label: "Score", value: "median" },
              { label: "Completed", value: "completed" },
              { label: "Days Watched", value: "days" },
            ]}
          />
        </div>
      {/if}
    </h3>

    {#if isLoading}
      <p class="text-slate-400">Loading stats...</p>
    {:else if activeCategory === "anime-general" && stats}
      <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {#each getAnimeMetrics as metric}
          <StatsMetricCard {...metric} />
        {/each}
      </div>

      <!-- Score Distribution -->
      <div class="bg-card p-6 rounded-xl border border-(--surface-elevated)">
        <h4 class="text(--hako-fg) font-bold mb-6">Score Distribution</h4>
        <div class="flex items-end gap-2 h-40">
          {#each stats.anime.scoreDistribution.slice(1) as count, index}
            {@const score = index + 1}
            <div class="flex-1 flex flex-col items-center gap-2">
              <div class="w-full h-40 flex items-end">
                <div
                  class="relative w-full bg-(--hako-accent) rounded-t-lg group"
                  style="height: {stats.anime.total > 0
                    ? (count /
                        Math.max(
                          ...stats.anime.scoreDistribution.slice(1),
                          1,
                        )) *
                      100
                    : 0}%"
                >
                  <span
                    class="absolute -top-6 left-0 right-0 text-center text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >{count}</span
                  >
                </div>
              </div>
              <span class="text-[10px] font-bold text-slate-500">{score}</span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Year Chart -->
      <div class="bg-card p-6 rounded-xl border border-(--surface-elevated)">
        <div class="flex justify-between items-center mb-6">
          <h4 class="text(--hako-fg) font-bold">Anime by Release Year</h4>
          <div class="flex gap-2">
            <div
              class="w-32"
              style:visibility={activeChart === "scores" ? "visible" : "hidden"}
            >
              <Select
                variant="compact"
                bind:value={scoreMetric}
                items={[
                  { value: "median", label: "Median" },
                  { value: "avg", label: "Average" },
                ]}
              />
            </div>
            <SegmentedControl
              bind:value={activeChart}
              options={[
                { label: "Titles", value: "titles" },
                { label: "Hours", value: "hours" },
                { label: "Scores", value: "scores" },
              ]}
            />
          </div>
        </div>
        <div class="h-60 w-full overflow-x-auto">
          <div class="min-w-200 h-full">
            <canvas bind:this={chartCanvas}></canvas>
          </div>
        </div>
      </div>
    {:else if activeCategory === "anime-genres" && stats?.anime?.genreStats}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {#each Object.entries(stats.anime.genreStats).sort((a, b) => {
          const statsA = a[1];
          const statsB = b[1];
          const medianA = parseFloat(statsA.scores.length > 0 ? [...statsA.scores]
                    .sort((x, y) => x - y)
                    [Math.floor(statsA.scores.length / 2)].toFixed(1) : "0.0");
          const medianB = parseFloat(statsB.scores.length > 0 ? [...statsB.scores]
                    .sort((x, y) => x - y)
                    [Math.floor(statsB.scores.length / 2)].toFixed(1) : "0.0");
          const avgA = statsA.scores.length > 0 ? statsA.scores.reduce((sum, s) => sum + s, 0) / statsA.scores.length : 0;
          const avgB = statsB.scores.length > 0 ? statsB.scores.reduce((sum, s) => sum + s, 0) / statsB.scores.length : 0;

          if (activeGenreSort === "completed") return statsB.completed - statsA.completed;
          if (activeGenreSort === "median") return scoreMetric === "median" ? medianB - medianA : avgB - avgA;
          return statsB.totalMinutes - statsA.totalMinutes;
        }) as [genre, genreStat]}
          <GenreCard
            {genre}
            stats={genreStat}
            type="anime"
            activeMetric={scoreMetric}
          />
        {/each}
      </div>
    {:else}
      <p class="text-slate-400">Content for {activeCategory} coming soon...</p>
    {/if}
  </main>
</div>
