<script lang="ts">
  import type { ForumThread, ForumCategory } from "../../../shared/types";
  import { FORUM_CATEGORY_COLORS } from "../../../shared/utils/constants";

  let {
    categories = [],
    recentThreads = [],
    recentLoading = true,
    activeCategoryId = null,
    onCategorySelect,
  } = $props<{
    categories?: ForumCategory[];
    recentThreads?: ForumThread[];
    recentLoading?: boolean;
    activeCategoryId?: number | null;
    onCategorySelect?: (catId: number | null) => void;
  }>();

  function navigateTo(url: string) {
    window.history.pushState({}, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function getRelativeTime(timestamp: string | null): string {
    if (!timestamp) return "";
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const diff = new Date(timestamp).getTime() - new Date().getTime();
    const seconds = Math.round(diff / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (Math.abs(seconds) < 60) return rtf.format(seconds, "second");
    if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
    if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
    return rtf.format(days, "day");
  }

  function getCatColor(slug: string): string {
    return FORUM_CATEGORY_COLORS[slug] || "var(--c7)";
  }
</script>

<div class="space-y-6">
  <div class="bg-card p-2 shadow-md">
    <h3
      class="text-sm font-bold text-(--hako-fg) mb-3 mt-1 pl-3 flex items-center gap-2"
    >
      <i class="fa-solid fa-list text-(--hako-accent)"></i>
      Categories
    </h3>
    <div class="flex flex-col">
      <button
        type="button"
        onclick={() => onCategorySelect?.(null)}
        class="flex items-center justify-between px-4 py-3 text-sm font-medium transition-all outline-none rounded-lg {activeCategoryId ===
        null
          ? 'text-(--hako-fg) bg-(--surface-elevated)'
          : 'text-slate-400 hover:text-(--hako-fg) hover:bg-card'}"
      >
        <div class="flex items-center">
          <span class="w-2 h-2 rounded-full mr-3 bg-(--c7)"></span>
          <span>All Categories</span>
        </div>
      </button>
      {#each categories as cat}
        <button
          type="button"
          onclick={() => onCategorySelect?.(cat.id)}
          class="flex items-center justify-between px-4 py-3 text-sm font-medium transition-all outline-none rounded-lg {activeCategoryId ===
          cat.id
            ? 'text-(--hako-fg) bg-(--surface-elevated)'
            : 'text-slate-400 hover:text-(--c15) hover:bg-card'}"
        >
          <div class="flex items-center">
            <span
              class="w-2 h-2 rounded-full mr-3"
              style="background-color: {getCatColor(cat.slug)}"
            ></span>
            <span>{cat.name}</span>
          </div>
          <span class="text-xs text-slate-500">{cat.threadCount ?? 0}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="bg-card p-5 shadow-md">
    <h3 class="text-sm font-bold text-(--hako-fg) mb-3 flex items-center gap-2">
      <i class="fa-solid fa-clock text-(--hako-accent)"></i>
      Recent Activity
    </h3>
    <div class="space-y-2">
      {#if recentLoading}
        {#each [1, 2, 3, 4, 5] as _}
          <div class="px-3 py-2 rounded-lg">
            <div
              class="h-5 bg-(--surface-elevated)/30 rounded animate-pulse mb-0.5"
            ></div>
            <div
              class="h-4 bg-(--surface-elevated)/20 rounded animate-pulse w-1/2"
            ></div>
          </div>
        {/each}
      {:else}
        {#each recentThreads as thread}
          <button
            type="button"
            onclick={() => navigateTo(`/forum/${thread.id}`)}
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-(--surface-elevated)/20 transition-colors"
          >
            <div class="text-sm text-(--hako-fg) truncate">{thread.title}</div>
            <div class="text-xs text-slate-500 mt-0.5">
              {thread.author?.username || "User"} &middot; {getRelativeTime(
                thread.lastPostAt || thread.createdAt,
              )}
            </div>
          </button>
        {/each}
      {/if}
    </div>
  </div>
</div>
