<script lang="ts">
  import { ActivityService } from "../../services/activityService";

  let { profileId } = $props<{
    profileId: string | undefined;
  }>();

  let heatmapData = $state(Array(168).fill({ date: "", count: 0 }));
  let totalActivityCount = $derived(
    heatmapData.reduce((sum, day) => sum + day.count, 0),
  );

  $effect(() => {
    if (profileId) {
      ActivityService.getHeatmapData(profileId, 167).then((data) => {
        heatmapData = data;
      });
    }
  });
</script>

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
