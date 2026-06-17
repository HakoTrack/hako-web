<script lang="ts">
  import { HakoImage } from "../../../shared/utils/images";
  import PostRenderer from "../../../shared/components/PostRenderer.svelte";
  import { ForumInteractionService } from "../services/forumInteractionService";
  import type { ForumPost } from "../../../shared/types";

  let { post, userId, onPostEdited } = $props<{
    post: ForumPost;
    userId: string | null | undefined;
    onPostEdited?: (postId: number, content: string) => void;
  }>();

  let isLiked = $state(post.isLiked);
  let likeCount = $state(post.likesCount);
  let isEditing = $state(false);
  let editContent = $state(post.content);

  $effect(() => {
    isLiked = post.isLiked;
    likeCount = post.likesCount;
  });

  let isEdited = $derived(post.updatedAt !== post.createdAt);

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

  function formatEditTimestamp(timestamp: string): string {
    const d = new Date(timestamp);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function handleLike() {
    if (!userId) return;
    const previousLiked = isLiked;
    const previousCount = likeCount;

    isLiked = !isLiked;
    likeCount = isLiked ? likeCount + 1 : likeCount - 1;

    const result = await ForumInteractionService.toggleLike(post.id, userId);
    if (result.success) {
      likeCount = result.data;
    } else {
      isLiked = previousLiked;
      likeCount = previousCount;
    }
  }

  function navigateToProfile(username?: string) {
    if (!username) return;
    window.history.pushState({}, "", `/user/${username}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function startEdit() {
    editContent = post.content;
    isEditing = true;
  }

  function cancelEdit() {
    isEditing = false;
  }

  async function saveEdit() {
    if (!userId || !editContent.trim()) return;
    onPostEdited?.(post.id, editContent.trim());
    isEditing = false;
  }
</script>

<div class="bg-card shadow-md" id="post-{post.id}">
  <div class="flex gap-4 p-5">
    <div class="shrink-0">
      <button
        type="button"
        onclick={() => navigateToProfile(post.author?.username)}
      >
        <img
          src={HakoImage.get(post.author?.avatar_url)}
          class="w-10 h-10 rounded-full bg-slate-700 object-cover cursor-pointer hover:opacity-80 transition-opacity"
          alt="avatar"
          onerror={(e: Event) => ((e.target as HTMLImageElement).src = "")}
        />
      </button>
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-2 flex-wrap">
        <button
          type="button"
          onclick={() => navigateToProfile(post.author?.username)}
          class="text-sm font-bold text-(--hako-fg) hover:text-(--hako-accent) transition-colors"
        >
          {post.author?.username || "User"}
        </button>
        <span class="text-xs text-slate-500"
          >{getRelativeTime(post.createdAt)}</span
        >
        {#if isEdited}
          <span class="text-xs text-slate-500 italic">
            (edited {formatEditTimestamp(post.updatedAt)})
          </span>
        {/if}
      </div>

      {#if isEditing}
        <textarea
          bind:value={editContent}
          class="w-full bg-(--hako-bg) border border-(--surface-elevated) rounded-lg p-3 text-sm text-(--hako-fg) focus:ring-1 focus:ring-(--hako-accent) outline-none min-h-20 resize-y"
        ></textarea>
        <div class="flex gap-2 mt-2">
          <button
            type="button"
            onclick={saveEdit}
            class="px-3 py-1 rounded text-xs font-bold bg-(--hako-accent) text-(--hako-bg) hover:opacity-90 transition-all"
          >
            Save
          </button>
          <button
            type="button"
            onclick={cancelEdit}
            class="px-3 py-1 rounded text-xs font-bold bg-white/5 text-(--hako-fg) border border-white/10 hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
        </div>
      {:else}
        <div class="prose-sm max-w-none">
          <PostRenderer content={post.content} />
        </div>
      {/if}

      <div class="flex items-center gap-4 mt-4 text-sm text-slate-500">
        <button
          type="button"
          onclick={handleLike}
          disabled={!userId}
          class="flex items-center gap-1.5 transition-colors cursor-pointer disabled:cursor-default {isLiked
            ? 'text-(--c9)'
            : 'hover:text-(--c9)'}"
        >
          <i class="fa-solid fa-heart"></i>
          <span>{likeCount}</span>
        </button>

        {#if userId && post.authorId === userId}
          <button
            type="button"
            onclick={startEdit}
            class="flex items-center gap-1.5 hover:text-(--hako-fg) transition-colors cursor-pointer"
          >
            <i class="fa-solid fa-pen"></i>
            <span>Edit</span>
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>
