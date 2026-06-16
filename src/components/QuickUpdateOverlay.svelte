<script lang="ts">
  import { HakoImage } from "../shared/utils/images";
  import type { QuickUpdateItem } from "../shared/types/index";
  import { fade, slide } from "svelte/transition";
  import { settings, getDisplayTitle } from "../core/settings.svelte";
  import { ui, openQuickEditor } from "../core/ui.svelte";
  import { ListService } from "../features/profile/services/listService";
  import { AuthService } from "../core/auth";

  let {
    isOpen = false,
    items = [],
    isLoading = false,
    onClose,
  } = $props<{
    isOpen: boolean;
    items: QuickUpdateItem[];
    isLoading: boolean;
    onClose: () => void;
  }>();

  // Track loading state for each image
  let loadedImages = $state<Record<number, boolean>>({});

  let categorizedItems = $derived(() => {
    const groups: Record<string, QuickUpdateItem[]> = {
      anime: [],
      manga: [],
      light_novel: [],
    };
    items.forEach((item: QuickUpdateItem) => {
      const type = item.media_type;
      if (groups[type]) {
        groups[type].push(item);
      }
    });
    return groups;
  });

  async function incrementProgress(e: MouseEvent, item: QuickUpdateItem) {
    e.preventDefault();
    e.stopPropagation();
    const user = await AuthService.getCurrentUser();
    if (!user) return;

    const media = item.metadata;
    const type = item.media_type;
    const newProgress = (item.progress || 0) + 1;
    const total = media.episodes || media.chapters;

    // Check if new progress exceeds total
    if (total && newProgress > total) return;

    const updates = {
      progress: newProgress,
      status: total === newProgress ? "completed" : item.status,
      total: total,
    };

    const result = await ListService.updateListEntry(
      user.id,
      type,
      item.media_id,
      updates,
      item,
    );
    if (result.success) {
      // Update local state for immediate feedback
      item.progress = newProgress;
      item.updated_at = new Date().toISOString();
      if (updates.status === "completed") {
        ui.quickUpdateItems = ui.quickUpdateItems.filter(
          (i) => i.media_id !== item.media_id,
        );
      }
    } else {
      console.error("Failed to update progress:", result.error);
      alert("Failed to update progress: " + result.error);
    }
  }

  function handleItemClick(item: QuickUpdateItem) {
    openQuickEditor(item.media_id, item.media_type);
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] transition-opacity"
    onclick={onClose}
    transition:fade={{ duration: 150 }}
  ></div>

  <div
    class="fixed top-15 left-0 w-full z-35 bg-(--hako-bg) border-b border-(--c8) shadow-2xl overflow-y-auto max-h-[85vh] origin-top"
    transition:slide={{ duration: 200 }}
  >
    <div class="max-w-375 mx-auto p-6 md:p-10">
      {#if isLoading && items.length === 0}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
          {#each ["Anime", "Manga", "Light Novels"] as label}
            <div class="flex flex-col">
              <h3
                class="text-[0.65rem] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6 pb-2 border-b border-(--c8)"
              >
                {label}
              </h3>
              <div class="space-y-1">
                {#each Array(3) as _}
                  <div class="p-2.5 flex items-center gap-4 animate-pulse">
                    <div
                      class="w-12 h-16 bg-(--surface-elevated) rounded shrink-0"
                    ></div>
                    <div class="grow space-y-3">
                      <div
                        class="h-3 bg-(--surface-elevated) rounded w-3/4"
                      ></div>
                      <div
                        class="h-1.5 bg-(--surface-elevated) rounded w-full"
                      ></div>
                    </div>
                    <div
                      class="w-8 h-8 bg-(--surface-elevated) rounded-lg shrink-0"
                    ></div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {:else if items.length === 0}
        <div class="text-center py-20 text-(--c8)">
          <i class="fa-solid fa-list-check text-4xl mb-4 block opacity-20"></i>
          <p class="text-sm font-medium">No titles currently in progress.</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
          {#each ["anime", "manga", "light_novel"] as type}
            {@const group = categorizedItems()[type]}
            {#if group.length > 0}
              <div class="flex flex-col">
                <h3
                  class="text-[0.65rem] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5 pb-2 border-b border-(--c8)"
                >
                  <i
                    class="fa-solid {type === 'anime'
                      ? 'fa-tv'
                      : type === 'manga'
                        ? 'fa-book'
                        : 'fa-book-open'} text-accent/60"
                  ></i>
                  {type === "light_novel" ? "Light Novels" : type}
                  <span class="ml-auto text-slate-600 font-mono"
                    >{group.length}</span
                  >
                </h3>
                <div class="space-y-1">
                  {#each group as item}
                    {@const media = item.metadata}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div
                      onclick={() => handleItemClick(item)}
                      class="w-full text-left p-2.5 rounded-lg hover:bg-(--surface) transition-all flex items-center gap-4 group relative cursor-pointer"
                    >
                      <div class="relative shrink-0 w-12 h-16">
                        {#if !loadedImages[media.media_id]}
                          <div
                            class="absolute inset-0 bg-(--surface-elevated) animate-pulse rounded"
                          ></div>
                        {/if}
                        <img
                          src={HakoImage.getCover(media.media_id, "small")}
                          alt={media.title.romaji}
                          class="w-full h-full object-cover rounded shadow-md group-hover:shadow-lg transition-all duration-300 {loadedImages[
                            media.media_id
                          ]
                            ? 'opacity-100'
                            : 'opacity-0'}"
                          onload={() => (loadedImages[media.media_id] = true)}
                        />
                      </div>

                      <div class="min-w-0 grow">
                        <div
                          class="text-sm font-semibold text-(--hako-fg) truncate group-hover:text-accent transition-colors"
                        >
                          {getDisplayTitle(
                            media.title,
                            settings.titlePreference,
                          )}
                        </div>
                        <div class="flex items-center gap-2 mt-2">
                          <div
                            class="grow bg-(--surface-elevated) h-1.5 rounded-full overflow-hidden"
                          >
                            <div
                              class="bg-(--c2) h-full transition-all duration-300"
                              style="width: {((item.progress ?? 0) /
                                (media.episodes || media.chapters || 100)) *
                                100}%"
                            ></div>
                          </div>
                          <span
                            class="text-[10px] font-mono text-slate-500 min-w-12 text-right"
                          >
                            {item.progress} / {media.episodes ||
                              media.chapters ||
                              "?"}
                          </span>
                        </div>
                      </div>
                      <!-- svelte-ignore a11y_consider_explicit_label -->
                      <button
                        type="button"
                        onclick={(e) => incrementProgress(e, item)}
                        class="shrink-0 w-8 h-8 rounded-lg bg-accent/10 text-accent hover:bg-accent hover:text-white transition-all flex items-center justify-center"
                      >
                        <i class="fa-solid fa-plus text-xs"></i>
                      </button>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}
