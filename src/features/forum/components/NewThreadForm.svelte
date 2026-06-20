<script lang="ts">
  import { HakoImage } from "../../../shared/utils/images";
  import { MediaService } from "../../media/services/mediaService";
  import MediaSubject from "./MediaSubject.svelte";
  import Select from "../../../shared/components/Select.svelte";
  import TextInput from "../../../shared/components/TextInput.svelte";
  import type { ForumCategory, Media } from "../../../shared/types";

  let { categories, onCreateThread, onCancel } = $props<{
    categories: ForumCategory[];
    onCreateThread: (
      categoryId: number,
      title: string,
      content: string,
      mediaId?: number | null,
    ) => void;
    onCancel: () => void;
  }>();

  let title = $state("");
  let content = $state("");
  let selectedCategoryId = $state<number | null>(null);
  let selectedMedia = $state<Media | null>(null);
  let searchQuery = $state("");
  let searchResults = $state<Media[]>([]);
  let isSearching = $state(false);
  let showResults = $state(false);
  let isSubmitting = $state(false);

  let searchTimeout: ReturnType<typeof setTimeout>;

  let isValid = $derived(
    title.trim().length > 1 &&
      content.trim().length > 0 &&
      selectedCategoryId !== null,
  );

  let categoryItems = $derived(
    categories.map((c: ForumCategory) => ({ value: String(c.id), label: c.name })),
  );

  let categoryValue = $state("");

  function handleCategoryChange(v: any) {
    categoryValue = v;
    selectedCategoryId = v ? Number(v) : null;
  }

  function handleSearchInput() {
    clearTimeout(searchTimeout);
    if (searchQuery.length < 2) {
      searchResults = [];
      showResults = false;
      return;
    }
    isSearching = true;
    showResults = true;
    searchTimeout = setTimeout(async () => {
      try {
        const result = await MediaService.searchMedia(searchQuery);
        if (result.success) {
          searchResults = result.data.slice(0, 8);
        }
      } catch {
        searchResults = [];
      } finally {
        isSearching = false;
      }
    }, 250);
  }

  function selectMedia(media: Media) {
    selectedMedia = media;
    searchQuery = "";
    searchResults = [];
    showResults = false;
  }

  function removeMedia() {
    selectedMedia = null;
  }

  async function handleSubmit() {
    if (!isValid || !selectedCategoryId || isSubmitting) return;
    isSubmitting = true;
    onCreateThread(
      selectedCategoryId,
      title.trim(),
      content.trim(),
      selectedMedia?.media_id,
    );
  }
</script>

<div class="bg-card shadow-md p-6">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-lg font-bold text-(--hako-fg)">New Thread</h2>
    <button
      type="button"
      onclick={onCancel}
      class="text-sm text-slate-400 hover:text-(--hako-fg) transition-colors"
    >
      <i class="fa-solid fa-times mr-1"></i> Cancel
    </button>
  </div>

  <div class="space-y-4">
    <div>
      <TextInput bind:value={title} placeholder="Thread title..." label="Title" />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <Select
        items={categoryItems}
        value={categoryValue}
        onchange={handleCategoryChange}
        label="Category"
      />

      <div>
        <label
          class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5"
        >
          Subject (optional)
          <div class="relative mt-1">
            {#if selectedMedia}
              <MediaSubject media={selectedMedia} onRemove={removeMedia} />
            {:else}
              <input
                type="text"
                bind:value={searchQuery}
                oninput={handleSearchInput}
                onfocus={() => {
                  if (searchResults.length > 0) showResults = true;
                }}
                onblur={() => setTimeout(() => (showResults = false), 200)}
                placeholder="Search media..."
                class="w-full bg-(--hako-bg) border border-(--surface-elevated) rounded-lg px-3 py-2.5 text-sm text-(--hako-fg) focus:ring-1 focus:ring-(--hako-accent) outline-none"
              />
              {#if showResults && searchQuery.length >= 2}
                <div
                  class="absolute z-20 mt-1 w-full bg-(--surface) border border-(--surface-elevated) rounded-lg shadow-xl max-h-60 overflow-y-auto"
                >
                  {#if isSearching}
                    <div class="p-3 text-center text-sm text-slate-500">
                      <i class="fa-solid fa-circle-notch fa-spin mr-2"
                      ></i>Searching...
                    </div>
                  {:else if searchResults.length === 0}
                    <div class="p-3 text-center text-sm text-slate-500">
                      No results found.
                    </div>
                  {:else}
                    {#each searchResults as result}
                      <button
                        type="button"
                        onclick={() => selectMedia(result)}
                        class="w-full flex items-center gap-3 px-3 py-2 hover:bg-(--surface-elevated)/30 transition-colors text-left"
                      >
                        <img
                          src={HakoImage.getCover(result.media_id, "small")}
                          class="w-8 h-11 rounded object-cover bg-slate-700 shrink-0"
                          alt=""
                          onerror={(e: Event) =>
                            ((e.target as HTMLImageElement).style.display =
                              "none")}
                        />
                        <div class="min-w-0">
                          <div class="text-sm text-(--hako-fg) truncate">
                            {result.title.romaji ||
                              result.title.english ||
                              "Untitled"}
                          </div>
                          <div class="text-xs text-slate-500">
                            {result.format || ""}
                            {#if result.seasonYear}
                              &middot; {result.seasonYear}{/if}
                          </div>
                        </div>
                      </button>
                    {/each}
                  {/if}
                </div>
              {/if}
            {/if}
          </div>
        </label>
      </div>
    </div>

    <div>
      <label
        class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5"
      >
        Content
        <textarea
          bind:value={content}
          placeholder="Write your post content... Markdown is supported."
          class="w-full bg-(--hako-bg) border border-(--surface-elevated) rounded-lg p-3 text-sm text-(--hako-fg) focus:ring-1 focus:ring-(--hako-accent) outline-none min-h-40 resize-y mt-1"
        ></textarea>
      </label>
    </div>

    <div class="flex justify-end gap-3 pt-2">
      <button
        type="button"
        onclick={onCancel}
        class="px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 bg-white/5 text-(--hako-fg) border border-white/10 hover:bg-white/10"
      >
        Cancel
      </button>
      <button
        type="button"
        onclick={handleSubmit}
        disabled={!isValid || isSubmitting}
        class="px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed bg-(--hako-accent) text-(--hako-bg) hover:opacity-90"
      >
        {#if isSubmitting}
          <i class="fa-solid fa-circle-notch fa-spin mr-2"></i>
        {/if}
        Create Thread
      </button>
    </div>
  </div>
</div>
