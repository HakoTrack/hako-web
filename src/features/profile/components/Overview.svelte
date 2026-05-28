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

  let { profileData, metadata } = $props<{
    profileData: Profile | null;
    metadata: Record<string, Media>;
  }>();

  let feedFilter = $state("all");

  // Stats calculation (shared by multiple sub-components if needed)
  let allStats = $derived(
    calculateAllStats(profileData?.mediaLists || {}, metadata),
  );
</script>

<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
  <!-- LEFT COLUMN: Sidebar (About Me + Favorites) -->
  <div class="lg:col-span-4 space-y-8">
    <ProfileSidebar {profileData} />

    <ActivityHeatmap profileId={profileData?.id} />

    {#if profileData?.id}
      <FavoritesGrid profileId={profileData.id} />
    {/if}
  </div>

  <!-- RIGHT COLUMN: Content (Activity Feed) -->
  <div class="lg:col-span-5 space-y-8">
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h3 class="text-white font-bold text-lg">Activity Feed</h3>
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

  <!-- FAR RIGHT COLUMN: List Stats + Taste Profile -->
  <div class="lg:col-span-3 space-y-8">
    <ListStats {allStats} />

    <TasteProfile {profileData} {metadata} />
  </div>
</div>
