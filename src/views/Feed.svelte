<script>
  import { onMount } from "svelte";
  import { populateActivityFeed } from "../features/populateFeed.js";

  export let user = null;

  $: username = user?.email?.split("@")[0] || "shaetsu";

  onMount(async () => {
    await populateActivityFeed(username);
  });
</script>

<div class="max-w-[1000px] mx-auto py-12 px-4">
  <div class="flex items-center justify-between mb-8">
    <h1 class="text-3xl font-bold text-white">Activity Feed</h1>
    <div class="flex space-x-2">
      <button
        class="bg-card text-xs font-bold text-accent px-3 py-1 rounded border border-accent/20"
        >Global</button
      >
      <button
        class="bg-card text-xs font-bold text-slate-500 px-3 py-1 rounded border border-slate-800"
        >Following</button
      >
    </div>
  </div>

  <div id="activity-feed-container" class="space-y-6">
    <div class="bg-card p-6 rounded-xl shadow-md animate-pulse">
      <div class="flex items-center space-x-3 mb-4">
        <div class="w-8 h-8 rounded-lg bg-slate-800"></div>
        <div class="h-4 bg-slate-800 rounded w-1/4"></div>
      </div>
      <div class="h-24 bg-slate-800 rounded mb-4"></div>
    </div>
  </div>
</div>
