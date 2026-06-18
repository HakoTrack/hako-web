<script lang="ts">
  import { onDestroy, untrack } from "svelte";
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
  let sentinelRef = $state<HTMLElement | null>(null);

  let channel: RealtimeChannel | null = null;

  async function loadThread() {
    isLoading = true;
    error = null;

    const result = await ForumThreadService.getThreadById(threadId);
    if (result.success && result.data) {
      thread = result.data;
      ForumThreadService.incrementViewCount(threadId);
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
      isLoadingMore = true;
    }

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

    const result = await ForumPostService.createPost(
      user.id,
      threadId,
      content,
    );
    if (result.success) {
      posts = [...posts, result.data];
      if (thread) {
        thread.postCount += 1;
        thread.lastPostAt = result.data.createdAt;
        thread.lastPostAuthor = result.data.author;
      }
    }

    isSubmitting = false;
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
            .select("username, avatar_url")
            .eq("id", newPost.author_id)
            .single();

          const post: ForumPost = {
            id: newPost.id,
            threadId: newPost.thread_id,
            authorId: newPost.author_id,
            author: author ?? { username: "Unknown", avatar_url: null },
            content: newPost.content,
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

  // Infinite scroll observer
  $effect(() => {
    if (!sentinelRef || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && hasMore) {
          loadPosts(false);
        }
      },
      { threshold: 0.1, rootMargin: "200px" },
    );

    observer.observe(sentinelRef);
    return () => observer.disconnect();
  });

  onDestroy(() => {
    channel?.unsubscribe();
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
          {@const catColor = FORUM_CATEGORY_COLORS[thread.category.slug] || 'var(--c7)'}
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
      {#each posts as postItem (postItem.id)}
        <PostCard
          post={postItem}
          userId={user?.id}
          onPostEdited={handleEditPost}
        />
      {:else}
        <div class="text-center p-10 text-slate-500">
          <i class="fa-solid fa-comment-slash text-2xl mb-2"></i>
          <p>No posts yet. Be the first to reply!</p>
        </div>
      {/each}
    </div>

    <!-- Infinite scroll sentinel -->
    {#if hasMore}
      <div bind:this={sentinelRef} class="h-10"></div>
    {/if}

    {#if isLoadingMore}
      <div class="flex items-center justify-center p-4">
        <i class="fa-solid fa-circle-notch fa-spin text-accent text-lg"></i>
      </div>
    {/if}

    <!-- Reply composer -->
    {#if !thread.isLocked && user}
      <div class="mt-8">
        <PostComposer onSubmit={handleNewPost} {isSubmitting} />
      </div>
    {/if}

    {#if postId}
      {scrollToPost(postId)}
    {/if}
  {/if}
</div>
