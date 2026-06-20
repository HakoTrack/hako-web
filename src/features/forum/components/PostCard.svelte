<script lang="ts">
  import { HakoImage } from "../../../shared/utils/images";
  import PostRenderer from "../../../shared/components/PostRenderer.svelte";
  import Dropdown from "../../../shared/components/Dropdown.svelte";
  import { ForumInteractionService } from "../services/forumInteractionService";
  import { ROLES } from "../../../shared/utils/constants";
  import type { ForumPost } from "../../../shared/types";

  let {
    post,
    userId,
    onPostEdited,
    onReply,
    onQuote,
    allPosts = [],
    postCount,
  } = $props<{
    post: ForumPost;
    userId: string | null | undefined;
    onPostEdited?: (postId: number, content: string) => void;
    onReply?: (post: ForumPost) => void;
    onQuote?: (post: ForumPost, content: string) => void;
    allPosts?: ForumPost[];
    postCount?: number;
  }>();

  let isLiked = $state(post.isLiked);
  let likeCount = $state(post.likesCount);
  let isEditing = $state(false);
  let editContent = $state(post.content);

  let joinDate = $derived(post.author?.join_date);
  let signature = $derived(post.author?.quote);
  let roleInfo = $derived(post.author?.role ? ROLES[post.author.role] : null);

  $effect(() => {
    isLiked = post.isLiked;
    likeCount = post.likesCount;
  });

  let isEdited = $derived(post.updatedAt !== post.createdAt);

  let replyTargets = $derived(
    post.replyToIds
      .map((id: number) => {
        const p = allPosts.find((p: ForumPost) => p.id === id);
        return p ? { id: p.id, username: p.author?.username } : null;
      })
      .filter(Boolean) as { id: number; username: string | undefined }[],
  );

  let avatars = $derived(
    Object.fromEntries(
      allPosts
        .filter((p: ForumPost) => p.author?.username)
        .map((p: ForumPost) => [p.author!.username, p.author?.avatar_url || ""]),
    ),
  );

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

  function formatJoinDate(
    dateStr: string | null | undefined,
  ): string | undefined {
    if (!dateStr) return undefined;
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", { month: "short", year: "numeric" });
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

  function scrollToPost(id: number) {
    const el = document.getElementById(`post-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleReply() {
    onReply?.(post);
  }

  function handleQuote() {
    const markdown = `[quote=${post.author?.username || "User"}, post=${post.id}]\n${post.content}\n[/quote]`;
    onQuote?.(post, markdown);
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

  function getDropdownItems() {
    const items: { icon: string; label: string; action: () => void }[] = [];
    if (userId && post.authorId === userId) {
      items.push({ icon: "fa-pen", label: "Edit", action: startEdit });
    }
    return items;
  }
</script>

<div
  class="flex rounded-lg border border-(--surface-elevated)/20 bg-card overflow-hidden scroll-mt-20"
  id="post-{post.id}"
>
  <div
    class="w-40 shrink-0 p-4 flex flex-col items-center gap-1.5 bg-(--hako-bg)/30 text-center"
  >
    <button
      type="button"
      onclick={() => navigateToProfile(post.author?.username)}
    >
      <img
        src={HakoImage.get(post.author?.avatar_url)}
        class="w-14 h-14 rounded-full bg-slate-700 object-cover cursor-pointer hover:opacity-80 transition-opacity"
        alt="avatar"
        onerror={(e: Event) => ((e.target as HTMLImageElement).src = "")}
      />
    </button>
    <button
      type="button"
      onclick={() => navigateToProfile(post.author?.username)}
      class="text-sm font-bold text-(--hako-fg) hover:text-(--hako-accent) transition-colors text-center truncate max-w-full"
    >
      {post.author?.username || "User"}
    </button>
    {#if roleInfo}
      <span
        class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider {roleInfo.color}"
        >{roleInfo.romaji}</span
      >
    {/if}
    {#if postCount != null || joinDate}
      <div
        class="flex flex-col items-center gap-0.5 mt-1 text-[11px] text-slate-500"
      >
        {#if postCount != null}
          <span>Posts: {postCount}</span>
        {/if}
        {#if joinDate}
          <span>Joined: {formatJoinDate(joinDate)}</span>
        {/if}
      </div>
    {/if}
  </div>

  <div class="flex-1 min-w-0 flex flex-col">
    <div class="p-4">
      <div
        class="flex items-center justify-between gap-2 mb-3 text-xs text-slate-500"
      >
        <span>
          {getRelativeTime(post.createdAt)}
          {#if isEdited}
            <span class="italic"
              >&middot; edited {formatEditTimestamp(post.updatedAt)}</span
            >
          {/if}
        </span>
        {#if getDropdownItems().length > 0}
          <Dropdown items={getDropdownItems()}>
            <!-- svelte-ignore a11y_consider_explicit_label -->
            <button
              type="button"
              class="flex items-center justify-center w-7 h-7 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
            >
              <i class="fa-solid fa-ellipsis-vertical text-xs"></i>
            </button>
          </Dropdown>
        {/if}
      </div>

      {#if replyTargets.length > 0}
        <div class="flex flex-wrap gap-1.5 mb-2">
          {#each replyTargets as target}
            <button
              type="button"
              onclick={() => scrollToPost(target.id)}
              class="text-[11px] text-slate-500 hover:text-(--hako-accent) transition-colors cursor-pointer"
            >
              <i class="fa-solid fa-arrow-up mr-0.5"></i>{target.username}
            </button>
          {/each}
        </div>
      {/if}

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
          <PostRenderer content={post.content} {avatars} />
        </div>
      {/if}

      <div
        class="flex items-center gap-4 mt-4 pt-3 border-t border-(--surface-elevated)/10 text-sm text-slate-500"
      >
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
        {#if userId}
          <button
            type="button"
            onclick={handleReply}
            class="flex items-center gap-1.5 text-slate-500 hover:text-(--hako-accent) transition-colors cursor-pointer"
          >
            <i class="fa-solid fa-reply"></i>
            <span class="text-xs">Reply</span>
          </button>
          <button
            type="button"
            onclick={handleQuote}
            class="flex items-center gap-1.5 text-slate-500 hover:text-(--hako-accent) transition-colors cursor-pointer"
          >
            <i class="fa-solid fa-quote-right"></i>
            <span class="text-xs">Quote</span>
          </button>
        {/if}
      </div>
    </div>

    {#if signature}
      <div class="px-4 py-2 border-t border-(--surface-elevated)/10">
        <p
          class="text-[11px] text-slate-500 italic leading-tight truncate max-w-full"
        >
          {signature}
        </p>
      </div>
    {/if}
  </div>
</div>
