<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import { createWindowVirtualizer } from "@tanstack/svelte-virtual";
  import { supabase } from "../../core/supabase.js";
  import { AuthService } from "../../core/auth";
  import { ForumThreadService } from "./services/forumThreadService";
  import { ForumPostService } from "./services/forumPostService";
  import PostCard from "./components/PostCard.svelte";
  import PostComposer from "./components/PostComposer.svelte";
  import MediaSubject from "./components/MediaSubject.svelte";
  import type { ForumThread, ForumPost } from "../../shared/types";
  import type { RealtimeChannel } from "@supabase/supabase-js";
  import { FORUM_CATEGORY_COLORS } from "../../shared/utils/constants";
  import TimelineScroller from "./components/TimelineScroller.svelte";

  let { threadId, postId } = $props<{
    threadId: number;
    postId: number | null;
  }>();

  let thread = $state<ForumThread | null>(null);
  let posts = $state<ForumPost[]>([]);
  let user = $state<{ id: string; email?: string } | null>(null);
  let isLoading = $state(true);
  let isSubmitting = $state(false);
  let page = $state(0);
  let hasMore = $state(true);
  let isLoadingMore = $state(false);
  let error = $state<string | null>(null);
  let participants = $state<{ count: number; avatars: { username: string; avatar_url: string | null }[] }>({ count: 0, avatars: [] });
  let pendingReplies = $state<ForumPost[]>([]);
  let quoteContent = $state("");

  let avatars = $derived(
    Object.fromEntries(
      posts
        .filter((p) => p.author?.username)
        .map((p) => [p.author!.username, p.author?.avatar_url || ""]),
    ),
  );

  let channel: RealtimeChannel | null = null;

  async function loadThread() {
    isLoading = true;
    error = null;

    const result = await ForumThreadService.getThreadById(threadId);
    if (result.success && result.data) {
      thread = result.data;
      ForumThreadService.incrementViewCount(threadId);
      ForumThreadService.getThreadParticipants(threadId).then((p) => {
        participants = p;
      });
    } else {
      error = result.success ? "Thread not found." : result.error;
    }

    isLoading = false;
  }

  async function loadPosts(isNew = false) {
    if (isNew) {
      page = 0;
      hasMore = true;
    } else {
      if (isLoadingMore || !hasMore) return;
    }
    isLoadingMore = true;

    const result = await ForumPostService.getPostsByThread(
      threadId,
      isNew ? 0 : page,
      20,
      user?.id,
    );

    if (result.success) {
      if (isNew) {
        posts = result.data;
      } else {
        const existingIds = new Set(posts.map((p) => p.id));
        posts = [
          ...posts,
          ...result.data.filter((p) => !existingIds.has(p.id)),
        ];
      }

      if (result.data.length < 20) hasMore = false;
      page++;
    }

    isLoadingMore = false;
  }

  async function handleNewPost(content: string) {
    if (!user) return;
    isSubmitting = true;

    const replyToIds = pendingReplies.map((p) => p.id);
    const result = await ForumPostService.createPost(
      user.id,
      threadId,
      content,
      replyToIds,
    );
    if (result.success) {
      posts = [...posts, result.data];
      if (thread) {
        thread.postCount += 1;
        thread.lastPostAt = result.data.createdAt;
        thread.lastPostAuthor = result.data.author;
      }
    }

    pendingReplies = [];
    quoteContent = "";
    isSubmitting = false;
  }

  function handleReply(post: ForumPost) {
    pendingReplies = [...pendingReplies, post];
  }

  function handleQuote(post: ForumPost, content: string) {
    pendingReplies = [...pendingReplies, post];
    quoteContent = quoteContent
      ? `${quoteContent}\n\n${content}`
      : content;
  }

  function handleCancelReply() {
    pendingReplies = [];
    quoteContent = "";
  }

  async function handleEditPost(postId: number, content: string) {
    if (!user) return;

    const result = await ForumPostService.updatePost(postId, user.id, content);
    if (result.success) {
      posts = posts.map((p) =>
        p.id === postId
          ? { ...p, content, updatedAt: new Date().toISOString() }
          : p,
      );
    }
  }

  function scrollToPost(id: number | null) {
    if (!id) return;
    setTimeout(() => {
      const el = document.getElementById(`post-${id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function navigateBack() {
    window.history.pushState({}, "", "/forum");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  $effect(() => {
    if (!threadId) return;

    AuthService.getCurrentUser().then((u) => {
      user = u;
      loadThread();
      loadPosts(true);
    });
  });

  // Realtime subscription
  $effect(() => {
    if (!threadId) return;

    const tId = threadId;
    channel = supabase
      .channel(`forum-${tId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "forum_posts",
          filter: `thread_id=eq.${tId}`,
        },
        async (payload: any) => {
          const newPost = payload.new;
          const { data: author } = await supabase
            .from("profiles")
            .select("username, avatar_url, join_date, quote")
            .eq("id", newPost.author_id)
            .single();

          const post: ForumPost = {
            id: newPost.id,
            threadId: newPost.thread_id,
            authorId: newPost.author_id,
            author: author ?? {
              username: "Unknown",
              avatar_url: null,
              join_date: null,
              quote: null,
            },
            content: newPost.content,
            replyToIds: newPost.reply_to_ids || [],
            createdAt: newPost.created_at,
            updatedAt: newPost.updated_at,
            likesCount: 0,
            isLiked: false,
          };

          untrack(() => {
            const alreadyExists = posts.some((p) => p.id === post.id);
            if (!alreadyExists) {
              posts = [...posts, post];
            }
          });
        },
      )
      .subscribe();

    return () => {
      channel?.unsubscribe();
    };
  });

  // --- Virtualizer ---

  let postsContainer = $state<HTMLDivElement | null>(null);
  let scrollMargin = $state<number | null>(null);
  let measureQueued = false;

  function checkLoadMore() {
    if (!hasMore || isLoadingMore || !postsContainer) return;
    const rect = postsContainer.getBoundingClientRect();
    if (rect.bottom - window.innerHeight <= 400) {
      loadPosts(false);
    }
  }

  function measureScrollMargin() {
    if (!postsContainer) return;
    measureQueued = false;
    const rect = postsContainer.getBoundingClientRect();
    const newMargin = Math.round(rect.top + window.scrollY);
    if (scrollMargin === null || Math.abs(scrollMargin - newMargin) > 1) {
      scrollMargin = newMargin;
    }
    checkLoadMore();
  }

  function queueMeasure() {
    if (!measureQueued && postsContainer) {
      measureQueued = true;
      requestAnimationFrame(measureScrollMargin);
    }
  }

  $effect(() => {
    if (!postsContainer) return;
    measureScrollMargin();
    const observer = new ResizeObserver(() => queueMeasure());
    observer.observe(postsContainer);
    window.addEventListener("resize", queueMeasure);
    window.addEventListener("scroll", queueMeasure, {
      passive: true,
      capture: true,
    });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", queueMeasure);
      window.removeEventListener("scroll", queueMeasure, true);
    };
  });

  $effect(() => {
    posts;
    queueMeasure();
  });

  const virtualizer = createWindowVirtualizer({
    count: 0,
    estimateSize: () => 120,
    scrollMargin: 0,
    overscan: 5,
  });

  // Force store subscription early
  $effect(() => {
    untrack(() => $virtualizer);
  });

  let virtualItems = $state<any[]>([]);
  let totalSize = $state(0);
  let topSpacerHeight = $state(0);
  let bottomSpacerHeight = $state(0);

  // Effect 1: Update virtualizer options when inputs change
  $effect(() => {
    if (scrollMargin !== null) {
      untrack(() => $virtualizer).setOptions({
        count: Math.max(0, posts.length - 1),
        estimateSize: () => 120,
        scrollMargin,
        overscan: 5,
      });
    }
  });

  // Effect 2: Read virtualizer state (tracks store for scroll updates)
  $effect(() => {
    if (scrollMargin === null) {
      virtualItems = [];
      totalSize = 0;
      topSpacerHeight = 0;
      bottomSpacerHeight = 0;
      return;
    }
    const v = $virtualizer;
    const items = v.getVirtualItems();
    const size = v.getTotalSize();
    virtualItems = items;
    totalSize = size;
    topSpacerHeight =
      items.length > 0 ? Math.max(0, items[0].start - scrollMargin) : 0;
    const last = items[items.length - 1];
    bottomSpacerHeight = last
      ? Math.max(0, size - (last.start + last.size))
      : 0;
  });
</script>

<div class="max-w-280 mx-auto py-10 px-4">
  <button
    type="button"
    onclick={navigateBack}
    class="text-sm text-slate-400 hover:text-(--hako-fg) transition-colors mb-4 flex items-center gap-1.5"
  >
    <i class="fa-solid fa-arrow-left"></i>
    Back to Forum
  </button>

  {#if isLoading}
    <div class="flex items-center justify-center p-20">
      <i class="fa-solid fa-circle-notch fa-spin text-accent text-2xl"></i>
    </div>
  {:else if error}
    <div class="text-center p-10">
      <p class="text-slate-500 text-lg mb-2">
        <i class="fa-solid fa-exclamation-circle mr-2"></i>
        {error}
      </p>
      <p class="text-sm text-slate-600">This thread could not be found.</p>
    </div>
  {:else if thread}
    <div class="mb-6">
      <div class="flex items-center gap-3 mb-1">
        {#if thread.isPinned}
          <i class="fa-solid fa-thumbtack text-(--hako-accent) text-sm"></i>
        {/if}
        {#if thread.isLocked}
          <i class="fa-solid fa-lock text-slate-500 text-sm"></i>
        {/if}
        <h1 class="text-2xl font-bold text-(--hako-fg)">{thread.title}</h1>
        {#if thread.category}
          {@const catColor =
            FORUM_CATEGORY_COLORS[thread.category.slug] || "var(--c7)"}
          <span
            class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider leading-none shrink-0"
            style="background-color: color-mix(in srgb, {catColor} 13%, transparent); color: {catColor};"
          >
            {thread.category.name}
          </span>
        {/if}
      </div>
      <p class="text-xs text-slate-500">
        {thread.postCount} posts &middot; {thread.viewCount} views
      </p>
      {#if thread.subjectMedia}
        <div class="mt-4 max-w-md">
          <MediaSubject media={thread.subjectMedia} />
        </div>
      {/if}
    </div>

    {#if thread.isLocked}
      <div class="bg-card p-4 mb-6 text-center text-slate-500 text-sm">
        <i class="fa-solid fa-lock mr-2"></i>
        This thread is locked. No new replies can be posted.
      </div>
    {/if}

    <div class="space-y-4">
      {#if posts.length > 0}
        <!-- OP (first post) -->
        <PostCard
          post={posts[0]}
          userId={user?.id}
          allPosts={posts}
          onPostEdited={handleEditPost}
          onReply={handleReply}
          onQuote={handleQuote}
        />

        <!-- Info block -->
        <div class="flex items-center gap-6 text-xs text-slate-500 px-1 pb-2">
          <div class="flex items-center gap-1.5">
            <i class="fa-solid fa-eye text-slate-600"></i>
            <span>{thread.viewCount.toLocaleString()} views</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex -space-x-2">
              {#each participants.avatars.slice(0, 4) as p}
                {#if p.avatar_url}
                  <img
                    src={p.avatar_url}
                    alt={p.username}
                    class="w-6 h-6 rounded-full ring-2 ring-(--hako-bg) object-cover"
                  />
                {/if}
              {/each}
              {#if participants.count > 4}
                <div
                  class="w-6 h-6 rounded-full ring-2 ring-(--hako-bg) bg-(--surface-elevated) flex items-center justify-center text-[9px] font-bold text-slate-400"
                >
                  +{participants.count - 4}
                </div>
              {/if}
            </div>
            <span>{participants.count} participant{participants.count !== 1 ? 's' : ''}</span>
          </div>
        </div>
      {/if}

      <div bind:this={postsContainer} class="relative">
        {#if posts.length === 0}
          <div class="text-center p-10 text-slate-500">
            <i class="fa-solid fa-comment-slash text-2xl mb-2"></i>
            <p>No posts yet. Be the first to reply!</p>
          </div>
        {:else if posts.length > 1 && scrollMargin !== null}
          {@const v = $virtualizer}
          <div style="height: {topSpacerHeight}px"></div>
          {#each virtualItems as vitem (vitem.key)}
            <div data-index={vitem.index} use:v.measureElement class="pb-4">
              <PostCard
                post={posts[vitem.index + 1]}
                userId={user?.id}
                onPostEdited={handleEditPost}
                onReply={handleReply}
                onQuote={handleQuote}
                allPosts={posts}
              />
            </div>
          {/each}
          <div style="height: {bottomSpacerHeight}px"></div>
        {:else if posts.length > 1}
          <div class="space-y-4">
            {#each posts.slice(1) as postItem (postItem.id)}
              <PostCard
                post={postItem}
                userId={user?.id}
                onPostEdited={handleEditPost}
                onReply={handleReply}
                onQuote={handleQuote}
                allPosts={posts}
              />
            {/each}
          </div>
        {/if}

      {#if isLoadingMore}
        <div class="flex items-center justify-center p-4">
          <i class="fa-solid fa-circle-notch fa-spin text-accent text-lg"></i>
        </div>
      {/if}
    </div>
    </div>

    {#if scrollMargin !== null}
      <TimelineScroller scrollMargin={scrollMargin} {totalSize} />
    {/if}

    <!-- Reply composer -->
    {#if !thread.isLocked && user}
      <div class="mt-8">
        <PostComposer
          onSubmit={handleNewPost}
          {isSubmitting}
          replyToPosts={pendingReplies}
          initialContent={quoteContent}
          {avatars}
          onCancelReply={handleCancelReply}
        />
      </div>
    {/if}

    {#if postId}
      {scrollToPost(postId)}
    {/if}
  {/if}
</div>
