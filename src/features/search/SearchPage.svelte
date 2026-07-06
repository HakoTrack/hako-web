<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "../../core/supabase";
  import { AuthService } from "../../core/auth";
  import MediaCover from "../../shared/components/MediaCover.svelte";
  import SearchInput from "../../shared/components/SearchInput.svelte";
  import Select from "../../shared/components/Select.svelte";
  import { GENRES, STATUS_COLORS } from "../../shared/utils/constants";
  import type { Media } from "../../shared/types";

  let { mediaType }: { mediaType: string } = $props();

  const FORMAT_OPTIONS = [
    { value: "", label: "All Formats" },
    { value: "TV", label: "TV" },
    { value: "TV_SHORT", label: "TV Short" },
    { value: "MOVIE", label: "Movie" },
    { value: "OVA", label: "OVA" },
    { value: "ONA", label: "ONA" },
    { value: "SPECIAL", label: "Special" },
    { value: "MUSIC", label: "Music" },
  ];

  const SEASON_OPTIONS = [
    { value: "", label: "Any Season" },
    { value: "SPRING", label: "Spring" },
    { value: "SUMMER", label: "Summer" },
    { value: "FALL", label: "Fall" },
    { value: "WINTER", label: "Winter" },
  ];

  const STATUS_OPTIONS = [
    { value: "", label: "Any Status" },
    { value: "FINISHED", label: "Finished" },
    { value: "RELEASING", label: "Releasing" },
    { value: "NOT_YET_RELEASED", label: "Not Yet Released" },
    { value: "CANCELLED", label: "Cancelled" },
    { value: "HIATUS", label: "Hiatus" },
  ];

  const SORT_OPTIONS = [
    { value: "score", label: "Score" },
    { value: "title", label: "Title" },
    { value: "year", label: "Year" },
  ];

  let statusLabels = $derived.by(() => {
    const verb = mediaType === "anime" ? "Watching" : "Reading";
    return {
      current: verb,
      completed: "Completed",
      paused: "Paused",
      dropped: "Dropped",
      planning: "Planning",
    } as Record<string, string>;
  });

  interface FilterChip {
    label: string;
    onRemove: () => void;
  }

  interface SearchResult {
    id: number;
    title_romaji: string;
    title_english: string | null;
    title_native: string | null;
    format: string;
    status: string;
    season: string | null;
    season_year: number | null;
    genre_ids: number[];
    median_score: number | null;
  }

  let searchQuery = $state("");
  let selectedGenres = $state<number[]>([]);
  let selectedTags = $state<string[]>([]);
  let availableTags = $state<string[]>([]);
  let year = $state<number | null>(null);
  let seasonValue = $state("");
  let formatValue = $state("");
  let statusValue = $state("");
  let excludeHentai = $state(true);
  let excludeMyList = $state(false);
  let sortValue = $state("score");

  let results = $state<SearchResult[]>([]);
  let isLoading = $state(true);
  let isLoadingMore = $state(false);
  let page = $state(0);
  let hasMore = $state(true);
  let sentinelRef = $state<HTMLElement | null>(null);
  let listEntries = $state<Map<number, string>>(new Map());

  let genresOpen = $state(false);
  let tagsOpen = $state(false);
  let genresRef = $state<HTMLElement | null>(null);
  let tagsRef = $state<HTMLElement | null>(null);

  const PAGE_SIZE = 48;

  let label = $derived(
    mediaType === "light_novel"
      ? "Light Novels"
      : mediaType.charAt(0).toUpperCase() + mediaType.slice(1),
  );

  let activeChips = $derived.by(() => {
    const chips: FilterChip[] = [];
    if (searchQuery.trim())
      chips.push({
        label: `"${searchQuery}"`,
        onRemove: () => {
          searchQuery = "";
          search();
        },
      });
    if (year)
      chips.push({
        label: `Year: ${year}`,
        onRemove: () => {
          year = null;
          search();
        },
      });
    if (seasonValue)
      chips.push({
        label: seasonValue,
        onRemove: () => {
          seasonValue = "";
          search();
        },
      });
    if (formatValue)
      chips.push({
        label: formatValue.replace("_", " "),
        onRemove: () => {
          formatValue = "";
          search();
        },
      });
    if (statusValue)
      chips.push({
        label: statusValue.replace(/_/g, " "),
        onRemove: () => {
          statusValue = "";
          search();
        },
      });
    for (const id of selectedGenres) {
      const name = GENRES[id - 1];
      if (name)
        chips.push({
          label: name,
          onRemove: () => {
            selectedGenres = selectedGenres.filter((g) => g !== id);
            search();
          },
        });
    }
    for (const tag of selectedTags) {
      chips.push({
        label: tag,
        onRemove: () => {
          selectedTags = selectedTags.filter((t) => t !== tag);
          search();
        },
      });
    }
    if (excludeHentai)
      chips.push({
        label: "Hide hentai",
        onRemove: () => {
          excludeHentai = false;
          search();
        },
      });
    if (excludeMyList)
      chips.push({
        label: "Hide my list",
        onRemove: () => {
          excludeMyList = false;
          search();
        },
      });
    return chips;
  });

  function buildQuery() {
    let q = supabase
      .from("media")
      .select(
        "id, title_romaji, title_english, title_native, format, status, season, season_year, genre_ids",
      )
      .eq("media_type", mediaType);

    if (searchQuery.trim()) {
      const qs = searchQuery.trim();
      q = q.or(
        `title_romaji.ilike.%${qs}%,title_english.ilike.%${qs}%,title_native.ilike.%${qs}%`,
      );
    }

    for (const gid of selectedGenres) {
      q = q.filter("genre_ids", "cs", JSON.stringify([gid]));
    }

    if (year) q = q.eq("season_year", year);
    if (seasonValue) q = q.eq("season", seasonValue);
    if (formatValue) q = q.eq("format", formatValue);
    if (statusValue) q = q.eq("status", statusValue);
    if (excludeHentai)
      q = q.filter("genre_ids", "not.cs", JSON.stringify([19]));
    if (excludeMyList && listEntries.size > 0)
      q = q.not("id", "in", `(${[...listEntries.keys()].join(",")})`);

    if (sortValue === "title") {
      q = q.order("title_romaji", { ascending: true });
    } else if (sortValue === "year") {
      q = q.order("season_year", { ascending: false, nullsFirst: false });
    }

    return q;
  }

  async function fetchPage(
    pageNum: number,
  ): Promise<{ data: SearchResult[]; hasMore: boolean }> {
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let q = buildQuery().range(from, to);

    const { data, error } = await q;

    if (error) {
      console.error("Search error:", error);
      return { data: [], hasMore: false };
    }

    const ids = (data || []).map((r: any) => r.id);
    let scoreMap = new Map<number, number>();
    if (ids.length > 0) {
      const { data: scores } = await supabase
        .from("top_rated_media_view")
        .select("id, median_score")
        .in("id", ids);
      if (scores) {
        scoreMap = new Map(
          scores.map((s: any) => [s.id, s.median_score as number]),
        );
      }
    }

    let rows: SearchResult[] = (data || []).map((r: any) => ({
      id: r.id,
      title_romaji: r.title_romaji || "",
      title_english: r.title_english || null,
      title_native: r.title_native || null,
      format: r.format || "TV",
      status: r.status || "FINISHED",
      season: r.season || null,
      season_year: r.season_year || null,
      genre_ids: r.genre_ids || [],
      median_score: scoreMap.get(r.id) ?? null,
    }));

    if (sortValue === "score") {
      rows.sort((a, b) => (b.median_score ?? 0) - (a.median_score ?? 0));
    }

    return { data: rows, hasMore: (data?.length || 0) >= PAGE_SIZE };
  }

  async function search(append: boolean | string | Event = false) {
    if (append === true) {
      if (isLoadingMore || !hasMore) return;
      isLoadingMore = true;
      page++;
    } else {
      page = 0;
      isLoading = true;
      results = [];
    }

    try {
      const res = await fetchPage(page);
      if (append === true) {
        results = [...results, ...res.data];
      } else {
        results = res.data;
      }
      hasMore = res.hasMore;
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      isLoading = false;
      isLoadingMore = false;
    }
  }

  function toggleGenre(id: number) {
    selectedGenres = selectedGenres.includes(id)
      ? selectedGenres.filter((g) => g !== id)
      : [...selectedGenres, id];
    search();
  }

  function toggleTag(tag: string) {
    selectedTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    search();
  }

  function handleClickOutside(event: MouseEvent) {
    if (genresRef && !genresRef.contains(event.target as Node))
      genresOpen = false;
    if (tagsRef && !tagsRef.contains(event.target as Node)) tagsOpen = false;
  }

  onMount(async () => {
    const user = await AuthService.getCurrentUser();
    if (user) {
      const { data } = await supabase
        .from("profile_list")
        .select("media_id, status")
        .eq("profile_id", user.id);
      if (data)
        listEntries = new Map(data.map((d: any) => [d.media_id, d.status]));
    }

    const { data: tagRows } = await supabase
      .from("media")
      .select("tags")
      .eq("media_type", mediaType)
      .not("tags", "is", null)
      .limit(500);
    const tagCounts = new Map<string, number>();
    if (tagRows) {
      for (const row of tagRows) {
        for (const t of (row as any).tags || []) {
          const name = t.name || t;
          tagCounts.set(name, (tagCounts.get(name) || 0) + 1);
        }
      }
    }
    availableTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100)
      .map(([name]) => name);

    window.addEventListener("click", handleClickOutside, true);
    await search();
  });

  $effect(() => {
    if (!sentinelRef) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && hasMore) {
          search(true);
        }
      },
      { threshold: 0.1, rootMargin: "200px" },
    );
    observer.observe(sentinelRef);
    return () => observer.disconnect();
  });
</script>

<div class="max-w-375 mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-3xl font-bold text-(--hako-fg)">Search {label}</h1>
  </div>

  <div class="flex flex-wrap gap-2 mb-6 min-h-7">
    {#each activeChips as chip}
      <button
        type="button"
        onclick={chip.onRemove}
        class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full bg-(--c12)/15 text-(--c12) hover:bg-(--c12)/25 transition-colors"
      >
        {chip.label}
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>
    {/each}
  </div>

  <div class="flex flex-col lg:flex-row gap-8 w-full">
    <aside class="lg:w-72 xl:w-64 shrink-0 order-2 lg:order-1">
      <div class="sticky top-24 flex flex-col gap-4">
        <div class="bg-card rounded-xl p-5 space-y-4">
          <SearchInput
            bind:value={searchQuery}
            placeholder="Search titles..."
            label="Search"
            oninput={search}
          />

          <Select
            items={SORT_OPTIONS}
            bind:value={sortValue}
            label="Sort"
            onchange={search}
          />

          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div bind:this={genresRef} class="relative">
            <label
              class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block"
            >
              Genres
            </label>
            <button
              type="button"
              onclick={() => (genresOpen = !genresOpen)}
              class="w-full h-10 bg-(--surface-dim) text-(--hako-fg) rounded-lg border border-(--c8) px-3 text-sm flex justify-between items-center outline-none focus:border-(--hako-accent) transition-all"
            >
              <span class="truncate">
                {selectedGenres.length > 0
                  ? `${selectedGenres.length} selected`
                  : "All genres"}
              </span>
              <i
                class="fa-solid fa-chevron-down text-xs text-(--c8) ml-2 shrink-0"
              ></i>
            </button>
            {#if genresOpen}
              <div
                class="absolute z-20 w-full mt-1 bg-(--surface) border border-(--c8) rounded-xl shadow-2xl py-1 max-h-60 overflow-y-auto"
              >
                {#each GENRES as genre, i}
                  {@const id = i + 1}
                  {@const active = selectedGenres.includes(id)}
                  <button
                    type="button"
                    onclick={() => toggleGenre(id)}
                    class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-(--surface-elevated) transition-colors text-sm text-(--hako-fg)"
                  >
                    {#if active}
                      <i class="fa-solid fa-check text-(--c2) shrink-0"></i>
                    {:else}
                      <span class="w-3.5 shrink-0"></span>
                    {/if}
                    {genre}
                  </button>
                {/each}
              </div>
            {/if}
          </div>

          <Select
            items={SEASON_OPTIONS}
            bind:value={seasonValue}
            label="Season"
            onchange={search}
          />

          <div>
            <label
              for="filter-year"
              class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block"
            >
              Year
            </label>
            <input
              id="filter-year"
              type="number"
              bind:value={year}
              oninput={search}
              placeholder="e.g. 2024"
              class="w-full h-10 bg-(--surface-dim) border border-(--c8) rounded-lg px-3 text-sm text-(--hako-fg) placeholder:text-slate-600 focus:border-(--hako-accent) outline-none transition-all"
            />
          </div>

          <Select
            items={FORMAT_OPTIONS}
            bind:value={formatValue}
            label="Format"
            onchange={search}
          />

          <Select
            items={STATUS_OPTIONS}
            bind:value={statusValue}
            label="Status"
            onchange={search}
          />

          <div class="space-y-3">
            <button
              type="button"
              onclick={() => {
                excludeHentai = !excludeHentai;
                search();
              }}
              class="flex items-center justify-between w-full text-left"
            >
              <span class="text-xs text-(--c8)">Hide hentai</span>
              <div
                class="w-9 h-5 rounded-full transition-colors relative {excludeHentai
                  ? 'bg-(--c2)'
                  : 'bg-(--c8)/30'}"
              >
                <div
                  class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform {excludeHentai
                    ? 'translate-x-4'
                    : ''}"
                ></div>
              </div>
            </button>
            <button
              type="button"
              onclick={() => {
                excludeMyList = !excludeMyList;
                search();
              }}
              class="flex items-center justify-between w-full text-left"
            >
              <span class="text-xs text-(--c8)">Hide from my list</span>
              <div
                class="w-9 h-5 rounded-full transition-colors relative {excludeMyList
                  ? 'bg-(--c2)'
                  : 'bg-(--c8)/30'}"
              >
                <div
                  class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform {excludeMyList
                    ? 'translate-x-4'
                    : ''}"
                ></div>
              </div>
            </button>
          </div>
        </div>

        <div class="bg-card rounded-xl shadow-sm">
          <div class="p-4">
            <h3
              class="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center"
            >
              <i class="fa-solid fa-tags text-accent mr-2"></i>
              Tags
            </h3>
          </div>
          <div class="px-4 pb-4">
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div bind:this={tagsRef} class="relative">
              <button
                type="button"
                onclick={() => (tagsOpen = !tagsOpen)}
                class="w-full h-10 bg-(--surface-dim) text-(--hako-fg) rounded-lg border border-(--c8) px-3 text-sm flex justify-between items-center outline-none focus:border-(--hako-accent) transition-all"
              >
                <span class="truncate">
                  {selectedTags.length > 0
                    ? `${selectedTags.length} selected`
                    : "All tags"}
                </span>
                <i
                  class="fa-solid fa-chevron-down text-xs text-(--c8) ml-2 shrink-0"
                ></i>
              </button>
              {#if tagsOpen}
                <div
                  class="absolute z-20 w-full mt-1 bg-(--surface) border border-(--c8) rounded-xl shadow-2xl py-1 max-h-60 overflow-y-auto"
                >
                  {#each availableTags as tag}
                    {@const active = selectedTags.includes(tag)}
                    <button
                      type="button"
                      onclick={() => toggleTag(tag)}
                      class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-(--surface-elevated) transition-colors text-sm text-(--hako-fg)"
                    >
                      {#if active}
                        <i class="fa-solid fa-check text-(--c2) shrink-0"></i>
                      {:else}
                        <span class="w-3.5 shrink-0"></span>
                      {/if}
                      {tag}
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </aside>

    <main class="flex-1 min-w-0 order-1 lg:order-2">
      {#if isLoading}
        <div
          class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
        >
          {#each Array(12) as _}
            <div class="space-y-2">
              <div
                class="aspect-[3/4] bg-(--surface-elevated) rounded-xl animate-pulse"
              ></div>
              <div
                class="h-3 bg-(--surface-elevated) rounded animate-pulse w-3/4"
              ></div>
            </div>
          {/each}
        </div>
      {:else if results.length === 0}
        <div class="text-center py-20 text-slate-500">
          <i class="fa-solid fa-search text-4xl mb-4 block opacity-20"></i>
          <p class="font-medium">No results found.</p>
          <p class="text-sm mt-1">Try adjusting your search or filters.</p>
        </div>
      {:else}
        <div
          class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
        >
          {#each results as item (item.id)}
            {@const entryStatus = listEntries.get(item.id)}
            <div class="relative">
              <MediaCover
                mediaId={item.id}
                type={mediaType}
                size="large"
                class="w-full aspect-2/3 rounded-md {entryStatus === 'completed'
                  ? 'opacity-30'
                  : ''}"
                showTooltip={true}
                prefetchedMedia={{
                  media_id: item.id,
                  media_type: mediaType,
                  title: {
                    romaji: item.title_romaji,
                    english: item.title_english,
                    native: item.title_native,
                  },
                } as Media}
              />
              {#if entryStatus}
                <div
                  class="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider pointer-events-none leading-none text-white"
                  style="background-color: {STATUS_COLORS[entryStatus]}"
                >
                  {statusLabels[entryStatus]}
                </div>
              {/if}
            </div>
          {/each}
        </div>

        {#if hasMore}
          <div bind:this={sentinelRef} class="h-10"></div>
        {/if}

        {#if isLoadingMore}
          <div class="flex items-center justify-center p-6">
            <i class="fa-solid fa-circle-notch fa-spin text-accent text-lg"></i>
          </div>
        {/if}
      {/if}
    </main>
  </div>
</div>
