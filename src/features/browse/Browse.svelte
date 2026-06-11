<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { BrowseService, type BrowseFilters } from "./services/browseService";
  import MediaCover from "../../shared/components/MediaCover.svelte";
  import SearchInput from "../../shared/components/SearchInput.svelte";
  import Select from "../../shared/components/Select.svelte";
  import type { Media } from "../../shared/types/index";

  let { mediaType } = $props<{
    mediaType: "anime" | "manga" | "light_novel";
  }>();

  let filters = $state<BrowseFilters>({
    genre: "",
    tag: "",
    year: undefined,
    search: "",
    format: "",
  });

  let media = $state<Media[]>([]);
  let isLoading = $state(false);
  let page = $state(0);
  let hasMore = $state(true);
  const pageSize = 54;

  let genres = $state<string[]>([]);
  let tags = $state<string[]>([]);
  let formats = $state<string[]>([]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1960 + 1 }, (_, i) => ({
    label: (currentYear - i).toString(),
    value: (currentYear - i).toString(),
  }));

  async function loadMedia(reset = false) {
    if (isLoading) return;
    if (reset) {
      page = 0;
      hasMore = true;
    }
    if (!hasMore) return;

    isLoading = true;
    const result = await BrowseService.getFilteredMedia(
      mediaType,
      filters,
      page,
      pageSize,
    );

    if (result.success) {
      if (page === 0) {
        media = result.data;
      } else {
        media = [...media, ...result.data];
      }
      hasMore = result.data.length === pageSize;
    }
    isLoading = false;
  }

  // Svelte Action for infinite scroll
  function infiniteScroll(node: HTMLElement) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isLoading &&
          hasMore &&
          media.length > 0
        ) {
          page += 1;
          loadMedia(false);
        }
      },
      { rootMargin: "1000px" },
    );

    observer.observe(node);

    const interval = setInterval(() => {
      if (hasMore && !isLoading && media.length > 0) {
        const rect = node.getBoundingClientRect();
        if (rect.top < window.innerHeight + 200) {
          page += 1;
          loadMedia(false);
        }
      }
    }, 1000);

    return {
      destroy() {
        observer.disconnect();
        clearInterval(interval);
      },
    };
  }

  onMount(async () => {
    const [genresList, tagsList] = await Promise.all([
      BrowseService.getGenres(),
      BrowseService.getTags(),
    ]);
    genres = genresList;
    tags = tagsList;
  });

  // Debounced filter change
  let filterTimeout: any;
  function handleFilterChange() {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => {
      loadMedia(true);
    }, 300);
  }

  // Effect to reload when mediaType or filters change
  $effect(() => {
    // Track reactive values
    const type = mediaType;
    filters.genre;
    filters.tag;
    filters.year;
    filters.search;
    filters.format;

    untrack(() => {
      // Refresh formats list when mediaType changes
      BrowseService.getFormats(type).then((list) => {
        formats = list;
      });
      handleFilterChange();
    });
  });
</script>

<div class="py-12 px-6 max-w-7xl mx-auto">
  <div class="flex flex-col lg:flex-row gap-10 items-start">
    <!-- Sticky Sidebar -->
    <aside class="w-full lg:w-72 lg:sticky lg:top-24 flex flex-col gap-8">
      <div>
        <h1 class="text-4xl font-bold text-(--hako-fg) capitalize mb-2">
          Browse
        </h1>
        <p class="text-(--c8) text-sm font-medium capitalize">
          {mediaType.replace("_", " ")}
        </p>
      </div>

      <div
        class="flex flex-col gap-6 p-6 bg-(--surface-dim) rounded-2xl border border-(--c8)/50 shadow-sm"
      >
        <div class="flex flex-col gap-4">
          <SearchInput
            placeholder="Search titles..."
            bind:value={filters.search}
          />

          <Select
            label="Format"
            bind:value={filters.format}
            items={[
              { label: "All Formats", value: "" },
              ...formats.map((f) => ({ label: f.replace("_", " "), value: f })),
            ]}
          />
        </div>

        <div class="flex flex-col gap-4">
          <Select
            label="Genre"
            bind:value={filters.genre}
            items={[
              { label: "All Genres", value: "" },
              ...genres.map((g) => ({ label: g, value: g })),
            ]}
          />

          <Select
            label="Tag"
            bind:value={filters.tag}
            items={[
              { label: "All Tags", value: "" },
              ...tags.map((t) => ({ label: t, value: t })),
            ]}
          />

          <Select
            label="Year"
            value={filters.year?.toString() || ""}
            onchange={(val) => {
              filters.year = val ? parseInt(val) : undefined;
            }}
            items={[{ label: "All Years", value: "" }, ...years]}
          />
        </div>
      </div>
    </aside>

    <!-- Content Area -->
    <main class="flex-1 w-full">
      {#if isLoading && page === 0}
        <div class="flex justify-center py-40 w-full">
          <div
            class="animate-spin rounded-full h-10 w-10 border-4 border-(--c8) border-t-(--hako-accent)"
          ></div>
        </div>
      {:else if media.length === 0}
        <div
          class="flex flex-col items-center justify-center py-40 w-full text-center"
        >
          <i class="fa-solid fa-face-frown text-4xl text-(--c8) mb-4"></i>
          <p class="text-(--c8) font-medium">
            No results found for these filters.
          </p>
        </div>
      {:else}
        <div
          class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-6"
        >
          {#each media as item (item.media_id)}
            <MediaCover
              mediaId={item.media_id}
              type={mediaType}
              size="medium"
            />
          {/each}
        </div>

        <div
          use:infiniteScroll
          class="h-40 w-full flex justify-center items-center"
        >
          {#if isLoading}
            <div
              class="animate-spin rounded-full h-6 w-6 border-2 border-(--c8) border-t-(--hako-accent)"
            ></div>
          {/if}
        </div>
      {/if}
    </main>
  </div>
</div>
