<script>
  import { onMount } from "svelte";
  import { FeedService } from "../../services/feedService.js";
  import PostItem from "./PostItem.svelte";

  let { profileId = null, userId = null, mode = "global" } = $props();
  let posts = $state([]);
  let isLoading = $state(true);

  onMount(async () => {
    try {
      if (profileId) {
        posts = await FeedService.getPostsByProfile(profileId);
      } else if (mode === "circle" && userId) {
        posts = await FeedService.getCircleFeed(userId);
      } else {
        posts = await FeedService.getGlobalFeed();
      }
    } catch (err) {
      console.error("Error loading feed:", err);
    } finally {
      isLoading = false;
    }
  });
</script>

<div class="space-y-6">
  {#if isLoading}
    <p class="text-slate-500 text-sm p-4 text-center">Loading feed...</p>
  {:else if posts.length === 0}
    <p class="text-slate-500 text-sm p-4 text-center">No posts to display.</p>
  {:else}
    {#each posts as post (post.id)}
      <PostItem {post} />
    {/each}
  {/if}
</div>
