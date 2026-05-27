<script lang="ts">
  let { mediaType } = $props<{
    mediaType: "anime" | "manga" | "light_novel";
  }>();
</script>

<section>
  <h2 class="text-2xl font-bold text-(--hako-fg) mb-6">Trending</h2>
  <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
    {#each Array(6) as _}
      <div
        class="bg-card h-64 rounded-lg border border-(--surface-elevated) animate-pulse"
      ></div>
    {/each}
  </div>
</section>
