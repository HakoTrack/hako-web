<script lang="ts">
  import { MediaCover } from "$shared/components";
  import { RecommendationService, type MediaRecommendation } from "./services";

  let {
    recommendations = $bindable([]),
    mediaType = "anime",
    currentUser = null,
    mediaId = 0,
  } = $props<{
    recommendations: MediaRecommendation[];
    mediaType: string;
    currentUser: { id: string } | null;
    mediaId: number;
  }>();

  let isRecommending = $state(false);
  let recommendQuery = $state("");
  let recommendResults = $state<any[]>([]);
  let showAllRecs = $state(false);

  $effect(() => {
    const q = recommendQuery;
    if (!q || q.length < 2) {
      recommendResults = [];
      return;
    }

    const timer = setTimeout(async () => {
      const result = await RecommendationService.searchMedia(q);
      if (result.success) recommendResults = result.data;
    }, 200);

    return () => clearTimeout(timer);
  });

  async function handleVote(recommendationId: number, vote: 1 | -1) {
    if (!currentUser) return;
    const rec = recommendations.find(
      (r: MediaRecommendation) => r.id === recommendationId,
    );
    if (!rec) return;

    if (rec.userVote === vote) {
      await RecommendationService.removeVote(recommendationId, currentUser.id);
    } else {
      await RecommendationService.vote(recommendationId, currentUser.id, vote);
    }

    const result = await RecommendationService.getRecommendations(
      mediaId,
      currentUser.id,
    );
    if (result.success) recommendations = result.data;
  }

  async function handleRecommend(targetMediaId: number) {
    if (!currentUser) return;
    const result = await RecommendationService.createRecommendation(
      mediaId,
      targetMediaId,
      currentUser.id,
    );
    if (result.success) {
      isRecommending = false;
      recommendQuery = "";
      recommendResults = [];
      const recResult = await RecommendationService.getRecommendations(
        mediaId,
        currentUser.id,
      );
      if (recResult.success) recommendations = recResult.data;
    }
  }

  function closeRecommending() {
    isRecommending = false;
    recommendQuery = "";
    recommendResults = [];
  }
</script>

<div class="space-y-4">
  <div class="flex justify-between items-center">
    <h3 class="text-(--hako-fg) font-bold">User Recommendations</h3>
    <div class="flex items-center gap-3">
      <button
        onclick={() => (isRecommending = true)}
        class="text-xs text-slate-500 hover:text-accent font-medium transition-colors flex items-center gap-1"
      >
        <i class="fa-solid fa-plus"></i> Add
      </button>
      {#if recommendations.length > 4 && !showAllRecs}
        <button
          onclick={() => (showAllRecs = true)}
          class="text-xs text-slate-500 hover:text-accent font-medium transition-colors"
        >
          View all
        </button>
      {/if}
    </div>
  </div>

  {#if recommendations.length === 0}
    <p class="text-center text-slate-500 py-6 text-sm">
      No recommendations yet
    </p>
  {:else}
    <div class="grid grid-cols-5 gap-3">
      {#each showAllRecs ? recommendations : recommendations.slice(0, 5) as rec (rec.id)}
        <div class="relative group shrink-0">
          <MediaCover
            mediaId={rec.recommendedMediaId}
            type={mediaType}
            size="medium"
          />
          <div
            class="absolute bottom-0 left-0 right-0 bg-(--hako-bg)/80 p-2 text-(--hako-fg) opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"
          >
            <div
              class="flex items-center justify-between text-xs font-bold pointer-events-auto"
            >
              <!-- svelte-ignore a11y_consider_explicit_label -->
              <button
                onclick={(e) => {
                  e.stopPropagation();
                  handleVote(rec.id, 1);
                }}
                class="cursor-pointer hover:text-(--c10) transition-colors {rec.userVote ===
                1
                  ? 'text-(--c2)'
                  : ''}"
              >
                <i class="fa-solid fa-thumbs-up"></i>
              </button>
              <span>{rec.score}</span>
              <!-- svelte-ignore a11y_consider_explicit_label -->
              <button
                onclick={(e) => {
                  e.stopPropagation();
                  handleVote(rec.id, -1);
                }}
                class="cursor-pointer hover:text-(--c1) transition-colors {rec.userVote ===
                -1
                  ? 'text-(--c1)'
                  : ''}"
              >
                <i class="fa-solid fa-thumbs-down"></i>
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if isRecommending}
    <div class="bg-card p-4 rounded-xl shadow-lg space-y-3">
      <div class="flex justify-between items-center">
        <h3 class="text-(--hako-fg) font-bold text-sm">Recommend a Title</h3>
        <!-- svelte-ignore a11y_consider_explicit_label -->
        <button
          onclick={closeRecommending}
          class="text-xs text-slate-500 hover:text-(--hako-fg)"
        >
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
      <input
        type="text"
        bind:value={recommendQuery}
        placeholder="Search for a title..."
        class="w-full px-3 py-2 rounded-lg bg-(--surface-elevated) text-sm text-(--hako-fg) border border-(--c0) outline-none focus:border-(--c5) transition-colors"
      />
      {#if recommendResults.length > 0}
        <div class="max-h-48 overflow-y-auto space-y-1">
          {#each recommendResults as result}
            <button
              onclick={() => handleRecommend(result.id)}
              class="w-full text-left px-3 py-2 rounded-lg text-sm text-(--hako-fg) hover:bg-(--surface-elevated) transition-colors truncate"
            >
              {result.title}
            </button>
          {/each}
        </div>
      {:else if recommendQuery.length >= 2 && recommendResults.length === 0}
        <p class="text-xs text-slate-500 text-center py-2">No results found</p>
      {/if}
    </div>
  {/if}
</div>
