<script>
  import { HakoImage } from "../../utils/images.ts";
  import { openQuickEditor } from "../../core/ui.svelte.ts";
  import { fetchMediaById } from "../../utils/mediaData";
  import { FeedInteractionService } from "../../services/feedInteractionService";
  import { AuthService } from "../../core/auth";

  let { post } = $props();
  let isLiked = $state(false);

  // Extract counts (Direct integer columns)
  let likeCount = $state(post.likes_count || 0);
  let commentCount = $state(post.comments_count || 0);
  let shareCount = $state(post.shares_count || 0);

  $effect(() => {
    AuthService.getCurrentUser().then((user) => {
      if (user) {
        // 'likes' property contains the array of user_id objects for checking if *we* liked it
        isLiked = post.likes.some((l) => l.user_id === user.id);
      }
    });
  });

  // Robust progress calculation with null checks
  const percent = $derived(
    post.post_type === "list_update" && post.metadata?.total > 0
      ? Math.round((post.metadata.progress / post.metadata.total) * 100)
      : 0,
  );

  function getRelativeTime(timestamp) {
    if (!timestamp) return "Recently";
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const diff = new Date(timestamp) - new Date();
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

  async function handleOpenEditor(id) {
    const media = await fetchMediaById(id);
    if (media) openQuickEditor(media, "anime");
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

    console.log("DEBUG: toggleLike RPC result.data:", result.data);

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

<div class="bg-card rounded-xl overflow-hidden shadow-md">
  <div class="p-4 border-b border-slate-800 flex items-center justify-between">
    <div class="flex items-center space-x-3">
      <img
        src={HakoImage.get(post.author?.avatar_url, { w: 32, f: "webp" })}
        class="object-cover w-8 h-8 rounded-lg bg-slate-700"
        alt="avatar"
        onerror={(e) => (e.target.src = "")}
      />
      <div>
        <p class="text-sm font-semibold text-white">
          {post.author?.username || "User"}
          <span class="text-slate-500 font-normal">
            {post.post_type === "list_update"
              ? post.metadata?.action || "updated their list"
              : "posted a thought"}
          </span>
        </p>
        <p class="text-[10px] text-slate-500 uppercase">{timeAgo}</p>
      </div>
    </div>
  </div>

  <div class="p-6">
    {#if post.post_type === "thought"}
      <p class="text-slate-200 leading-relaxed">{post.content}</p>
      <div class="mt-6 flex items-center space-x-6 text-sm text-slate-500">
        <button
          class="cursor-pointer transition-colors {isLiked
            ? 'text-pink-500'
            : 'hover:text-pink-500'}"
          onclick={handleLike}
        >
          <i class="fa-solid fa-heart mr-2"></i>
          {likeCount}
        </button>
        <button class="cursor-pointer hover:text-accent transition-colors"
          ><i class="fa-solid fa-comment mr-2"></i>
          {commentCount}</button
        >
        <button
          class="cursor-pointer hover:text-green-500 transition-colors"
          onclick={handleShare}
          ><i class="fa-solid fa-share mr-2"></i>
          {shareCount}</button
        >
      </div>
    {:else if post.post_type === "list_update" && post.metadata}
      <div class="flex items-center">
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <img
          loading="lazy"
          src={HakoImage.getCover(post.metadata.media_id, "small")}
          onclick={() => handleOpenEditor(post.metadata.media_id)}
          class="media-cover w-16 h-24 rounded shadow-lg object-cover cursor-pointer hover:scale-105 transition-transform bg-[#151f2e]"
          data-media-id={post.metadata.media_id}
          alt={post.metadata.title}
          onerror={(e) =>
            (e.target.src =
              "https://ik.imagekit.io/HakoImage/covers/placeholder.jpg?tr=w-240,f=webp")}
        />
        <div class="ml-4 flex-1">
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <h4
            class="text-white font-bold leading-tight cursor-pointer hover:text-accent transition-colors"
            onclick={() => handleOpenEditor(post.metadata.media_id)}
          >
            {post.metadata.title}
          </h4>
          <p class="text-sm text-slate-400 mt-1">
            {post.metadata.action || "Watched"} episode
            <span class="text-accent font-bold"
              >{post.metadata.progress || 0}/{post.metadata.total || "?"}</span
            >
          </p>
          <div
            class="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden"
          >
            <div
              class="bg-accent h-full transition-all duration-500"
              style="width: {percent}%"
            ></div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
