<script lang="ts">
  import Fuse from "fuse.js";
  import { openQuickEditor } from "../../../core/ui.svelte";
  import { getDisplayTitle, settings } from "../../../core/settings.svelte";
  import { ListService } from "../services/listService";
  import { MetadataService } from "../../../features/media/services/metadataService";
  import { fetchMediaById } from "../../../shared/utils/mediaData";
  import { parseQuery } from "../../../shared/utils/search";
  import type { Media, ListEntry } from "../../../shared/types/index";
  import {
    STATUS_COLORS,
    getStatusGroups,
  } from "../../../shared/utils/constants";
  import MediaCover from "../../../shared/components/MediaCover.svelte";
  import Select from "../../../shared/components/Select.svelte";
  import SearchInput from "../../../shared/components/SearchInput.svelte";
  import Badge from "../../../shared/components/Badge.svelte";

  let {
    type = "anime",
    profileId,
    initialListData = [],
    initialMetadata = {},
  } = $props<{
    type?: string;
    profileId: string;
    initialListData?: ListEntry[];
    initialMetadata?: Record<string, Media>;
  }>();

  let listDataEntries: ListEntry[] = $state(initialListData);
  let metadata: Record<string, Media> = $state(initialMetadata);
  let sortBy = $state("Title");
  let filterStatus = $state("all");
  let searchQuery = $state("");
  let isLoading = $state(true);
  let isBackgroundFetching = $state(false);

  // Sync state if props change (deferred in effect below)
  $effect(() => {
    if (Object.keys(initialMetadata).length > 0) metadata = initialMetadata;
  });

  // Progressive rendering limit to avoid blocking the main thread
  let displayLimit = $state(50);

  const statusGroups = $derived(getStatusGroups(type));

  function formatType(t: string): string {
    if (t === "light_novel" || t === "lightnovel") return "Light Novels";
    if (t === "anime") return "Anime";
    if (t === "manga") return "Manga";
    return t.charAt(0).toUpperCase() + t.slice(1) + "s";
  }

  // Sync state whenever the profileId or type arrives/changes
  let lastType = "";
  $effect(() => {
    const supportedTypes = ["anime", "manga", "light_novel", "visual_novels"];
    if (profileId && type && supportedTypes.includes(type)) {
      if (type !== lastType) {
        lastType = type;

        // 1. Immediately clear list and show loading to break the synchronous chain.
        // This allows the click handler to return and the UI to respond instantly.
        listDataEntries = [];
        displayLimit = 50;
        isLoading = true;

        // 2. Defer heavy rendering to a new task
        setTimeout(() => {
          const cachedData = initialListData.length > 0 ? initialListData : [];

          if (cachedData.length > 0) {
            listDataEntries = cachedData;
            isLoading = false;
            isBackgroundFetching = true;
            loadData();
          } else {
            loadData();
          }
        }, 10);
      }
    } else {
      isLoading = false;
      listDataEntries = [];
      lastType = "";
    }
  });

  function setFilter(status: string) {
    displayLimit = 50;
    filterStatus = status;
  }

  function setSort(sort: string) {
    displayLimit = 50;
    sortBy = sort;
  }

  function handleSearchInput(e: Event) {
    displayLimit = 50;
    const target = e.target as HTMLInputElement;
    searchQuery = target?.value || "";
  }

  // Gradually increase display limit to render more items without hanging
  $effect(() => {
    if (!isLoading && displayLimit < listDataEntries.length) {
      const timer = setTimeout(() => {
        displayLimit += 50;
      }, 50);
      return () => clearTimeout(timer);
    }
  });

  async function loadData() {
    const result = await ListService.getList(profileId, type);
    if (result.success) {
      listDataEntries = result.data;
      const ids = listDataEntries.map((item) => item.media_id);
      metadata = await MetadataService.getMetadata(ids, type);
      isLoading = false;
      isBackgroundFetching = false;
    } else {
      console.error("Error loading list:", result.error);
      isLoading = false;
      isBackgroundFetching = false;
    }
  }

  function getScoreColor(score: number | null): string {
    if (!score) return "text-(--c8)";
    if (score >= 9) return "text-(--c2)";
    if (score >= 8) return "text-(--c4)";
    if (score >= 7) return "text-(--c15)";
    if (score >= 5) return "text-(--c3)";
    return "text-(--c1)";
  }

  async function handleOpenEditor(id: number) {
    const media = await fetchMediaById(id);
    if (media) openQuickEditor(media, type);
  }

  // Optimized derived data processing
  const processedItems = $derived(
    listDataEntries.map((item) => {
      const meta = metadata[item.media_id?.toString()] || {};
      const titleObj = (meta as any).title || {};

      const displayTitle =
        getDisplayTitle(titleObj, settings.titlePreference) ||
        (item as any).title ||
        "";

      return {
        ...item,
        meta,
        title: titleObj, // Include full title object for searching
        displayTitle,
      };
    }),
  );

  // 1. First, search and filter by genre/score
  const filteredItems = $derived.by(() => {
    const { operators, freeQuery } = parseQuery(searchQuery);

    let items = processedItems.filter((item) => {
      let matches = true;
      if (operators.genre) {
        const genres = (item.meta as any).genres || [];
        matches =
          matches &&
          genres.some((g: string) => g.toLowerCase().includes(operators.genre));
      }
      if (operators.score) {
        matches = matches && (item.score || 0) >= parseFloat(operators.score);
      }
      return matches;
    });

    if (freeQuery.length > 0) {
      const fuse = new Fuse(items, {
        keys: ["title.romaji", "title.english", "title.native"],
        threshold: 0.3,
      });
      items = fuse.search(freeQuery).map((r: any) => r.item);
    }
    return items;
  });

  // 2. Sort the filtered result (only happens when search or sort criteria change)
  const sortedItems = $derived.by(() => {
    return [...filteredItems].sort((a, b) => {
      if (sortBy === "Title")
        return a.displayTitle.localeCompare(b.displayTitle);
      if (sortBy === "Score") return (b.score || 0) - (a.score || 0);
      if (sortBy === "Progress") return (b.progress || 0) - (a.progress || 0);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  });

  // 3. Group the sorted items (O(N) instead of O(N*G))
  const groupedItems = $derived.by(() => {
    const groups: Record<string, any[]> = {};
    for (const item of sortedItems) {
      const s = (item.status || "").toLowerCase();
      if (!groups[s]) groups[s] = [];
      groups[s].push(item);
    }
    return groups;
  });

  const visibleGroups = $derived.by(() => {
    if (isLoading || listDataEntries.length === 0) return [];

    const groups = statusGroups.filter(
      (g) => filterStatus === "all" || g.id === filterStatus,
    );

    let remainingLimit = displayLimit;

    return groups
      .map((group) => {
        const itemsInGroup = groupedItems[group.id] || [];
        const slicedItems = itemsInGroup.slice(0, remainingLimit);
        remainingLimit = Math.max(0, remainingLimit - slicedItems.length);

        return {
          ...group,
          items: slicedItems,
          totalInGroup: itemsInGroup.length,
        };
      })
      .filter((group) => group.items.length > 0);
  });

  const statusCounts = $derived.by(() => {
    const counts: Record<string, number> = { all: listDataEntries.length };
    listDataEntries.forEach((item) => {
      const status = (item.status || "").toLowerCase();
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  });

  // Reset limit whenever filters change to keep interaction snappy
  $effect(() => {
    // We access these to establish dependencies
    searchQuery;
    sortBy;
    filterStatus;

    // Use a microtask or slight delay to ensure the click handler returns quickly
    // before the heavy rendering work starts
    const timer = setTimeout(() => {
      displayLimit = 50;
    }, 0);
    return () => clearTimeout(timer);
  });
</script>

<div
  id="media-list-wrapper"
  data-type={type}
  class="flex flex-col lg:flex-row gap-8 mb-12 animate-in fade-in duration-300"
>
  <aside class="lg:w-[20%] order-2 lg:order-1">
    <div class="sticky top-24 space-y-6">
      <div class="bg-card rounded-xl p-5 space-y-4">
        <SearchInput
          label="Search List"
          placeholder="Search"
          bind:value={searchQuery}
          oninput={handleSearchInput}
        />
        <div>
          <Select
            label="Sort By"
            value={sortBy}
            onchange={(val: any) => setSort(val)}
            items={[
              { value: "Title", label: "Title" },
              { value: "Score", label: "Score" },
              { value: "Progress", label: "Progress" },
              { value: "Last Updated", label: "Last Updated" },
            ]}
          />
        </div>
      </div>

      <div class="bg-card rounded-xl overflow-hidden">
        <div class="p-4">
          <h3
            class="text-xs font-bold uppercase tracking-widest text-white flex items-center"
          >
            <i class="fa-solid fa-layer-group text-accent mr-2"></i> Categories
          </h3>
        </div>
        <button
          onclick={() => setFilter("all")}
          class="flex items-center justify-between px-4 py-3 text-sm font-medium w-full transition-all border-l-4 ring-0 outline-none {filterStatus ===
          'all'
            ? 'text-white bg-(--surface-dim) border-(--hako-accent)'
            : 'text-slate-400 hover:text-white border-transparent hover:bg-card'} transition-all w-full ring-0 outline-none"
        >
          <div class="flex items-center">
            <span class="w-2 h-2 rounded-full mr-3 bg-(--c7)"></span>
            <span>All {formatType(type)}</span>
          </div>
          <div class="flex items-center space-x-2">
            {#if isBackgroundFetching}
              <i
                class="fa-solid fa-circle-notch fa-spin text-accent text-[10px]"
              ></i>
            {/if}
            <span class="count text-xs text-slate-500">{statusCounts.all}</span>
          </div>
        </button>

        {#each statusGroups as group}
          <button
            onclick={() => setFilter(group.id)}
            class="flex items-center justify-between px-4 py-3 text-sm font-medium ring-0 outline-none {filterStatus ===
            group.id
              ? 'text-white bg-(--surface-dim) border-l-4 border-(--hako-accent)'
              : 'text-slate-400 hover:text-white border-l-4 border-transparent hover:bg-card'} transition-all w-full ring-0 outline-none"
          >
            <div class="flex items-center">
              <span
                class="w-2 h-2 rounded-full mr-3"
                style="background-color: {STATUS_COLORS[group.id]}"
              ></span>
              <span>{group.label}</span>
            </div>
            <span class="count text-xs text-slate-500"
              >{statusCounts[group.id] || 0}</span
            >
          </button>
        {/each}
      </div>
    </div>
  </aside>
  <main class="lg:w-[80%] order-1 lg:order-2 space-y-10 min-h-100">
    {#if isLoading}
      <div class="space-y-4">
        <div class="flex items-center space-x-3 mb-6">
          <div
            class="w-1.5 h-6 rounded-full bg-(--surface-elevated) animate-pulse"
          ></div>
          <h2
            class="text-lg font-bold uppercase tracking-wider bg-(--surface-elevated) animate-pulse rounded text-transparent"
          >
            Placeholder Header
          </h2>
        </div>
        <div class="bg-card rounded-xl overflow-hidden shadow-sm">
          <table class="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr
                class="text-[10px] uppercase text-(--c8) border-b border-(--surface-elevated)"
              >
                <th
                  class="p-4 w-16 text-center border-b border-(--surface-elevated)"
                ></th>
                <th class="p-4 border-b border-(--surface-elevated)">Title</th>
                <th
                  class="p-4 text-center w-24 border-b border-(--surface-elevated)"
                  >Score</th
                >
                <th
                  class="p-4 text-center w-32 border-b border-(--surface-elevated)"
                  >Progress</th
                >
                <th
                  class="p-4 text-center w-28 border-b border-(--surface-elevated)"
                  >Format</th
                >
              </tr>
            </thead>
            <tbody>
              {#each Array(8) as _, i}
                <tr
                  class="group hover:bg-(--surface-elevated)/30 last:border-0"
                >
                  <td
                    class="p-2 border-b border-(--surface-elevated) group-last:border-0"
                  >
                    <div
                      class="w-12 aspect-[17/23] bg-(--surface-elevated) animate-pulse rounded mx-auto"
                    ></div>
                  </td>
                  <td
                    class="p-4 cursor-pointer border-b border-(--surface-elevated) group-last:border-0"
                  >
                    <div
                      class="text-sm font-bold bg-(--surface-elevated) animate-pulse rounded text-transparent w-2/3"
                    >
                      Placeholder
                    </div>
                    <div class="flex flex-wrap gap-1 mt-1.5">
                      <span
                        class="text-[10px] px-3 py-1 rounded-full bg-(--surface-elevated)/50 animate-pulse text-transparent font-bold uppercase tracking-wider"
                        >Badge</span
                      >
                      <span
                        class="text-[10px] px-3 py-1 rounded-full bg-(--surface-elevated)/50 animate-pulse text-transparent font-bold uppercase tracking-wider"
                        >Badge</span
                      >
                    </div>
                  </td>
                  <td
                    class="p-4 text-center text-sm font-mono border-b border-(--surface-elevated) group-last:border-0"
                  >
                    <span
                      class="bg-(--surface-elevated) animate-pulse rounded text-transparent"
                      >0.0</span
                    >
                  </td>
                  <td
                    class="p-4 text-center text-sm font-mono border-b border-(--surface-elevated) group-last:border-0"
                  >
                    <span
                      class="bg-(--surface-elevated) animate-pulse rounded text-transparent"
                      >00/00</span
                    >
                  </td>
                  <td
                    class="p-4 text-center border-b border-(--surface-elevated) group-last:border-0"
                  >
                    <span
                      class="text-[10px] font-bold bg-(--surface-elevated) animate-pulse px-2 py-1 rounded text-transparent border border-transparent"
                      >TV</span
                    >
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {:else if visibleGroups.length === 0}
      <div class="p-10 text-center text-[20px] text-slate-500">
        This box is currently empty... ( ｡_｡)
      </div>
    {:else}
      {#each visibleGroups as group}
        <section class="space-y-4">
          <div class="flex items-center space-x-3 mb-6">
            <div
              class="w-1.5 h-6 rounded-full"
              style="background-color: {STATUS_COLORS[group.id]}"
            ></div>
            <h2 class="text-lg font-bold text-white uppercase tracking-wider">
              {group.label}
            </h2>
          </div>
          <div class="bg-card rounded-xl overflow-hidden shadow-sm">
            <table class="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr
                  class="text-[10px] uppercase text-(--c8) border-b border-(--surface-elevated)"
                >
                  <th
                    class="p-4 w-16 text-center border-b border-(--surface-elevated)"
                  ></th>
                  <th class="p-4 border-b border-(--surface-elevated)">Title</th
                  >
                  <th
                    class="p-4 text-center w-24 border-b border-(--surface-elevated)"
                    >Score</th
                  >
                  <th
                    class="p-4 text-center w-32 border-b border-(--surface-elevated)"
                    >Progress</th
                  >
                  <th
                    class="p-4 text-center w-28 border-b border-(--surface-elevated)"
                    >Format</th
                  >
                </tr>
              </thead>
              <tbody>
                {#each group.items as item}
                  {@const meta = item.meta || {}}
                  {@const total =
                    type === "manga" ||
                    type === "light_novel" ||
                    type === "lightnovel"
                      ? meta.chapters || item.total || "?"
                      : meta.episodes || item.total || "?"}
                  {@const displayTitle = item.displayTitle}
                  <tr
                    class="group hover:bg-(--surface-elevated)/30 last:border-0"
                  >
                    <td
                      class="p-2 border-b border-(--surface-elevated) group-last:border-0"
                    >
                      <MediaCover
                        mediaId={item.media_id}
                        {type}
                        size="small"
                        alt={displayTitle}
                        class="mx-auto group-hover:scale-105 transition-transform"
                        showTooltip={false}
                      />
                    </td>
                    <td
                      class="p-4 cursor-pointer border-b border-(--surface-elevated) group-last:border-0"
                      onclick={() => handleOpenEditor(item.media_id)}
                    >
                      <div class="text-sm font-bold text-(--hako-fg)">
                        {displayTitle}
                      </div>
                      <div class="flex flex-wrap gap-1 mt-1.5">
                        {#each (meta as any).genres?.slice(0, 5) as genre}
                          <Badge label={genre} variant="genre" />
                        {/each}
                      </div>
                    </td>
                    <td
                      class="p-4 text-center text-sm font-mono {getScoreColor(
                        item.score,
                      )} border-b border-(--surface-elevated) group-last:border-0"
                      >{item.score?.toFixed(1) || "—"}</td
                    >
                    <td
                      class="p-4 text-center text-sm font-mono text-(--hako-fg) border-b border-(--surface-elevated) group-last:border-0"
                    >
                      <span class="text-(--hako-fg)">{item.progress}</span><span
                        class="text-(--c8) mx-1">/</span
                      ><span class="text-(--c8) text-xs">{total}</span>
                    </td>
                    <td
                      class="p-4 text-center border-b border-(--surface-elevated) group-last:border-0"
                    >
                      <span
                        class="text-[10px] font-bold bg-(--surface-dim) px-2 py-1 rounded text-slate-400 border border-(--surface-elevated)"
                        >{meta.format || item.type || "TV"}</span
                      >
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </section>
      {/each}
    {/if}
  </main>
</div>
