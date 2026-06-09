<script lang="ts">
  import { HakoImage } from "../../../shared/utils/images";
  import { openQuickEditor } from "../../../core/ui.svelte";
  import { fetchMediaSummaries } from "../../../shared/utils/mediaData";
  import { FeedInteractionService } from "../services/feedInteractionService";
  import { AuthService } from "../../../core/auth";
  import PostRenderer from "../../../shared/components/PostRenderer.svelte";
  import CommentSection from "./CommentSection.svelte";
  import MediaCover from "../../../shared/components/MediaCover.svelte";
  import type { Post, PostMetadata, Media } from "../../../shared/types/index";
  import { STATUS_COLORS } from "../../../shared/utils/constants";
  import { getDisplayTitle, settings } from "../../../core/settings.svelte";
  import Skeleton from "../../../shared/components/Skeleton.svelte";

  let {
    post,
    prefetchedMedia = null,
  }: { post: Post; prefetchedMedia?: Media | null } = $props();

  let isLiked = $state(false);
  let showComments = $state(false);

  // Use derived to handle reactive updates from props
  let fetchedMedia = $state<Media | null>(null);
  let mediaInfo = $derived(prefetchedMedia || fetchedMedia);

  $effect(() => {
    if (
      !prefetchedMedia &&
      post.post_type === "list_update" &&
      post.metadata?.media_id
    ) {
      const media_id = post.metadata.media_id;
      fetchMediaSummaries([media_id]).then(
        (mediaMap) => (fetchedMedia = mediaMap[media_id] as any),
      );
    }
  });

  // Reactive counts derived directly from post prop
  let likeCount = $derived(post.likes_count || 0);
  let commentCount = $derived(post.comments_count || 0);
  let shareCount = $derived(post.shares_count || 0);

  $effect(() => {
    const currentPost = post;
    AuthService.getCurrentUser().then((user) => {
      if (user) {
        // 'likes' property contains the array of user_id objects for checking if *we* liked it
        isLiked = currentPost.likes.some((l) => l.user_id === user.id);
      }
    });
  });

  // Robust progress calculation with null checks
  const percent = $derived.by(() => {
    if (post.post_type !== "list_update" || !post.metadata) return 0;

    let total = Number(post.metadata.total);
    if ((!total || total <= 0) && mediaInfo) {
      total =
        (post.metadata.media_type === "anime"
          ? mediaInfo.episodes
          : mediaInfo.chapters) ?? 0;
    }

    if (total > 0) {
      return Math.round(((post.metadata.progress || 0) / total) * 100);
    }
    return (post.metadata.progress || 0) > 0 ? 50 : 0;
  });

  // Animation for progress bar
  let displayedPercent = $state(0);
  $effect(() => {
    if (percent > 0) {
      setTimeout(() => (displayedPercent = percent), 50);
    }
  });

  function getRelativeTime(timestamp: string): string {
    if (!timestamp) return "Recently";
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

  const timeAgo = $derived(getRelativeTime(post.created_at));

  function navigateToProfile(username?: string) {
    if (!username) return;
    window.history.pushState({}, "", `/user/${username}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function getVerb(metadata: PostMetadata): string {
    const status = (metadata.status || "updated").toLowerCase();
    const progress = metadata.progress || 0;
    let total =
      metadata.total !== null &&
      metadata.total !== undefined &&
      Number(metadata.total) > 0
        ? Number(metadata.total)
        : null;

    if (total === null && mediaInfo) {
      total =
        (metadata.media_type === "anime"
          ? mediaInfo.episodes
          : mediaInfo.chapters) ?? null;
    }

    const progressStr =
      total !== null ? `${progress}/${total}` : `${progress}/?`;

    if (status === "completed") return "Completed";
    if (status === "paused") return `Paused at ${progressStr}`;
    if (status === "dropped") return `Dropped at ${progressStr}`;
    if (status === "planning") return `Planning`;

    // Handle "current" status specifically
    if (status === "current") {
      switch (metadata.media_type) {
        case "anime":
          return `Watching ${progressStr}`;
        case "manga":
        case "light_novel":
          return `Reading ${progressStr}`;
        default:
          return `Updating ${progressStr}`;
      }
    }

    // Default for other status/action types
    switch (metadata.media_type) {
      case "anime":
        return `Watched ${progressStr}`;
      case "manga":
      case "light_novel":
        return `Read ${progressStr}`;
      default:
        return `${status.charAt(0).toUpperCase() + status.slice(1)} ${progressStr}`;
    }
  }

  const statusColor = $derived(
    STATUS_COLORS[(post.metadata?.status || "updated").toLowerCase()] ||
      "var(--hako-accent)",
  );

  async function handleOpenEditor(id: number, type: string) {
    const mediaMap = await fetchMediaSummaries([id]);
    const media = mediaMap[id];
    if (media) openQuickEditor(media as any, type);
  }

  async function handleLike() {
    const user = await AuthService.getCurrentUser();
    if (!user) return;

    const previousState = isLiked;
    const previousCount = likeCount;

    // Optimistic UI update
    isLiked = !isLiked;
    likeCount = isLiked ? likeCount + 1 : likeCount - 1;

    const result = await FeedInteractionService.toggleLike(
      user.id,
      post.id,
      previousState,
    );

    if (result.success && result.data !== null && result.data !== undefined) {
      // Sync with the actual server count
      likeCount = result.data;
    } else {
      console.error("DEBUG: toggleLike failure:", result);
      isLiked = previousState;
      likeCount = previousCount;
      alert("Failed to update like.");
    }
  }
  async function handleShare() {
    const user = await AuthService.getCurrentUser();
    if (!user) return;
    const result = await FeedInteractionService.sharePost(user.id, post.id);
    if (result.success) alert("Post shared!");
  }
</script>

<div
  class="relative mt-6 bg-card shadow-md border border-(--surface-elevated)/50"
>
  <!-- Author Pill -->
  <div
    class="absolute -top-4 left-4 bg-(--surface-elevated) rounded-full px-3 py-1.5 flex items-center gap-2 border border-(--c8) shadow-lg z-10"
  >
    <button
      type="button"
      class="flex items-center gap-2 hover:opacity-80 transition-opacity"
      onclick={() => navigateToProfile(post.author?.username)}
    >
      <img
        src={HakoImage.get(post.author?.avatar_url)}
        class="object-cover w-6 h-6 rounded-full bg-slate-700"
        alt="avatar"
        onerror={(e: Event) => ((e.target as HTMLImageElement).src = "")}
      />
      <span class="text-xs font-bold text-(--hako-fg)">
        {post.author?.username || "User"}
      </span>
    </button>
    <span class="text-[10px] text-slate-400">
      {post.post_type === "list_update"
        ? post.metadata?.action || "updated their list"
        : "posted"}
      • {timeAgo}
    </span>
  </div>

  <div class="p-6 pt-8">
    {#if post.post_type === "thought"}
      <PostRenderer content={post.content || ""} />
      <div class="mt-4 flex items-center space-x-6 text-sm text-slate-500">
        <button
          class="min-w-12 cursor-pointer transition-colors outline-none focus:ring-0 {isLiked
            ? 'text-(--c9)'
            : 'hover:text-(--c9)'}"
          onclick={handleLike}
        >
          <i class="fa-solid fa-heart mr-2"></i>
          {likeCount}
        </button>
        <button
          class="min-w-12 cursor-pointer hover:text-accent transition-colors outline-none focus:ring-0 {showComments
            ? 'text-accent'
            : ''}"
          onclick={() => (showComments = !showComments)}
        >
          <i class="fa-solid fa-comment mr-2"></i>
          {commentCount}
        </button>
        <button
          class="min-w-12 cursor-pointer hover:text-(--c2) transition-colors outline-none focus:ring-0"
          onclick={handleShare}
          ><i class="fa-solid fa-share mr-2"></i>
          {shareCount}</button
        >
      </div>
      {#if showComments}
        <CommentSection
          postId={post.id}
          onCommentCountChange={(newCount: number) => (commentCount = newCount)}
        />
      {/if}
    {:else if post.post_type === "list_update" && post.metadata}
      {@const metadata = post.metadata}
      <div class="flex items-start gap-5">
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div class="shrink-0 w-22">
          <MediaCover
            mediaId={metadata.media_id ?? 0}
            type={metadata.media_type ?? "anime"}
            size="medium"
            class="w-20"
            alt={metadata.title ?? "Media"}
            showTooltip={true}
          />
        </div>
        <div class="flex flex-col justify-center gap-2 flex-1 min-w-0">
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <h4
            class="text-(--hako-fg) font-bold text-sm cursor-pointer hover:text-accent transition-colors line-clamp-1"
            onclick={() =>
              handleOpenEditor(
                metadata.media_id ?? 0,
                metadata.media_type ?? "anime",
              )}
          >
            <!-- Debug: {console.log('PostItem debug', { mediaInfo, title: metadata.title })} -->
            {#if mediaInfo}
              {getDisplayTitle(mediaInfo.title, settings.titlePreference)}
            {:else if metadata?.title && metadata.title !== "Unknown Title" && metadata.title !== "Untitled"}
              {metadata.title}
            {:else}
              <Skeleton type="text" class="w-32 h-5" />
            {/if}
          </h4>
          <p class="text-xs text-slate-400">
            {getVerb(metadata)}
          </p>
          <div
            class="w-full max-w-48 bg-(--c8)/20 h-1.5 rounded-full overflow-hidden"
          >
            <div
              class="h-full transition-all duration-1000 ease-out"
              style="width: {displayedPercent}%; background-color: {statusColor};"
            ></div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
