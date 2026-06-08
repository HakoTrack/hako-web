<script lang="ts">
  let { type = "input", class: className = "" } = $props<{
    type?: "input" | "text";
    class?: string;
  }>();
</script>

{#if type === "input"}
  <div
    class="w-full h-10 bg-(--surface-elevated) animate-pulse rounded-xl {className}"
  ></div>
{:else}
  <div
    class="w-full h-4 bg-(--surface-elevated) animate-pulse rounded {className}"
  ></div>
{/if}
