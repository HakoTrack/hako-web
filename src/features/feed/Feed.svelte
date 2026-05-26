<script>
  import FeedWrapper from "./components/FeedWrapper.svelte";
  let { user } = $props();
</script>

<div class="max-w-250 mx-auto py-12 px-4">
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

  <FeedWrapper userId={user?.id} mode="global" />
</div>
