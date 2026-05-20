<script>
  import { FeedService } from "../../services/feedService.ts";
  import PostItem from "./PostItem.svelte";
  import PostCreator from "./PostCreator.svelte";

  let { profileId = null, userId = null, mode = "global" } = $props();

  let posts = $state([]);
  let isLoading = $state(true);
  let lastProfileId = $state(null);

  async function loadPosts() {
    // Prevent double-fetch/flash if ID hasn't changed
    if (profileId && profileId === lastProfileId) return;

    isLoading = true;
    lastProfileId = profileId;
    try {
      let result;
      if (profileId) {
        result = await FeedService.getPostsByProfile(profileId);
      } else if (mode === "circle" && userId) {
        result = await FeedService.getCircleFeed(userId);
      } else {
        result = await FeedService.getGlobalFeed();
      }

      if (result.success) {
        posts = result.data;
      } else {
        console.error("Error loading feed:", result.error);
        posts = [];
      }
    } catch (err) {
      console.error("Error loading feed:", err);
    } finally {
      isLoading = false;
    }
  }

  // Refresh feed whenever the source props change
  $effect(() => {
    loadPosts();
  });
</script>

<div class="space-y-6">
  {#if profileId}
    <PostCreator targetProfileId={profileId} onPostCreated={loadPosts} />
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
  {/if}
</div>
