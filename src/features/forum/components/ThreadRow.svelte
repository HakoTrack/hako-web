<script lang="ts">
  import { HakoImage } from "../../../shared/utils/images";
  import { FORUM_CATEGORY_COLORS } from "../../../shared/utils/constants";
  import type { ForumThread } from "../../../shared/types";

  let { thread } = $props<{ thread: ForumThread }>();

  function getRelativeTime(timestamp: string | null): string {
    if (!timestamp) return "—";
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

  function navigateTo(url: string) {
    window.history.pushState({}, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  let catColor = $derived(
    FORUM_CATEGORY_COLORS[thread.category?.slug ?? ""] || "var(--c7)",
  );
</script>

<div
  class="flex items-center gap-4 px-5 py-3.5 bg-card hover:bg-(--surface-elevated)/30 transition-colors cursor-pointer border-b border-(--surface-elevated)/20"
  onclick={() => navigateTo(`/forum/${thread.id}`)}
  role="link"
  tabindex="0"
  onkeydown={(e) => e.key === "Enter" && navigateTo(`/forum/${thread.id}`)}
>
  <div class="flex-1 min-w-0">
    <div class="flex items-center gap-2">
      {#if thread.isPinned}
        <i class="fa-solid fa-thumbtack text-xs text-(--hako-accent)"></i>
      {/if}
      {#if thread.isLocked}
        <i class="fa-solid fa-lock text-xs text-slate-500"></i>
      {/if}
      <span class="text-sm font-bold text-(--hako-fg) truncate">
        {thread.title}
      </span>
      {#if thread.category}
        <span
          class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider leading-none shrink-0"
          style="background-color: {catColor}22; color: {catColor};"
        >
          {thread.category.name}
        </span>
      {/if}
    </div>
    <div class="flex items-center gap-2 mt-1 text-xs text-slate-500">
      <span>by {thread.author?.username || "User"}</span>
      <span>•</span>
      <span>{thread.postCount} posts</span>
      <span>•</span>
      <span>{thread.viewCount} views</span>
    </div>
  </div>

  <div class="shrink-0 text-right min-w-30 hidden sm:block">
    {#if thread.lastPostAt}
      <div class="flex items-center justify-end gap-2">
        <img
          src={HakoImage.get(thread.lastPostAuthor?.avatar_url)}
          class="w-5 h-5 rounded-full bg-slate-700 object-cover"
          alt=""
          onerror={(e: Event) => ((e.target as HTMLImageElement).src = "")}
        />
        <div class="text-xs">
          <div class="text-(--hako-fg) truncate max-w-24">
            {thread.lastPostAuthor?.username || "User"}
          </div>
          <div class="text-slate-500">{getRelativeTime(thread.lastPostAt)}</div>
        </div>
      </div>
    {:else}
      <span class="text-xs text-slate-500">No replies</span>
    {/if}
  </div>
</div>
