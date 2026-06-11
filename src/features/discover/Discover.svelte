<script lang="ts">
  import TrendingMedia from "../browse/components/TrendingMedia.svelte";
  import TopRatedMedia from "../browse/components/TopRatedMedia.svelte";
  import SegmentedControl from "../../shared/components/SegmentedControl.svelte";

  let { mediaType = "anime" } = $props<{
    mediaType?: "anime" | "manga" | "light_novel";
  }>();

  let activeView = $state<"trending" | "top-rated">("top-rated");
</script>

<div class="py-12 px-6 max-w-6xl mx-auto">
  <div class="flex items-center justify-between mb-12">
    <h1 class="text-4xl font-bold text-(--hako-fg) capitalize">
      Discover {mediaType}
    </h1>

    <div>
      <SegmentedControl
        bind:value={activeView}
        options={[
          { label: "Top Rated", value: "top-rated" },
          { label: "Trending", value: "trending" },
        ]}
      />
    </div>
  </div>

  {#if activeView === "top-rated"}
    <TopRatedMedia {mediaType} />
  {:else}
    <TrendingMedia {mediaType} />
  {/if}
</div>
