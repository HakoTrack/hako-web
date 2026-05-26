<script>
  import { ListService } from "../features/profile/services/listService";
  import MediaCover from "../shared/components/MediaCover.svelte";
  import { ui } from "../core/ui.svelte.ts";

  let { isOpen, onToggle, profileId } = $props();
  let sections = $state({
    anime: [],
    manga: [],
    light_novel: [],
  });

  function handleKeydown(event) {
    // Only close if Escape was pressed, drawer is open,
    // AND no modal is currently active.
    if (event.key === "Escape" && isOpen && ui.activeModal === null) {
      onToggle(false);
    }
  }

  $effect(() => {
    if (isOpen && profileId) {
      const types = ["anime", "manga", "light_novel"];
      types.forEach((type) => {
        ListService.getList(profileId, type).then((res) => {
          if (res.success) {
            sections[type] = res.data.filter(
              (item) => item.status === "current",
            );
          }
        });
      });
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Portal-style fixed container, detached from document flow -->
<div class="fixed inset-y-0 right-0 z-90 flex justify-end pointer-events-none">
  <!-- Sliding Assembly: Button + Content in one unit -->
  <div
    class="relative h-full bg-(--surface) border-l border-(--c8) shadow-2xl transition-transform duration-300 ease-in-out flex pointer-events-auto"
    style="transform: translateX({isOpen ? '0' : '100%'}); width: 56rem;"
  >
    <!-- Attached Pull Tab -->
    <button
      onclick={() => onToggle(!isOpen)}
      class="absolute -left-12 bottom-20 w-12 h-20 bg-(--hako-accent) text-(--hako-bg) flex items-center justify-center font-bold shadow-lg rounded-l-lg hover:brightness-110 transition-colors z-91 focus:outline-0"
      aria-label="Toggle list drawer"
    >
      <i class="fa-solid {isOpen ? 'fa-times' : 'fa-pen'}"></i>
    </button>
    <!-- Drawer Content -->
    <div class="grow h-full overflow-y-auto p-8 text-(--hako-fg)">
      <div class="mb-8 border-b border-(--c8) pb-4">
        <h2 class="text-(--hako-fg) text-2xl font-bold">Quick Update</h2>
      </div>

      {#each Object.entries(sections) as [type, items]}
        {#if items.length > 0}
          <div class="mb-8">
            <h3
              class="text-(--hako-accent) uppercase tracking-wider text-sm font-semibold mb-4"
            >
              {type}
            </h3>
            <div class="grid grid-cols-5 gap-4">
              {#each items as item}
                <div class="flex flex-col gap-2">
                  <MediaCover mediaId={item.media_id} {type} size="medium" />
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {:else}
        <p class="text-(--c8) text-center py-8">No current items found.</p>
      {/each}
    </div>
  </div>
</div>
