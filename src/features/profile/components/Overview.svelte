<script lang="ts">
  import FavoritesGrid from "./FavoritesGrid.svelte";
  import FeedWrapper from "../../feed/components/FeedWrapper.svelte";
  import ProfileSidebar from "./ProfileSidebar.svelte";
  import ActivityHeatmap from "./ActivityHeatmap.svelte";
  import TasteProfile from "./TasteProfile.svelte";
  import ListStats from "./ListStats.svelte";
  import { calculateAllStats } from "../services/statsCalc";
  import type { Profile, Media } from "../../../shared/types";
  import SegmentedControl from "../../../shared/components/SegmentedControl.svelte";

  let {
    profileData,
    metadata = {},
    isMetadataLoading = false,
  } = $props<{
    profileData: Profile | null;
    metadata?: Record<string, Media>;
    isMetadataLoading?: boolean;
  }>();

  let feedFilter = $state("all");
  let currentSlide = $state(1); // 0: Sidebar, 1: Feed, 2: Stats
  let startX = 0;

  let allStatsResult = $derived.by(() => {
    if (isMetadataLoading || Object.keys(metadata).length === 0) {
      return { stats: {}, affinities: {} };
    }
    return calculateAllStats(profileData?.mediaLists || {}, metadata);
  });

  let allStats = $derived(allStatsResult.stats);
  let allAffinities = $derived(allStatsResult.affinities);

  function handleTouchStart(e: TouchEvent) {
    startX = e.touches[0].clientX;
  }

  function handleTouchEnd(e: TouchEvent) {
    const endX = e.changedTouches[0].clientX;
    const diff = endX - startX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentSlide > 0)
        currentSlide--; // Swipe Right
      else if (diff < 0 && currentSlide < 2) currentSlide++; // Swipe Left
    }
  }
</script>

<!-- DESKTOP: Existing Grid -->
<div class="hidden lg:grid grid-cols-12 gap-8 mb-12">
  <div class="lg:col-span-4 space-y-8">
    <ProfileSidebar {profileData} />
    <ActivityHeatmap profileId={profileData?.id} />
    {#if profileData?.id}
      <FavoritesGrid profileId={profileData.id} limit={10} />
    {/if}
  </div>

  <div class="lg:col-span-5 space-y-8">
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h3 class="text-(--hako-fg) font-bold text-lg">Activity Feed</h3>
        <SegmentedControl
          bind:value={feedFilter}
          options={[
            { label: "All", value: "all" },
            { label: "Posts", value: "posts" },
            { label: "Updates", value: "updates" },
          ]}
        />
      </div>
      {#if profileData?.id}
        <FeedWrapper profileId={profileData.id} filter={feedFilter} />
      {/if}
    </div>
  </div>

  <div class="lg:col-span-3 space-y-8">
    <ListStats {allStats} />
    <TasteProfile
      {profileData}
      metadata={isMetadataLoading ? {} : metadata}
      affinities={allAffinities}
    />
  </div>
</div>

<!-- MOBILE: Swipe Container -->
<div class="lg:hidden w-full overflow-hidden relative mb-12">
  <div
    class="flex transition-transform duration-300 ease-out touch-pan-y"
    style="transform: translateX(-{currentSlide * 100}%)"
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
  >
    <!-- Sidebar Column -->
    <div class="w-full shrink-0 px-4 space-y-8">
      <ProfileSidebar {profileData} />
      <ActivityHeatmap profileId={profileData?.id} />
      {#if profileData?.id}
        <FavoritesGrid profileId={profileData.id} limit={10} />
      {/if}
    </div>

    <!-- Feed Column -->
    <div class="w-full shrink-0 px-4 space-y-8">
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-(--hako-fg) font-bold text-lg">Activity Feed</h3>
          <SegmentedControl
            bind:value={feedFilter}
            options={[
              { label: "All", value: "all" },
              { label: "Posts", value: "posts" },
              { label: "Updates", value: "updates" },
            ]}
          />
        </div>
        {#if profileData?.id}
          <FeedWrapper profileId={profileData.id} filter={feedFilter} />
        {/if}
      </div>
    </div>

    <!-- Stats Column -->
    <div class="w-full shrink-0 px-4 space-y-8">
      <ListStats {allStats} />
      <TasteProfile
        {profileData}
        metadata={isMetadataLoading ? {} : metadata}
        affinities={allAffinities}
      />
    </div>
  </div>

  <!-- Indicators -->
  <div
    class="fixed bottom-6 left-0 w-full flex justify-center gap-2 pointer-events-none z-50"
  >
    {#each Array(3) as _, i}
      <div
        class="h-2 w-2 rounded-full transition-colors {i === currentSlide
          ? 'bg-accent'
          : 'bg-slate-700'}"
      ></div>
    {/each}
  </div>
</div>
