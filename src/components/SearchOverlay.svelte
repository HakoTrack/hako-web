<script lang="ts">
  import { HakoImage } from "../shared/utils/images";
  import type { Media } from "../shared/types/index";
  import { fade, slide } from "svelte/transition";
  import { settings, getDisplayTitle } from "../core/settings.svelte";

  let {
    results = [],
    isOpen = false,
    isSearching = false,
    query = "",
    onClose,
    onSelect,
  } = $props<{
    results: Media[];
    isOpen: boolean;
    isSearching: boolean;
    query: string;
    onClose: () => void;
    onSelect: (media: Media) => void;
  }>();

  function getMediaType(media: Media) {
    if (media.media_type === "light_novel") return "lightnovel";
    return media.media_type || "anime";
  }

  let categorizedResults = $derived(() => {
    const groups: Record<string, Media[]> = {
      anime: [],
      manga: [],
      lightnovel: [],
    };
    results.forEach((m: Media) => {
      const type = getMediaType(m);
      groups[type].push(m);
    });
    return groups;
  });

  let hasResults = $derived(results.length > 0);
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
      {#if !hasResults && !isSearching}
        {#if query.length < 2}
          <div class="text-center py-20 text-(--c8)">
            <i class="fa-solid fa-keyboard text-4xl mb-4 block opacity-20"></i>
            <p class="text-sm font-medium">
              Type at least 2 characters to search...
            </p>
          </div>
        {:else}
          <div class="text-center py-20 text-(--c8)">
            <i
              class="fa-solid fa-magnifying-glass text-4xl mb-4 block opacity-20"
            ></i>
            <p class="text-sm font-medium">No results found for "{query}"</p>
          </div>
        {/if}
      {:else if isSearching && !hasResults}
        <div class="text-center py-20 text-(--c8)">
          <i
            class="fa-solid fa-circle-notch fa-spin text-4xl mb-4 block opacity-20"
          ></i>
          <p class="text-sm font-medium">Searching for "{query}"...</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
          {#each ["anime", "manga", "lightnovel"] as type}
            {@const group = categorizedResults()[type]}
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
                  {type === "lightnovel" ? "Light Novels" : type}
                  <span class="ml-auto text-slate-600 font-mono"
                    >{group.length}</span
                  >
                </h3>
                <div class="space-y-1">
                  {#each group as media}
                    <button
                      type="button"
                      onclick={() => onSelect(media)}
                      class="w-full text-left p-2.5 rounded-lg hover:bg-(--surface-elevated) transition-all flex items-center gap-4 group relative cursor-pointer"
                    >
                      <div class="relative shrink-0">
                        <img
                          src={HakoImage.getCover(media.media_id, "small")}
                          alt={media.title.romaji}
                          class="w-12 h-16 object-cover rounded shadow-md group-hover:shadow-lg transition-shadow"
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
                        <div
                          class="text-[10px] text-slate-500 truncate mt-0.5 flex flex-wrap gap-1.5"
                        >
                          {#each (media.genres ?? []).slice(0, 5) as genre}
                            <span>{genre}</span>
                            {#if genre !== (media.genres ?? []).slice(0, 5).at(-1)}
                              <span class="opacity-30">•</span>
                            {/if}
                          {/each}
                        </div>
                        <div class="flex items-center gap-2.5 mt-2">
                          <span
                            class="text-[9px] px-1.5 py-0.5 bg-(--surface) border border-(--c8) rounded-md text-slate-400 font-bold uppercase tracking-wider"
                          >
                            {media.format?.replace("_", " ")}
                          </span>
                          {#if media.seasonYear}
                            <span class="text-[10px] text-slate-500 font-medium"
                              >{media.seasonYear}</span
                            >
                          {/if}
                        </div>
                      </div>
                      <div
                        class="opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 text-accent"
                      >
                        <i class="fa-solid fa-arrow-right text-xs"></i>
                      </div>
                    </button>
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
