<script lang="ts">
  import { ui, closeModal } from "../../../core/ui.svelte";
  import { MediaService } from "../../media/services/mediaService";
  import { HakoImage } from "../../../shared/utils/images";
  import { getDisplayTitle, settings } from "../../../core/settings.svelte";
  import { CollectionService } from "../services/collectionService";
  import type {
    Media,
    CollectionDetail,
    CollectionEntrySummary,
  } from "../../../shared/types";

  let { entry: rawEntry }: { entry?: CollectionDetail | null } = $props();

  let collection = $derived(rawEntry ?? ui.modalData?.entry ?? null);

  function entryToMedia(e: CollectionEntrySummary): Media {
    return {
      media_id: e.media_id,
      media_type: e.media_type as Media["media_type"],
      title: {
        romaji: e.title_romaji,
        english: e.title_english,
        native: e.title_native,
      },
      description: "",
      format: e.format,
      source: null,
      status: "",
      episodes: e.episodes,
      chapters: e.chapters,
      volumes: e.volumes,
      duration: null,
      season: null,
      seasonYear: null,
      genres: [],
      tags: [],
      tags_v2: [],
      externalLinks: [],
      startDate: { year: null, month: null, day: null },
      endDate: { year: null, month: null, day: null },
    };
  }

  let title = $state(collection?.title ?? "");
  let description = $state(collection?.description ?? "");
  let entries = $state<{ media: Media; notes: string }[]>(
    collection?.entries?.map((e: CollectionEntrySummary) => ({
      media: entryToMedia(e),
      notes: e.notes ?? "",
    })) ?? [],
  );

  let saving = $state(false);
  let error = $state<string | null>(null);
  let searchQuery = $state("");
  let searchResults = $state<Media[]>([]);
  let isSearching = $state(false);
  let showResults = $state(false);
  let searchTimeout: ReturnType<typeof setTimeout>;
  let searchInputEl = $state<HTMLInputElement | null>(null);

  let dropdownStyle = $derived.by(() => {
    if (!showResults || !searchInputEl) return {};
    const rect = searchInputEl.getBoundingClientRect();
    return `position: fixed; top: ${rect.bottom + 4}px; left: ${rect.left}px; width: ${rect.width}px; z-index: 100;`;
  });

  let isEdit = $derived(!!collection);

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
          const existingIds = new Set(entries.map((e) => e.media.media_id));
          searchResults = result.data
            .filter((r) => !existingIds.has(r.media_id))
            .slice(0, 8);
        }
      } catch {
        searchResults = [];
      } finally {
        isSearching = false;
      }
    }, 250);
  }

  function selectMedia(media: Media) {
    entries = [...entries, { media, notes: "" }];
    searchQuery = "";
    searchResults = [];
    showResults = false;
  }

  function removeEntry(index: number) {
    entries = entries.filter((_, i) => i !== index);
  }

  function updateEntryNotes(index: number, notes: string) {
    entries = entries.map((e, i) => (i === index ? { ...e, notes } : e));
  }

  let derivedType = $derived.by(() => {
    const types = new Set(entries.map((e) => e.media.media_type as string));
    if (types.size === 0) return null;
    if (types.size === 1) {
      const t = [...types][0];
      return t === "visual_novels" ? "visual_novel" : t;
    }
    return "mixed";
  });

  let typeLabel = $derived(
    derivedType
      ? ({
          anime: "Anime",
          manga: "Manga",
          light_novel: "Light Novel",
          visual_novel: "Visual Novel",
          mixed: "Mixed",
        }[derivedType] ?? derivedType)
      : null,
  );

  function handleBodyScroll() {
    showResults = false;
  }

  async function handleSubmit() {
    if (!title.trim()) {
      error = "Title is required";
      return;
    }
    if (entries.length === 0) {
      error = "Add at least one media entry";
      return;
    }

    saving = true;
    error = null;

    const input = {
      title: title.trim(),
      description: description.trim() || undefined,
      entries: entries.map((e, i) => ({
        media_id: e.media.media_id,
        position: i,
        notes: e.notes || undefined,
      })),
    };

    let result;
    let newId: string | undefined;
    if (isEdit && collection) {
      result = await CollectionService.update(collection.id, input);
    } else {
      result = await CollectionService.create(input);
      if (result.success) newId = result.data.collection_id;
    }

    saving = false;

    if (result.success) {
      ui.modalData?.onSaved?.(newId);
      closeModal();
    } else {
      error = result.error;
    }
  }
</script>

<div
  class="bg-(--surface) w-160 max-w-[95dvw] max-h-[95dvh] rounded-2xl shadow-2xl border border-(--surface-elevated) flex flex-col overflow-hidden"
>
  <!-- Header -->
  <div
    class="flex items-center justify-between px-6 py-4 border-b border-(--surface-elevated) shrink-0"
  >
    <h2 class="text-lg font-bold text-(--hako-fg)">
      {isEdit ? "Edit Collection" : "Create Collection"}
    </h2>
    <button
      onclick={closeModal}
      class="text-slate-400 hover:text-(--hako-fg) p-1 cursor-pointer"
    >
      <i class="fa-solid fa-xmark text-xl"></i>
    </button>
  </div>

  <!-- Body -->
  <div class="p-6 space-y-5 overflow-y-auto flex-1" onscroll={handleBodyScroll}>
    <!-- Title -->
    <div>
      <label
        class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5"
        >Title</label
      >
      <input
        type="text"
        bind:value={title}
        placeholder="My curated list"
        class="w-full h-10 bg-(--surface-dim) border border-(--c8) rounded-xl px-3 text-sm text-(--hako-fg) placeholder:text-(--c8) focus:border-(--hako-accent) outline-none"
      />
    </div>

    <!-- Description -->
    <div>
      <label
        class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5"
        >Description</label
      >
      <textarea
        bind:value={description}
        placeholder="A collection of must-watch titles..."
        rows={3}
        class="w-full bg-(--surface-dim) border border-(--c8) rounded-xl px-3 py-2 text-sm text-(--hako-fg) placeholder:text-(--c8) focus:border-(--hako-accent) outline-none resize-none"
      ></textarea>
    </div>

    <!-- Type feedback -->
    {#if typeLabel}
      <div class="flex items-center gap-2 text-xs text-slate-400">
        <span class="font-semibold uppercase tracking-wider">Type:</span>
        <span
          class="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-semibold"
        >
          {typeLabel}
        </span>
      </div>
    {/if}

    <!-- Media search -->
    <div class="relative">
      <label
        class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5"
        >Add Media</label
      >
      <input
        type="text"
        bind:this={searchInputEl}
        bind:value={searchQuery}
        oninput={handleSearchInput}
        onfocus={() => {
          if (searchResults.length > 0) showResults = true;
        }}
        onblur={() => setTimeout(() => (showResults = false), 200)}
        placeholder="Search by title..."
        class="w-full bg-(--surface-dim) border border-(--c8) rounded-xl px-3 py-2.5 text-sm text-(--hako-fg) placeholder:text-(--c8) focus:border-(--hako-accent) outline-none"
      />

      {#if showResults && (isSearching || searchResults.length > 0)}
        <div
          class="bg-(--surface-elevated) border border-(--c8) rounded-xl shadow-xl max-h-64 overflow-y-auto"
          style={dropdownStyle}
        >
          {#if isSearching}
            <div class="p-3 text-xs text-slate-400 text-center">
              Searching...
            </div>
          {:else}
            {#each searchResults as result (result.media_id)}
              <button
                onmousedown={() => selectMedia(result)}
                class="w-full flex items-center gap-3 p-2.5 hover:bg-(--surface-dim) text-left transition-colors cursor-pointer"
              >
                <img
                  src={HakoImage.getCover(result.media_id, "small")}
                  class="w-7 h-10 rounded object-cover shrink-0 bg-slate-700"
                  alt=""
                />
                <div class="min-w-0 flex-1">
                  <div class="text-sm text-(--hako-fg) truncate">
                    {getDisplayTitle(result.title, settings.titlePreference)}
                  </div>
                  <div class="text-[11px] text-slate-500">
                    {result.format} &middot; {result.media_type.replace("_", " ")}
                  </div>
                </div>
              </button>
            {/each}
          {/if}
        </div>
      {/if}
    </div>

    <!-- Media entries -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Entries ({entries.length})
        </span>
      </div>

      {#if entries.length > 0}
        <div class="space-y-2">
          {#each entries as entry, i (entry.media.media_id)}
            <div class="bg-(--surface-dim) rounded-xl border border-(--c8) p-3">
              <div class="flex items-center gap-3">
                <img
                  src={HakoImage.getCover(entry.media.media_id, "small")}
                  class="w-8 h-11 rounded object-cover shrink-0 bg-slate-700"
                  alt=""
                />
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-(--hako-fg) truncate">
                    {getDisplayTitle(
                      entry.media.title,
                      settings.titlePreference,
                    )}
                  </div>
                  <div class="text-[11px] text-slate-500">
                    {entry.media.format}
                  </div>
                </div>
                <button
                  onclick={() => removeEntry(i)}
                  class="text-xs text-slate-500 hover:text-red-400 shrink-0 cursor-pointer"
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
              <input
                type="text"
                placeholder="Notes about this title (optional)"
                value={entry.notes}
                oninput={(e) =>
                  updateEntryNotes(i, (e.target as HTMLInputElement).value)}
                class="mt-2 w-full bg-(--hako-bg) rounded-lg px-2.5 py-1.5 text-xs text-(--hako-fg) placeholder:text-(--c8) border border-(--surface-elevated) outline-none focus:border-(--hako-accent)"
              />
            </div>
          {/each}
        </div>
      {/if}
    </div>

    {#if error}
      <p class="text-xs text-red-400">{error}</p>
    {/if}
  </div>

  <!-- Footer -->
  <div
    class="px-6 py-4 border-t border-(--surface-elevated) bg-(--surface) flex justify-end items-center gap-3 shrink-0 rounded-b-2xl"
  >
    <button
      onclick={closeModal}
      class="px-4 py-2 text-sm text-slate-400 hover:text-(--hako-fg) transition-colors cursor-pointer"
    >
      Cancel
    </button>
    <button
      onclick={handleSubmit}
      disabled={saving}
      class="px-5 py-2 text-sm font-semibold bg-accent text-white rounded-lg hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
    >
      {saving ? "Saving..." : isEdit ? "Save" : "Create"}
    </button>
  </div>
</div>
