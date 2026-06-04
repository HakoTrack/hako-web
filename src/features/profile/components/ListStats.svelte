<script lang="ts">
  import Tooltip from "../../../shared/components/Tooltip.svelte";
  import type { StatsResult } from "../services/statsCalc";

  let { allStats } = $props<{
    allStats: Record<string, StatsResult>;
  }>();
</script>

<div class="bg-card p-6 shadow-md">
  <h3 class="text-(--hako-fg) font-bold mb-4 flex items-center">
    <i class="fa-solid fa-chart-simple text-accent mr-2"></i> List Stats
  </h3>
  <div class="space-y-6">
    {#each Object.entries(allStats) as [type, stat]}
      {@const s = stat as StatsResult}
      <div class="border-b border-(--surface-elevated) pb-4 last:border-0">
        <h4
          class="text-[10px] uppercase text-accent font-bold mb-2 tracking-widest"
        >
          {type.replace("_", " ")}
        </h4>

        <div class="flex justify-between text-xs mb-1">
          <span>Total</span><span class="text-(--hako-fg)">{s.total}</span>
        </div>
        <div class="flex justify-between text-xs mb-1">
          <span>{s.metricLabel}</span><span class="text-(--hako-fg)"
            >{s.metricValue}</span
          >
        </div>
        <div class="flex justify-between text-xs mb-4">
          <span>Median Score</span><span class="text-(--hako-fg) font-bold"
            >{s.medianScore}</span
          >
        </div>

        <!-- Bar Graph -->
        <div class="h-2 w-full bg-slate-800 rounded-full flex overflow-hidden">
          {#each s.statusDistribution as group}
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
                    <span class="font-bold text-(--hako-fg)">{group.label}</span
                    >
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
