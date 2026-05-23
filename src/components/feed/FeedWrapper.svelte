<script lang="ts">
  import { FeedService } from "../../services/feedService";
  import PostItem from "./PostItem.svelte";
  import PostCreator from "./PostCreator.svelte";

  let { profileId = null, userId = null, mode = "global" } = $props();

  let posts: any[] = $state([]);
  let isLoading = $state(true);
  let isLoadingMore = $state(false);
  let page = $state(0);
  let hasMore = $state(true);
  let lastProfileId = $state<string | null>(null);
  let lastMode = $state<string | null>(null);
  let sentinelRef = $state<HTMLElement | null>(null);

  async function fetchPosts(isNewLoad = false) {
    if (isLoadingMore || (!hasMore && !isNewLoad)) return;

    if (isNewLoad) {
      page = 0;
      hasMore = true;
      isLoading = true;
    } else {
      isLoadingMore = true;
    }

    try {
      let result;
      if (profileId) {
        result = await FeedService.getPostsByProfile(profileId, page);
      } else if (mode === "circle" && userId) {
        result = await FeedService.getCircleFeed(userId, page);
      } else {
        result = await FeedService.getGlobalFeed(page);
      }

      if (result.success) {
        const newPosts = result.data;
        if (newPosts.length < 20) hasMore = false;

        if (isNewLoad) {
          posts = newPosts;
        } else {
          // Check for duplicates before appending
          const existingIds = new Set(posts.map((p) => p.id));
          const uniqueNewPosts = newPosts.filter((p) => !existingIds.has(p.id));
          posts = [...posts, ...uniqueNewPosts];
        }
        page++;
      } else {
        console.error("Error loading feed:", result.error);
        if (isNewLoad) posts = [];
      }
    } catch (err) {
      console.error("Error loading feed:", err);
    } finally {
      isLoading = false;
      isLoadingMore = false;
    }
  }

  async function loadPosts() {
    if (profileId === lastProfileId && mode === lastMode) return;
    lastProfileId = profileId;
    lastMode = mode;
    await fetchPosts(true);
  }

  // Refresh feed whenever the source props change
  $effect(() => {
    loadPosts();
  });

  // Observe sentinel to trigger infinite load
  $effect(() => {
    if (!sentinelRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && hasMore) {
          fetchPosts(false);
        }
      },
      { threshold: 0.1, rootMargin: "200px" },
    );

    observer.observe(sentinelRef);
    return () => observer.disconnect();
  });
</script>

<div class="space-y-6">
  {#if profileId}
    <PostCreator
      targetProfileId={profileId}
      onPostCreated={() => fetchPosts(true)}
    />
  {/if}

  {#if isLoading}
    <div class="flex items-center justify-center p-20">
      <i class="fa-solid fa-circle-notch fa-spin text-accent text-2xl"></i>
    </div>
  {:else if posts.length === 0}
    <p class="text-slate-500 text-sm p-4 text-center">
      This feed is currently stuck in filler episodes... ( ￣_￣)
    </p>
  {:else}
    {#each posts as post (post.id)}
      <PostItem {post} />
    {/each}

    <!-- Sentinel for IntersectionObserver -->
    <div bind:this={sentinelRef} class="h-10"></div>

    {#if isLoadingMore}
      <div class="flex items-center justify-center p-4">
        <i class="fa-solid fa-circle-notch fa-spin text-accent text-lg"></i>
      </div>
    {/if}
  {/if}
</div>
