<script lang="ts">
  import { toasts } from "$utils/toast";
  import ToastItem from "./ToastItem.svelte";
</script>

<div
  class="fixed bottom-4 left-1/2 -translate-x-1/2 z-9999 flex flex-col gap-2 pointer-events-none"
>
  {#each $toasts as toast (toast.id)}
    <ToastItem {toast} />
  {/each}
</div>
