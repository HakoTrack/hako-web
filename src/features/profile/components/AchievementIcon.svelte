<script lang="ts">
  import Tooltip from "../../../shared/components/Tooltip.svelte";
  import AchievementBadge from "./AchievementBadge.svelte";
  import type { Achievement } from "../../../shared/types";

  let { achievement }: { achievement: Achievement } = $props();

  let tierInfo = $derived(
    achievement.tier_labels?.[achievement.user_tier] ?? null,
  );
</script>

{#snippet tooltipContent()}
  <div class="text-xs font-bold text-center">
    <div>{achievement.title}</div>
    <div class="mt-1">
      {tierInfo?.name ?? ""} — Tier {achievement.user_tier}/{achievement.max_tier}
    </div>
  </div>
{/snippet}

<Tooltip content={tooltipContent} placement="top" offset={6}>
  {#snippet children()}
    <span style={tierInfo ? `color: ${tierInfo.color}` : ""}>
      <AchievementBadge
        tier={achievement.user_tier!}
        mediaType={achievement.media_type ?? "anime"}
        class="w-7 h-7"
      />
    </span>
  {/snippet}
</Tooltip>
