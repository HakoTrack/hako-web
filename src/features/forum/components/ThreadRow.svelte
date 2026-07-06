<script lang="ts">
  import { HakoImage } from "../../../shared/utils/images";
  import { FORUM_CATEGORY_COLORS } from "../../../shared/utils/constants";
  import { getDisplayTitle, settings } from "../../../core/settings.svelte";
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

  let subjectTitle = $derived(
    thread.subjectMedia
      ? getDisplayTitle(thread.subjectMedia.title, settings.titlePreference)
      : null,
  );

  let mediaIcon = $derived.by(() => {
    if (!thread.subjectMedia) return "";
    const t = thread.subjectMedia.media_type;
    return t === "manga" || t === "light_novel" ? "fa-book" : "fa-film";
  });

  function navigateToMedia() {
    if (!thread.subjectMedia) return;
    const type = thread.subjectMedia.media_type || "anime";
    window.history.pushState(
      {},
      "",
      `/${type}/${thread.subjectMedia.media_id}`,
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
</script>

<div
  class="flex items-start gap-4 p-4 bg-card transition-colors cursor-pointer rounded-lg hover:brightness-120"
  onclick={() => navigateTo(`/forum/${thread.id}`)}
  role="link"
  tabindex="0"
  onkeydown={(e) => e.key === "Enter" && navigateTo(`/forum/${thread.id}`)}
>
  <div class="flex-1 min-w-0 flex flex-col gap-0.5">
    <div class="flex items-center gap-2 mb-1">
      {#if thread.isPinned}
        <i class="fa-solid fa-thumbtack text-xs text-(--hako-accent) shrink-0"
        ></i>
      {/if}
      {#if thread.isLocked}
        <i class="fa-solid fa-lock text-xs text-slate-500 shrink-0"></i>
      {/if}
      <span class="text-sm font-bold text-(--hako-fg) truncate">
        {thread.title}
      </span>
    </div>

    <div class="flex items-center gap-2 mb-1">
      {#if thread.category}
        <span
          class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0"
          style="background-color: color-mix(in srgb, {catColor} 13%, transparent); color: {catColor};"
        >
          {thread.category.name}
        </span>
      {/if}
      {#if thread.subjectMedia}
        <button
          type="button"
          onclick={(e) => {
            e.stopPropagation();
            navigateToMedia();
          }}
          class="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider shrink-0 text-slate-400 hover:text-(--hako-accent) bg-(--surface-elevated)/60 hover:bg-(--surface-elevated)/80 transition-all"
        >
          <i class="fa-solid {mediaIcon}"></i>
          <span class="max-w-50 truncate">{subjectTitle}</span>
        </button>
      {/if}
    </div>

    <div class="flex items-center gap-2 text-xs text-slate-500">
      <span>by {thread.author?.username || "User"}</span>
      <span>•</span>
      <span>{thread.postCount} posts</span>
      <span>•</span>
      <span>{thread.viewCount} views</span>
    </div>
  </div>

  <div class="shrink-0 min-w-30 hidden sm:block">
    {#if thread.lastPostAt}
      <div class="flex items-center gap-2 justify-end">
        <div class="text-xs text-right leading-tight w-24">
          <div class="truncate text-(--hako-fg)">
            {thread.lastPostAuthor?.username || "User"}
          </div>
          <div class="text-slate-500 truncate">
            {getRelativeTime(thread.lastPostAt)}
          </div>
        </div>
        <img
          src={HakoImage.get(thread.lastPostAuthor?.avatar_url)}
          class="w-6 h-6 rounded-full bg-slate-700 object-cover shrink-0"
          alt=""
          onerror={(e: Event) => ((e.target as HTMLImageElement).src = "")}
        />
      </div>
    {:else}
      <span class="text-xs text-slate-500">No replies</span>
    {/if}
  </div>
</div>
