<script lang="ts">
  import { HakoImage } from "../../../shared/utils/images";
  import PostRenderer from "../../../shared/components/PostRenderer.svelte";
  import type { Comment } from "../../../shared/types/index";

  let { comment }: { comment: Comment } = $props();

  function getRelativeTime(timestamp: string): string {
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

  function navigateToProfile(username?: string) {
    if (!username) return;
    window.history.pushState({}, "", `/user/${username}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
</script>

<div class="flex gap-3 items-start">
  <button
    type="button"
    class="hover:opacity-80 transition-opacity shrink-0"
    onclick={() => navigateToProfile(comment.author?.username)}
  >
    <img
      src={HakoImage.get(comment.author?.avatar_url, { w: 24, f: "webp" })}
      class="object-cover w-6 h-6 mt-0.5 rounded-full bg-slate-700 cursor-pointer"
      alt="avatar"
      onerror={(e: Event) => ((e.target as HTMLImageElement).src = "")}
    />
  </button>
  <div class="flex-1 min-w-0">
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="text-xs font-bold text(--hako-fg) hover:underline cursor-pointer"
        onclick={() => navigateToProfile(comment.author?.username)}
      >
        {comment.author?.username || "User"}
      </button>
      <span class="text-[10px] text-slate-500 whitespace-nowrap"
        >{getRelativeTime(comment.created_at)}</span
      >
    </div>
    <div class="mt-0.5">
      <PostRenderer content={comment.content} />
    </div>
  </div>
</div>
