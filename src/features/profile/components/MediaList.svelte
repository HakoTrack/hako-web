<script lang="ts">
  import { openQuickEditor } from "../../../core/ui.svelte";
  import { getDisplayTitle, settings } from "../../../core/settings.svelte";
  import { fetchMediaSummaryWithGenres } from "../../../shared/utils/mediaData";
  import type { Media, ListEntry } from "../../../shared/types/index";
  import {
    STATUS_COLORS,
    getStatusGroups,
  } from "../../../shared/utils/constants";
  import MediaCover from "../../../shared/components/MediaCover.svelte";
  import Select from "../../../shared/components/Select.svelte";
  import SearchInput from "../../../shared/components/SearchInput.svelte";
  import Badge from "../../../shared/components/Badge.svelte";
  import SegmentedControl from "../../../shared/components/SegmentedControl.svelte";
  import init, { ListEngine } from "$wasm/hako_wasm";
  import { untrack } from "svelte";

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

  let listDataEntries: ListEntry[] = $state.raw([]);
  let metadata: Record<string, Media> = $state.raw({});
  let viewMode: "table" | "grid" = $state("table");
  let sortBy = $state("Title");
  let filterStatus = $state("all");
  let searchQuery = $state("");
  let isLoading = $state(true);
  let wasmEngine: ListEngine | null = $state(null);
  let isWasmReady = $state(false);

  // Initialize Wasm
  $effect(() => {
    init().catch(console.error);
  });

  // Unified Synchronization Effect
  let lastType = "";
  $effect(() => {
    const _initialListData = initialListData;
    const _initialMetadata = initialMetadata;
    const _type = type;

    const timer = setTimeout(() => {
      const typeChanged = _type !== lastType;
      if (typeChanged) {
        lastType = _type;
        wasmEngine = null;
        isWasmReady = false;
      }

      listDataEntries = _initialListData;
      metadata = _initialMetadata;

      const hasData = listDataEntries && listDataEntries.length > 0;
      const hasMetadata = Object.keys(metadata).length > 0;

      isLoading = !(hasData && hasMetadata);
    }, 0);

    return () => clearTimeout(timer);
  });

  // Re-instantiate engine when raw data changes
  $effect(() => {
    if (listDataEntries.length > 0 && Object.keys(metadata).length > 0) {
      const timer = setTimeout(() => {
        wasmEngine = new ListEngine(listDataEntries, metadata);
        isWasmReady = true;
      }, 0);
      return () => clearTimeout(timer);
    }
  });

  // Unified loading state
  const isReallyLoading = $derived(isLoading || !isWasmReady);

  const statusGroups = $derived(getStatusGroups(type));

  function formatType(t: string): string {
    if (t === "light_novel" || t === "lightnovel") return "Light Novels";
    if (t === "anime") return "Anime";
    if (t === "manga") return "Manga";
    return t.charAt(0).toUpperCase() + t.slice(1) + "s";
  }

  function setFilter(status: string) {
    filterStatus = status;
  }

  function setSort(sort: string) {
    sortBy = sort;
  }

  function handleSearchInput(e: Event) {
    const target = e.target as HTMLInputElement;
    searchQuery = target?.value || "";
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
    openQuickEditor(id, type);
  }

  // Wasm-powered sorting and filtering
  const sortedItems = $derived.by(() => {
    if (!wasmEngine) return [];
    return wasmEngine.filter_and_sort(
      searchQuery,
      sortBy,
      filterStatus,
      settings.titlePreference,
    );
  });

  // Group the sorted items
  const groupedItems = $derived.by(() => {
    const groups: Record<string, any[]> = {};
    for (const item of sortedItems) {
      const s = (item.status || "").toLowerCase();
      if (!groups[s]) groups[s] = [];
      groups[s].push(item);
    }
    return groups;
  });

  let scrollTop = $state(0);
  let viewportHeight = $state(1000);
  let viewportWidth = $state(1000);
  let containerRef = $state<HTMLElement | null>(null);

  $effect(() => {
    viewportHeight = window.innerHeight;
    viewportWidth = window.innerWidth;
    const onScroll = () => {
      scrollTop = window.scrollY;
    };
    const onResize = () => {
      viewportHeight = window.innerHeight;
      viewportWidth = window.innerWidth;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  });

  const itemsPerRow = $derived.by(() => {
    if (viewportWidth >= 1024) return 6;
    if (viewportWidth >= 768) return 5;
    if (viewportWidth >= 640) return 4;
    return 3;
  });

  /**
   * Virtualization Constants - PIXEL PERFECT from MediaListOld.svelte
   * groupHeader: 68px (Matches h2 text + gaps)
   * tableHeader: 45px (Matches original thead)
   * tableRow: 82px (Matches original tr)
   * groupSpacer: 40px (Matches space-y-10 on main container)
   */
  const ROW_HEIGHTS = {
    groupHeader: 68,
    tableHeader: 45,
    tableRow: 82,
    gridRow: 320,
    groupSpacer: 40,
  };

  // Flatten the list for virtualization
  const flattenedList = $derived.by(() => {
    if (isReallyLoading || listDataEntries.length === 0) return [];

    const filteredGroups = statusGroups.filter(
      (g) => filterStatus === "all" || g.id === filterStatus,
    );

    const result: any[] = [];
    for (let i = 0; i < filteredGroups.length; i++) {
      const group = filteredGroups[i];
      const items = groupedItems[group.id] || [];
      if (items.length > 0) {
        result.push({
          id: `header-${group.id}`,
          type: "groupHeader",
          ...group,
          totalInGroup: items.length,
        });

        if (viewMode === "table") {
          result.push({ id: `table-header-${group.id}`, type: "tableHeader" });
          for (let j = 0; j < items.length; j++) {
            result.push({
              id: `item-${items[j].media_id}`,
              type: "tableRow",
              item: items[j],
              isLastInGroup: j === items.length - 1,
            });
          }
        } else {
          for (let k = 0; k < items.length; k += itemsPerRow) {
            result.push({
              id: `grid-row-${group.id}-${k}`,
              type: "gridRow",
              items: items.slice(k, k + itemsPerRow),
            });
          }
        }

        if (i < filteredGroups.length - 1) {
          result.push({ id: `spacer-${group.id}`, type: "groupSpacer" });
        }
      }
    }
    return result;
  });

  const listMetrics = $derived.by(() => {
    let totalHeight = 0;
    const offsets: number[] = [];

    for (const item of flattenedList) {
      offsets.push(totalHeight);
      totalHeight += (ROW_HEIGHTS as any)[item.type] || 80;
    }
    return { offsets, totalHeight };
  });

  const virtualData = $derived.by(() => {
    if (!containerRef) return { items: [], totalHeight: 0, offsetY: 0 };

    const { offsets, totalHeight } = listMetrics;
    const rect = containerRef.getBoundingClientRect();
    const relativeScrollTop = Math.max(
      0,
      scrollTop - (rect.top + window.scrollY),
    );

    // Binary search for start index
    let low = 0;
    let high = offsets.length - 1;
    let start = 0;

    while (low <= high) {
      let mid = Math.floor((low + high) / 2);
      if (offsets[mid] < relativeScrollTop - 1000) {
        start = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    let end = start;
    while (
      end < offsets.length &&
      offsets[end] < relativeScrollTop + viewportHeight + 1000
    ) {
      end++;
    }

    return {
      items: flattenedList.slice(start, end + 1),
      totalHeight,
      offsetY: offsets[start] || 0,
    };
  });

  const statusCounts = $derived.by(() => {
    const counts: Record<string, number> = { all: listDataEntries.length };
    listDataEntries.forEach((item) => {
      const status = (item.status || "").toLowerCase();
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  });

  // Reset scroll whenever filters change
  $effect(() => {
    searchQuery;
    sortBy;
    filterStatus;

    untrack(() => {
      if (typeof window !== "undefined" && containerRef) {
        const rect = containerRef.getBoundingClientRect();
        const navOffset = 110; // Offset for sticky navbar
        const targetY = rect.top + window.scrollY - navOffset;

        if (window.scrollY > targetY) {
          window.scrollTo({ top: targetY, behavior: "instant" });
        }
      }
    });
  });
</script>

<div
  id="media-list-wrapper"
  data-type={type}
  class="flex flex-col lg:flex-row gap-8 mb-12"
  style="scrollbar-gutter: stable;"
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
        <div class="flex items-center justify-between">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label
            class="text-xs font-bold text-slate-400 uppercase tracking-wider"
            >View</label
          >
          <SegmentedControl
            value={viewMode}
            onchange={(val) =>
              setTimeout(() => (viewMode = val as "table" | "grid"), 0)}
            options={[
              { label: "Table", value: "table" },
              { label: "Grid", value: "grid" },
            ]}
          />
        </div>
      </div>

      <div class="bg-card rounded-xl overflow-hidden">
        <div class="p-4">
          <h3
            class="text-xs font-bold uppercase tracking-widest text-(--hako-fg) flex items-center"
          >
            <i class="fa-solid fa-layer-group text-accent mr-2"></i> Categories
          </h3>
        </div>
        <button
          onclick={() => setFilter("all")}
          class="flex items-center justify-between px-4 py-3 text-sm font-medium w-full transition-all border-l-4 ring-0 outline-none {filterStatus ===
          'all'
            ? 'text-(--hako-fg) bg-(--surface-elevated) border-(--hako-accent)'
            : 'text-slate-400 hover:text-(--hako-fg) border-transparent hover:bg-card'} transition-all w-full ring-0 outline-none"
        >
          <div class="flex items-center">
            <span class="w-2 h-2 rounded-full mr-3 bg-(--c7)"></span>
            <span>All {formatType(type)}</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="count text-xs text-slate-500">{statusCounts.all}</span>
          </div>
        </button>

        {#each statusGroups as group}
          <button
            onclick={() => setFilter(group.id)}
            class="flex items-center justify-between px-4 py-3 text-sm font-medium w-full transition-all border-l-4 ring-0 outline-none {filterStatus ===
            group.id
              ? 'text-(--hako-fg) bg-(--surface-elevated) border-l-4 border-(--hako-accent)'
              : 'text-slate-400 hover:text-(--c15) border-l-4 border-transparent hover:bg-card'} transition-all w-full ring-0 outline-none"
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
  <main
    bind:this={containerRef}
    class="lg:w-[80%] order-1 lg:order-2 space-y-0 relative min-h-100"
  >
    {#if isReallyLoading}
      <!-- EXACT SKELETON FROM MediaListOld.svelte -->
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
        <div
          class="bg-(--surface) border-b border-(--surface-elevated) rounded-t-xl w-full overflow-x-auto"
        >
          <table
            class="w-full text-left border-separate border-spacing-0 table-fixed"
          >
            <thead>
              <tr
                class="text-[10px] uppercase text-(--c8) border-b border-(--surface-elevated)"
              >
                <th
                  class="p-4 w-16 text-center border-b border-(--surface-elevated)"
                ></th>
                <th class="p-4 border-b border-(--surface-elevated) h-5"
                  >Title</th
                >
                <th
                  class="p-4 text-center w-24 border-b border-(--surface-elevated) hidden sm:table-cell"
                  >Score</th
                >
                <th
                  class="p-4 text-center w-32 border-b border-(--surface-elevated) hidden sm:table-cell"
                  >Progress</th
                >
                <th
                  class="p-4 text-center w-28 border-b border-(--surface-elevated) hidden sm:table-cell"
                  >Format</th
                >
              </tr>
            </thead>
            <tbody>
              {#each Array(8) as _}
                <tr class="group hover:bg-(--surface-elevated)/30">
                  <td class="p-2 border-b border-(--surface-elevated)">
                    <div
                      class="w-12 h-16.25 bg-(--surface-elevated) animate-pulse rounded mx-auto"
                    ></div>
                  </td>
                  <td
                    class="p-4 cursor-pointer border-b border-(--surface-elevated)"
                  >
                    <div
                      class="text-sm font-bold bg-(--surface-elevated) animate-pulse rounded text-transparent w-2/3 h-4"
                    ></div>
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
                    class="p-4 text-center text-sm font-mono border-b border-(--surface-elevated) hidden sm:table-cell"
                  >
                    <div
                      class="w-8 h-4 bg-(--surface-elevated) animate-pulse rounded mx-auto"
                    ></div>
                  </td>
                  <td
                    class="p-4 text-center text-sm font-mono border-b border-(--surface-elevated) hidden sm:table-cell"
                  >
                    <div
                      class="w-12 h-4 bg-(--surface-elevated) animate-pulse rounded mx-auto"
                    ></div>
                  </td>
                  <td
                    class="p-4 text-center border-b border-(--surface-elevated) hidden sm:table-cell"
                  >
                    <div
                      class="w-10 h-4 bg-(--surface-elevated) animate-pulse rounded mx-auto"
                    ></div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {:else}
      <div
        style="height: {virtualData.totalHeight}px; position: relative; width: 100%;"
      >
        <div
          style="transform: translateY({virtualData.offsetY}px); position: absolute; top: 0; left: 0; right: 0; width: 100%;"
        >
          {#each virtualData.items as row (row.id)}
            {#if row.type === "groupHeader"}
              <div class="flex items-center space-x-3 mb-6 h-7 pt-1">
                <div
                  class="w-1.5 h-6 rounded-full"
                  style="background-color: {STATUS_COLORS[row.id]}"
                ></div>
                <h2
                  class="text-lg font-bold text-(--hako-fg) uppercase tracking-wider"
                >
                  {row.label}
                </h2>
              </div>
            {:else if row.type === "tableHeader"}
              <div
                class="table-header border-b border-(--surface-elevated) overflow-hidden shadow-sm w-full overflow-x-auto"
              >
                <table
                  class="w-full text-left border-separate border-spacing-0 table-fixed"
                >
                  <thead>
                    <tr class="text-[10px] uppercase text-(--c8)">
                      <th class="p-4 w-16 text-center"></th>
                      <th class="p-4">Title</th>
                      <th class="p-4 text-center w-24 hidden sm:table-cell"
                        >Score</th
                      >
                      <th class="p-4 text-center w-32 hidden sm:table-cell"
                        >Progress</th
                      >
                      <th class="p-4 text-center w-28 hidden sm:table-cell"
                        >Format</th
                      >
                    </tr>
                  </thead>
                </table>
              </div>
            {:else if row.type === "tableRow"}
              {@const item = row.item}
              {@const meta = metadata[item.media_id.toString()] || {}}
              {@const total =
                type === "manga" ||
                type === "light_novel" ||
                type === "lightnovel"
                  ? (meta.chapters ?? item.total ?? "?")
                  : (meta.episodes ?? item.total ?? "?")}
              {@const displayTitle = item.displayTitle}
              <div
                class="bg-(--surface) border-b border-(--surface-elevated) {row.isLastInGroup
                  ? 'rounded-b-xl border-b-0'
                  : ''} overflow-hidden w-full overflow-x-auto"
              >
                <table
                  class="w-full text-left border-separate border-spacing-0 table-fixed"
                >
                  <tbody>
                    <tr class="group hover:bg-(--surface-elevated)/30">
                      <td class="p-2 w-16">
                        <MediaCover
                          mediaId={item.media_id}
                          {type}
                          size="small"
                          alt={displayTitle}
                          class="mx-auto group-hover:scale-105 transition-transform"
                          showTooltip={false}
                          prefetchedMedia={metadata[item.media_id.toString()]}
                        />
                      </td>
                      <td
                        class="p-4 cursor-pointer"
                        onclick={() => handleOpenEditor(item.media_id)}
                      >
                        <div
                          class="text-sm font-bold text-(--hako-fg) truncate sm:whitespace-normal"
                        >
                          {displayTitle}
                        </div>
                        <div class="flex flex-wrap gap-1 mt-1.5 sm:flex">
                          {#each (meta as any).genres?.slice(0, 5) as genre}
                            <Badge label={genre} variant="genre" />
                          {/each}
                        </div>
                      </td>
                      <td
                        class="p-4 text-center text-sm font-mono {getScoreColor(
                          item.score,
                        )} w-24 hidden sm:table-cell"
                      >
                        {item.score?.toFixed(1) || "—"}
                      </td>
                      <td
                        class="p-4 text-center text-sm font-mono text-(--hako-fg) w-32 hidden sm:table-cell"
                      >
                        <span class="text-(--hako-fg)">{item.progress}</span
                        ><span class="text-(--c8) mx-1">/</span><span
                          class="text-(--c8) text-xs">{total}</span
                        >
                      </td>
                      <td class="p-4 text-center hidden sm:table-cell w-28">
                        <span
                          class="text-[10px] font-bold bg-(--surface-dim) px-2 py-1 rounded text-slate-400 border border-(--surface-elevated)"
                        >
                          {(meta.format || item.type || "TV").replace(
                            /_/g,
                            " ",
                          )}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            {:else if row.type === "gridRow"}
              <div
                class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 p-4"
              >
                {#each row.items as item}
                  {@const meta = metadata[item.media_id.toString()] || {}}
                  {@const total =
                    type === "manga" ||
                    type === "light_novel" ||
                    type === "lightnovel"
                      ? (meta.chapters ?? item.total ?? "?")
                      : (meta.episodes ?? item.total ?? "?")}
                  <div class="relative group">
                    <MediaCover
                      mediaId={item.media_id}
                      {type}
                      size="medium"
                      alt={item.displayTitle}
                      class="w-full aspect-2/3 rounded-md"
                      showTooltip={false}
                      prefetchedMedia={metadata[item.media_id.toString()]}
                    />
                    <div
                      class="absolute bottom-0 left-0 right-0 bg-(--hako-bg)/80 p-2 text-(--hako-fg) opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"
                    >
                      <div
                        class="text-xs font-bold truncate"
                        title={item.displayTitle}
                      >
                        {item.displayTitle}
                      </div>
                      <div
                        class="text-[10px] flex justify-between mt-1 font-bold"
                      >
                        <span>{item.progress ?? 0} / {total}</span>
                        <span class={getScoreColor(item.score)}
                          >{item.score?.toFixed(1) ?? "—"}</span
                        >
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {:else if row.type === "groupSpacer"}
              <div class="h-10"></div>
            {/if}
          {/each}
        </div>
      </div>
    {/if}
  </main>
</div>
