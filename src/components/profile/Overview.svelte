<script lang="ts">
  import FavoritesGrid from "../FavoritesGrid.svelte";
  import FeedWrapper from "../feed/FeedWrapper.svelte";
  import Tooltip from "../common/Tooltip.svelte";
  import { ActivityService } from "../../services/activityService";
  import { getProfileAffinity } from "../../utils/vibeCalc";
  import Chart from "chart.js/auto";
  import { calculateAllStats, type StatsResult } from "../../utils/statsCalc";
  import type { Profile } from "../../services/profileService";
  import type { Media, ListEntry } from "../../types/index";

  let { profileData, metadata } = $props<{
    profileData: Profile | null;
    metadata: Record<string, Media>;
  }>();
  let heatmapData = $state(Array(168).fill({ date: "", count: 0 }));
  let totalActivityCount = $derived(
    heatmapData.reduce((sum, day) => sum + day.count, 0),
  );
  let radarChart: any = $state(null);
  let chartCanvas: any = $state(null);
  let hasInitializedChart = $state(false);
  let persistedStats: Record<string, StatsResult> = $state({});

  // Custom Tooltip State
  let tooltip = $state<{
    opacity: number;
    top: number;
    left: number;
    datasetLabel: string;
    label: string;
    value: number;
    color: string;
  } | null>(null);

  const VIBE_ICONS: Record<string, string> = {
    Speculative: "fa-ghost",
    Visceral: "fa-bolt",
    Cerebral: "fa-brain",
    Emotive: "fa-heart-pulse",
    Interpersonal: "fa-users",
    Lighthearted: "fa-face-smile",
  };

  const VIBE_LABELS: Record<string, string> = {
    Speculative: "\uf6e2",
    Visceral: "\uf0e7",
    Cerebral: "\uf5dc",
    Emotive: "\uf21e",
    Interpersonal: "\uf0c0",
    Lighthearted: "\uf118",
  };

  const VIBE_LABELS_TO_ICONS: Record<string, string> = {
    "\uf6e2": "fa-ghost",
    "\uf0e7": "fa-bolt",
    "\uf5dc": "fa-brain",
    "\uf21e": "fa-heart-pulse",
    "\uf0c0": "fa-users",
    "\uf118": "fa-face-smile",
  };

  const VIBE_LABELS_TO_NAMES: Record<string, string> = {
    "\uf6e2": "Speculative",
    "\uf0e7": "Visceral",
    "\uf5dc": "Cerebral",
    "\uf21e": "Emotive",
    "\uf0c0": "Interpersonal",
    "\uf118": "Lighthearted",
  };

  // Stats calculation
  let allStats: Record<string, StatsResult> = $derived(
    calculateAllStats(profileData?.mediaLists || {}, metadata),
  );

  $effect(() => {
    if (Object.keys(allStats).length > 0) {
      persistedStats = allStats;
    }
  });

  const statusColors: Record<string, string> = {
    current: "var(--c2)",
    completed: "var(--c12)",
    paused: "var(--c3)",
    dropped: "var(--c1)",
    planning: "var(--c8)",
  };

  $effect(() => {
    if (
      Object.keys(metadata).length > 0 &&
      chartCanvas &&
      profileData?.mediaLists &&
      !hasInitializedChart
    ) {
      hasInitializedChart = true;
      // Helper to get computed CSS color
      const getComputedColor = (varName: string) => {
        return getComputedStyle(document.documentElement)
          .getPropertyValue(varName)
          .trim();
      };

      const COLORS: Record<string, string> = {
        anime: getComputedColor("--c4"),
        manga: getComputedColor("--c1"),
        light_novel: getComputedColor("--c10"),
        visual_novels: getComputedColor("--c5"),
      };

      const datasets = Object.keys(profileData.mediaLists)
        .filter((type) => type !== "visual_novels") // Placeholder for VN
        .map((type) => {
          const activeEntries = (
            profileData!.mediaLists[type] as ListEntry[]
          ).filter((entry) =>
            ["completed", "current", "dropped"].includes(
              entry.status?.toLowerCase() || "",
            ),
          );

          if (activeEntries.length === 0) return null;

          const affinities = getProfileAffinity(activeEntries, metadata);
          const color = COLORS[type] || "#ffffff";

          return {
            label: type.replace("_", " "),
            data: affinities.map((a) => a.value),
            backgroundColor: color + "33",
            borderColor: color,
            pointBackgroundColor: color,
            pointRadius: 0,
            borderWidth: 1,
          };
        })
        .filter((d) => d !== null);

      if (radarChart) {
        radarChart.data.datasets = datasets as any[];
        radarChart.update();
      } else {
        radarChart = new Chart(chartCanvas, {
          type: "radar",
          data: {
            labels: Object.values(VIBE_LABELS),
            datasets: datasets as any[],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            events: ["mousemove", "mouseout", "touchstart", "touchmove"],
            interaction: {
              mode: "nearest",
              intersect: true,
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                enabled: false,
                external: (context: any) => {
                  const { chart, tooltip: tooltipModel } = context;
                  if (
                    tooltipModel.opacity === 0 ||
                    !tooltipModel.dataPoints?.length
                  ) {
                    tooltip = null;
                    return;
                  }
                  const closestPoint = tooltipModel.dataPoints[0];
                  const position = chart.canvas.getBoundingClientRect();
                  tooltip = {
                    opacity: 1,
                    top: position.top + closestPoint.element.y,
                    left: position.left + closestPoint.element.x,
                    datasetLabel: closestPoint.dataset.label,
                    label: closestPoint.label,
                    value: closestPoint.raw,
                    color: closestPoint.dataset.borderColor,
                  };
                },
              },
            },
            elements: {
              point: {
                radius: 4,
                hitRadius: 25,
              },
            },
            scales: {
              r: {
                min: 0,
                max: 100,
                beginAtZero: true,
                angleLines: { color: "#2b2d42" },
                grid: { color: "#2b2d42" },
                pointLabels: {
                  font: {
                    family: "'Font Awesome 6 Free', sans-serif",
                    size: 16,
                    weight: 900,
                  },
                  color: "#9fadbd",
                  padding: 10,
                },
                ticks: { display: false, stepSize: 20 },
              },
            },
          },
        });
      }
    }
  });

  $effect(() => {
    if (profileData?.id) {
      ActivityService.getHeatmapData(profileData.id, 167).then((data) => {
        heatmapData = data;
      });
    }
  });
</script>

<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
  <!-- LEFT COLUMN: Sidebar (About Me + Favorites) -->
  <div class="lg:col-span-4 space-y-8">
    <div class="bg-card p-6 rounded-xl shadow-md">
      <h3 class="text-white font-bold mb-4 flex items-center">
        <i class="fa-solid fa-user-tag text-accent mr-2"></i> About Me
      </h3>
      <p class="text-sm leading-relaxed text-slate-400 mb-4">
        {profileData?.about_me || "No description provided."}
      </p>
      <div
        class="space-y-3 pt-4 border-t border-(--surface-elevated) text-xs uppercase tracking-wider font-semibold text-slate-500"
      >
        <div class="flex justify-between">
          <span>Joined</span><span class="text-white">May 13th, 2026</span>
        </div>
        <div class="flex justify-between">
          <span>Location</span><span class="text-white">Tokyo, JP</span>
        </div>
        <div class="flex justify-between">
          <span>Favorite Studio</span><span class="text-white"
            >Kyoto Animation</span
          >
        </div>
      </div>
      <div
        class="mt-6 pt-6 border-t border-(--surface-elevated) flex justify-between items-center px-2"
      >
        <div class="text-center">
          <div class="text-lg font-bold text-white">142</div>
          <div
            class="text-[10px] uppercase text-slate-500 font-bold tracking-tighter"
          >
            Followers
          </div>
        </div>
        <div class="h-8 w-px bg-(--surface-elevated)"></div>
        <div class="text-center">
          <div class="text-lg font-bold text-white">89</div>
          <div
            class="text-[10px] uppercase text-slate-500 font-bold tracking-tighter"
          >
            Following
          </div>
        </div>
        <div class="h-8 w-px bg-(--surface-elevated)"></div>
        <div class="text-center">
          <div class="text-lg font-bold text-white">12</div>
          <div
            class="text-[10px] uppercase text-slate-500 font-bold tracking-tighter"
          >
            Reviews
          </div>
        </div>
        <div class="h-8 w-px bg-(--surface-elevated)"></div>
        <div class="text-center">
          <div class="text-lg font-bold text-white">21</div>
          <div
            class="text-[10px] uppercase text-slate-500 font-bold tracking-tighter"
          >
            Collections
          </div>
        </div>
      </div>
    </div>

    <!-- Heatmap -->
    <div class="bg-card p-6 rounded-xl shadow-md">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-white font-bold flex items-center">
          <i class="fa-solid fa-fire text-accent mr-2"></i> Activity Heatmap
        </h3>
        <span class="text-xs text-slate-500"
          >{totalActivityCount} updates in the last 24 weeks</span
        >
      </div>
      <div class="overflow-x-auto scrollbar-hide">
        <div
          id="heatmap"
          class="grid grid-rows-7 grid-flow-col gap-1 min-w-max min-h-27.5"
        >
          {#each heatmapData as day}
            {@const level =
              day.count === 0
                ? 0
                : day.count < 3
                  ? 1
                  : day.count < 5
                    ? 2
                    : day.count < 10
                      ? 3
                      : 4}
            <div
              class="heatmap-cell level-{level}"
              title="{day.date}: {day.count} updates"
            ></div>
          {/each}
        </div>
      </div>
      <div
        class="flex items-center justify-end mt-4 space-x-2 text-[10px] text-slate-500"
      >
        <span>Less</span>
        <div class="heatmap-cell level-0"></div>
        <div class="heatmap-cell level-1"></div>
        <div class="heatmap-cell level-2"></div>
        <div class="heatmap-cell level-3"></div>
        <div class="heatmap-cell level-4"></div>
        <span>More</span>
      </div>
    </div>

    {#if profileData?.id}
      <FavoritesGrid profileId={profileData.id} />
    {/if}
  </div>

  <!-- RIGHT COLUMN: Content (Activity Feed) -->
  <div class="lg:col-span-5 space-y-8">
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h3 class="text-white font-bold text-lg">Activity Feed</h3>
        <div class="text-sm text-accent cursor-pointer hover:underline">
          View All
        </div>
      </div>
      {#if profileData?.id}
        <FeedWrapper profileId={profileData.id} />
      {/if}
    </div>
  </div>

  <!-- FAR RIGHT COLUMN: List Stats + Taste Profile -->
  <div class="lg:col-span-3 space-y-8">
    <div class="bg-card p-6 rounded-xl shadow-md">
      <h3 class="text-white font-bold mb-4 flex items-center">
        <i class="fa-solid fa-chart-simple text-accent mr-2"></i> List Stats
      </h3>
      <div class="space-y-6">
        {#each Object.entries(allStats) as [type, stat]}
          <div class="border-b border-(--surface-elevated) pb-4 last:border-0">
            <h4
              class="text-[10px] uppercase text-accent font-bold mb-2 tracking-widest"
            >
              {type.replace("_", " ")}
            </h4>

            <div class="flex justify-between text-xs mb-1">
              <span>Total</span><span class="text-white">{stat.total}</span>
            </div>
            <div class="flex justify-between text-xs mb-1">
              <span>{stat.metricLabel}</span><span class="text-white"
                >{stat.metricValue}</span
              >
            </div>
            <div class="flex justify-between text-xs mb-4">
              <span>Median Score</span><span class="text-white font-bold"
                >{stat.medianScore}</span
              >
            </div>

            <!-- Bar Graph -->
            <div
              class="h-2 w-full bg-slate-800 rounded-full flex overflow-hidden"
            >
              {#each stat.statusDistribution as group}
                {#if group.percent > 0}
                  <Tooltip
                    contentClass="border border-(--surface-elevated) bg-(--surface-elevated)/90 backdrop-blur-md"
                    style="width: {group.percent}%; flex-shrink: 0;"
                  >
                    {#snippet content()}
                      <div class="flex items-center gap-2 text-xs">
                        <span
                          class="w-2 h-2 rounded-full"
                          style="background-color: {group.color}"
                        ></span>
                        <span class="font-bold text-white">{group.label}</span>
                        <span class="text-slate-300">{group.count} titles</span>
                      </div>
                    {/snippet}
                    <div
                      style="background-color: {group.color};"
                      class="h-full w-full"
                    ></div>
                  </Tooltip>
                {/if}
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="bg-card p-6 rounded-xl shadow-md">
      <h3 class="text-white font-bold mb-4 flex items-center">
        <i class="fa-solid fa-brain text-accent mr-2"></i> Taste Profile
      </h3>
      <div class="pt-2">
        <div class="h-50 w-full flex justify-center">
          <canvas bind:this={chartCanvas} id="genreChart"></canvas>
        </div>
      </div>
      <!-- Custom Tooltip Overlay -->
      {#if tooltip}
        <div
          class="fixed z-9999 pointer-events-none bg-(--surface-elevated)/90 text-white p-3 rounded-lg shadow-2xl text-xs backdrop-blur-md border border-(--surface-elevated)"
          style="top: {tooltip.top}px; left: {tooltip.left}px; transform: translate(-50%, -100%); margin-top: -10px;"
        >
          <div class="flex items-center gap-2 mb-1">
            <div
              class="w-2 h-2 rounded-full"
              style="background-color: {tooltip.color}"
            ></div>
            <span class="font-bold">{tooltip.datasetLabel}</span>
          </div>
          <div class="flex items-center gap-2 text-slate-300">
            <i
              class="fa-solid {VIBE_LABELS_TO_ICONS[
                tooltip.label
              ]} w-3.5 text-center"
            ></i>
            <span class="font-medium"
              >{VIBE_LABELS_TO_NAMES[tooltip.label]}</span
            >
          </div>
          <div class="mt-1">
            Score: <span class="font-bold">{tooltip.value}</span>
          </div>
        </div>
      {/if}
      <div
        class="grid grid-cols-2 gap-2 mt-6 text-[9px] uppercase tracking-tighter text-slate-500 font-bold"
      >
        <div class="flex items-center">
          <i
            class="fa-solid {VIBE_ICONS.Speculative} mr-1 text-accent w-4 text-center"
          ></i> Speculative
        </div>
        <div class="flex items-center">
          <i
            class="fa-solid {VIBE_ICONS.Visceral} mr-1 text-accent w-4 text-center"
          ></i> Visceral
        </div>
        <div class="flex items-center">
          <i
            class="fa-solid {VIBE_ICONS.Cerebral} mr-1 text-accent w-4 text-center"
          ></i> Cerebral
        </div>
        <div class="flex items-center">
          <i
            class="fa-solid {VIBE_ICONS.Emotive} mr-1 text-accent w-4 text-center"
          ></i> Emotive
        </div>
        <div class="flex items-center">
          <i
            class="fa-solid {VIBE_ICONS.Interpersonal} mr-1 text-accent w-4 text-center"
          ></i> Interpersonal
        </div>
        <div class="flex items-center">
          <i
            class="fa-solid {VIBE_ICONS.Lighthearted} mr-1 text-accent w-4 text-center"
          ></i> Lighthearted
        </div>
      </div>
    </div>
  </div>
</div>
