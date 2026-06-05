<script lang="ts">
  import Chart from "chart.js/auto";
  import { get_profile_affinity_wasm } from "$wasm/hako_wasm";
  import type {
    Profile,
    Media,
    ListEntry,
    VibeResult,
  } from "../../../shared/types";
  import {
    VIBE_ICONS,
    VIBE_LABELS,
    VIBE_LABELS_TO_ICONS,
    VIBE_LABELS_TO_NAMES,
  } from "../../../shared/utils/constants";

  let { profileData, metadata, vibes } = $props<{
    profileData?: Profile | null;
    metadata?: Record<string, Media>;
    vibes?: VibeResult;
  }>();

  let radarChart: any = $state(null);
  let chartCanvas: any = $state(null);
  let hasInitializedChart = $state(false);

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

  $effect(() => {
    if (chartCanvas && !hasInitializedChart) {
      if (
        vibes ||
        (metadata &&
          Object.keys(metadata).length > 0 &&
          profileData?.mediaLists)
      ) {
        hasInitializedChart = true;
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
          media: getComputedColor("--c4"), // Default color for single media
        };

        let datasets: any[] = [];
        if (vibes) {
          // Single media vibe data
          const rawScores = Object.keys(VIBE_LABELS).map((label) => {
            return vibes.scores[label as keyof typeof vibes.scores] || 0;
          });
          const min = Math.min(...rawScores);
          const max = Math.max(...rawScores);
          const normalizedData = rawScores.map((score) =>
            max === min
              ? 50
              : Math.round(((score - min) / (max - min)) * 80 + 10),
          );

          datasets = [
            {
              label: "Vibes",
              data: normalizedData,
              backgroundColor: COLORS.media + "33",
              borderColor: COLORS.media,
              pointBackgroundColor: COLORS.media,
              pointRadius: 0,
              borderWidth: 1,
            },
          ];
        } else if (profileData && metadata) {
          // Existing profile logic
          datasets = Object.keys(profileData.mediaLists)
            .filter((type) => type !== "visual_novels")
            .map((type) => {
              const activeEntries = (
                profileData!.mediaLists[type] as ListEntry[]
              ).filter((entry) =>
                ["completed", "current", "dropped"].includes(
                  entry.status?.toLowerCase() || "",
                ),
              );

              if (activeEntries.length === 0) return null;

              const affinities = get_profile_affinity_wasm(
                activeEntries,
                metadata,
              );
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
            .filter((d) => d !== null) as any[];
        }

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
              animation: false, // Disable initial animation
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
    }
  });
</script>

<div class="bg-card p-6 shadow-md">
  <h3 class="text-(--hako-fg) font-bold mb-4 flex items-center">
    <i class="fa-solid fa-brain text-accent mr-2"></i> Taste Profile
  </h3>
  <div class="pt-2">
    <div class="h-50 w-full flex justify-center">
      <canvas bind:this={chartCanvas} id="genreChart"></canvas>
    </div>
  </div>

  {#if tooltip}
    <div
      class="fixed z-9999 pointer-events-none bg-(--surface-elevated)/90 text-(--hako-fg) p-3 rounded-lg shadow-2xl text-xs backdrop-blur-md border border-(--surface-elevated)"
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
        <span class="font-medium">{VIBE_LABELS_TO_NAMES[tooltip.label]}</span>
      </div>
      <div class="mt-1">
        Score: <span class="font-bold">{tooltip.value}</span>
      </div>
    </div>
  {/if}

  <div
    class="grid grid-cols-2 gap-2 mt-6 text-[9px] uppercase tracking-tighter text-slate-500 font-bold"
  >
    {#each Object.entries(VIBE_ICONS) as [name, icon]}
      <div class="flex items-center">
        <i class="fa-solid {icon} mr-1 text-accent w-4 text-center"></i>
        {name}
      </div>
    {/each}
  </div>
</div>
