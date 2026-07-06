<script lang="ts">
  import Tooltip from "../../../shared/components/Tooltip.svelte";
  import Skeleton from "../../../shared/components/Skeleton.svelte";
  import type { StatsResult } from "../services/statsCalc";

  type StatusGroup = StatsResult["statusDistribution"][number];

  let { allStats = {} } = $props<{
    allStats: Record<string, StatsResult>;
  }>();

  const CATEGORIES = [
    { id: "anime", label: "Anime", metric: "Days Watched" },
    { id: "manga", label: "Manga", metric: "Chapters Read" },
    { id: "light_novel", label: "Light Novel", metric: "Volumes Read" },
  ];
</script>

<div class="bg-card p-6 shadow-md">
  <h3 class="text-(--hako-fg) font-bold mb-4 flex items-center">
    <i class="fa-solid fa-chart-simple text-accent mr-2"></i> List Stats
  </h3>
  <div class="space-y-6">
    {#each CATEGORIES as cat}
      {@const s = allStats[cat.id]}
      <div class="border-b border-(--surface-elevated) pb-4 last:border-0">
        <h4
          class="text-[10px] uppercase text-accent font-bold mb-2 tracking-widest"
        >
          {cat.label}
        </h4>

        <div class="flex justify-between text-xs mb-1">
          <span>Total</span><span class="text-(--hako-fg)">{s?.total ?? 0}</span
          >
        </div>
        <div class="flex justify-between text-xs mb-1">
          <span>{s?.metricLabel || cat.metric}</span><span
            class="text-(--hako-fg)"
            >{s?.metricValue ?? (cat.id === "anime" ? "0.0" : "0")}</span
          >
        </div>
        <div class="flex justify-between text-xs mb-4">
          <span>Median Score</span><span class="text-(--hako-fg) font-bold"
            >{s?.medianScore ?? "0.0"}</span
          >
        </div>

        <!-- Bar Graph -->
        <div class="h-2 w-full bg-slate-800 rounded-full flex overflow-hidden">
          {#if s && s.statusDistribution?.length > 0}
            {@const visible = s.statusDistribution.filter((g: StatusGroup) => g.percent > 0)}
            {#each visible as group, i}
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
                    <span class="font-bold text-(--hako-fg)"
                      >{group.label}</span
                    >
                    <span class="text-slate-300">{group.count} titles</span>
                  </div>
                {/snippet}
                <div
                  style="background-color: {group.color};"
                  class="h-full w-full {i === 0
                    ? 'rounded-l-full'
                    : ''} {i === visible.length - 1
                    ? 'rounded-r-full'
                    : ''}"
                ></div>
              </Tooltip>
            {/each}
          {:else}
            <Skeleton class="h-full w-full" type="text" />
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
