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
  import VirtualScroll from "../../../shared/components/VirtualScroll.svelte";
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

  // CRITICAL: Use $state.raw to avoid proxying 11k+ items
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
    const rawData = initialListData;
    const rawMeta = initialMetadata;
    const currentType = type;

    queueMicrotask(() => {
      untrack(() => {
        const typeChanged = currentType !== lastType;
        if (typeChanged) {
          lastType = currentType;
          wasmEngine = null;
          isWasmReady = false;
        }

        listDataEntries = rawData;
        metadata = rawMeta;

        const hasData = listDataEntries && listDataEntries.length > 0;
        const hasMetadata = Object.keys(metadata).length > 0;
        isLoading = !(hasData && hasMetadata);
      });
    });
  });

  // Re-instantiate engine when raw data changes
  $effect(() => {
    if (listDataEntries.length > 0 && Object.keys(metadata).length > 0) {
      const initEngine = () => {
        const engine = new ListEngine(listDataEntries, metadata);
        wasmEngine = engine;
        isWasmReady = true;
      };

      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(initEngine, { timeout: 2000 });
      } else {
        setTimeout(initEngine, 0);
      }
    }
  });

  const isReallyLoading = $derived(isLoading || !isWasmReady);
  const statusGroups = $derived(getStatusGroups(type));

  function formatType(t: string): string {
    if (t === "light_novel" || t === "lightnovel") return "Light Novels";
    if (t === "anime") return "Anime";
    if (t === "manga") return "Manga";
    return t.charAt(0).toUpperCase() + t.slice(1) + "s";
  }

  function setFilter(status: string, manual = false) {
    if (filterStatus === status) return;
    filterStatus = status;

    if (manual) {
      setTimeout(() => {
        const container = document.getElementById("media-list-container");
        if (container) {
          container.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 0);
    }
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

  // Map to quickly find entries by ID
  const entriesMap = $derived.by(() => {
    const map = new Map<number, ListEntry>();
    for (const entry of listDataEntries) {
      map.set(Number(entry.media_id), entry);
    }
    return map;
  });

  // Wasm-powered sorting and filtering returns only IDs for speed
  const sortedItems = $derived.by(() => {
    if (!wasmEngine) return [];

    // Explicitly track dependencies for reactivity
    searchQuery;
    sortBy;
    settings.titlePreference;
    listDataEntries;
    metadata;

    try {
      const ids: any[] = wasmEngine.filter_and_sort(
        searchQuery,
        sortBy,
        "all",
        settings.titlePreference,
      );

      const results: ListEntry[] = [];
      const map = entriesMap;
      for (const id of ids) {
        const lookupId = typeof id === "object" ? id.media_id || id.id : id;
        const entry = map.get(Number(lookupId));
        if (entry) results.push(entry);
      }
      return results;
    } catch (e) {
      console.error("[MediaList] WASM filter_and_sort failed:", e);
      return [];
    }
  });

  // Group the sorted items
  const groupedItems = $derived.by(() => {
    const groups: Record<string, ListEntry[]> = {};
    for (const item of sortedItems) {
      const s = (item.status || "").toLowerCase();
      if (!groups[s]) groups[s] = [];
      groups[s].push(item);
    }
    return groups;
  });

  // Flattened row structure for a single VirtualScroll instance in table view
  type FlattenedRow =
    | { type: "category-label"; group: any }
    | { type: "table-header" }
    | { type: "item"; item: ListEntry; isLast: boolean }
    | { type: "category-spacer" };

  const flattenedTableRows = $derived.by(() => {
    const rows: FlattenedRow[] = [];
    for (const group of statusGroups) {
      const items = groupedItems[group.id] || [];
      if (
        items.length > 0 &&
        (filterStatus === "all" || filterStatus === group.id)
      ) {
        rows.push({ type: "category-label", group });
        rows.push({ type: "table-header" });
        for (let i = 0; i < items.length; i++) {
          rows.push({
            type: "item",
            item: items[i],
            isLast: i === items.length - 1,
          });
        }
        rows.push({ type: "category-spacer" });
      }
    }
    return rows;
  });

  const allGroups = $derived.by(() => {
    if (isReallyLoading || listDataEntries.length === 0) return [];

    return statusGroups
      .map((group) => ({
        ...group,
        items: groupedItems[group.id] || [],
        totalInGroup: (groupedItems[group.id] || []).length,
      }))
      .filter((group) => group.items.length > 0);
  });

  const statusCounts = $derived.by(() => {
    const counts: Record<string, number> = { all: listDataEntries.length };
    for (const item of listDataEntries) {
      const status = (item.status || "").toLowerCase();
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  });

  let windowWidth = $state(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );
  let gridWidth = $state(1200);

  $effect(() => {
    const handleResize = () => {
      windowWidth = window.innerWidth;
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  });

  const columns = $derived.by(() => {
    if (windowWidth >= 1024) return 6;
    if (windowWidth >= 768) return 5;
    if (windowWidth >= 640) return 4;
    return 3;
  });

  const gridRowHeight = $derived.by(() => {
    const padding = 32;
    const gap = 16;
    const availableWidth = gridWidth - padding;
    const columnWidth = (availableWidth - (columns - 1) * gap) / columns;
    // Exactly match MediaCover ratio (23/17) + the row gap
    return columnWidth * (23 / 17) + gap;
  });
</script>

{#snippet listSkeleton()}
  {#if viewMode === "table"}
    <div class="w-full overflow-x-auto">
      <table
        class="w-full text-left border-separate border-spacing-0 table-fixed min-w-5xl"
      >
        <colgroup>
          <col class="w-16" />
          <col />
          <col class="w-24" />
          <col class="w-32" />
          <col class="w-28" />
        </colgroup>
        <tbody>
          <!-- Category Label Skeleton -->
          <tr class="category-label scroll-mt-24">
            <td colspan="5" class="pb-6 p-0">
              <div class="flex items-center space-x-3">
                <div
                  class="w-1.5 h-6 rounded-full bg-accent animate-pulse"
                ></div>
                <h2
                  class="text-lg font-bold text-(--hako-fg) uppercase tracking-wider animate-pulse"
                >
                  LOADING
                </h2>
              </div>
            </td>
          </tr>
          <!-- Table Header Skeleton -->
          <tr class="text-[10px] uppercase text-(--c8) sticky top-0 z-20">
            <th
              class="p-4 w-16 text-center bg-(--surface) border-b border-(--surface-elevated) rounded-tl-xl"
            ></th>
            <th class="p-4 border-b bg-(--surface) border-(--surface-elevated)"
              >Title</th
            >
            <th
              class="p-4 text-center w-24 bg-(--surface) border-b border-(--surface-elevated)"
              >Score</th
            >
            <th
              class="p-4 text-center w-32 bg-(--surface) border-b border-(--surface-elevated)"
              >Progress</th
            >
            <th
              class="p-4 text-center w-28 bg-(--surface) border-b border-(--surface-elevated) hidden sm:table-cell rounded-tr-xl"
              >Format</th
            >
          </tr>
          <!-- Data Row Skeletons -->
          {#each Array(8) as _, i}
            <tr class="group">
              <td
                class="p-2 border-b bg-(--surface) border-(--surface-elevated) {i ===
                7
                  ? 'rounded-bl-xl border-b-0'
                  : ''}"
              >
                <div
                  class="w-12 aspect-[17/23] bg-(--surface-elevated) animate-pulse rounded mx-auto"
                ></div>
              </td>
              <td
                class="p-4 border-b bg-(--surface) border-(--surface-elevated) {i ===
                7
                  ? 'border-b-0'
                  : ''}"
              >
                <div
                  class="h-5 w-48 bg-(--surface-elevated) animate-pulse rounded"
                ></div>
                <div class="flex flex-wrap gap-1 mt-1.5 sm:flex">
                  <Badge loading={true} />
                  <Badge loading={true} />
                </div>
              </td>
              <td
                class="p-4 text-center border-b bg-(--surface) border-(--surface-elevated) {i ===
                7
                  ? 'border-b-0'
                  : ''}"
              >
                <div
                  class="h-5 w-8 bg-(--surface-elevated) animate-pulse rounded mx-auto"
                ></div>
              </td>
              <td
                class="p-4 text-center border-b bg-(--surface) border-(--surface-elevated) {i ===
                7
                  ? 'border-b-0'
                  : ''}"
              >
                <div
                  class="h-5 w-12 bg-(--surface-elevated) animate-pulse rounded mx-auto"
                ></div>
              </td>
              <td
                class="p-4 text-center border-b bg-(--surface) border-(--surface-elevated) hidden sm:table-cell {i ===
                7
                  ? 'rounded-br-xl border-b-0'
                  : ''}"
              >
                <div
                  class="h-[18px] w-12 bg-(--surface-elevated) animate-pulse rounded mx-auto"
                ></div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div class="space-y-10">
      <section class="space-y-6">
        <div class="flex items-center space-x-3 mb-6">
          <div class="w-1.5 h-6 rounded-full bg-accent animate-pulse"></div>
          <h2
            class="text-lg font-bold text-(--hako-fg) uppercase tracking-wider animate-pulse"
          >
            LOADING
          </h2>
        </div>
        <div
          class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 p-4 rounded-xl overflow-hidden"
        >
          {#each Array(12) as _}
            <div
              class="bg-card rounded-xl overflow-hidden shadow-md border border-(--surface-elevated) flex flex-col h-full animate-pulse"
            >
              <div class="aspect-[2/3] bg-(--surface-elevated)"></div>
            </div>
          {/each}
        </div>
      </section>
    </div>
  {/if}
{/snippet}

<div class="flex flex-col lg:flex-row gap-8 w-full">
  <!-- Sidebar -->
  <aside class="lg:w-1/4 xl:w-1/5 order-2 lg:order-1 shrink-0">
    <div class="sticky top-24 space-y-6">
      <div class="bg-card rounded-xl p-5 space-y-4">
        <SearchInput
          value={searchQuery}
          oninput={handleSearchInput}
          placeholder="Search"
          label="Search List"
        />
        <div>
          <Select
            value={sortBy}
            onchange={(val) => setSort(val)}
            label="Sort By"
            items={[
              { label: "Title", value: "Title" },
              { label: "Score", value: "Score" },
              { label: "Progress", value: "Progress" },
              { label: "Last Updated", value: "Last Updated" },
            ]}
          />
        </div>
        <div class="flex items-center justify-between">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="text-xs font-bold text-slate-400 uppercase">View</label>
          <SegmentedControl
            value={viewMode}
            onchange={(val) => setTimeout(() => (viewMode = val as any), 0)}
            options={[
              { label: "Table", value: "table" },
              { label: "Grid", value: "grid" },
            ]}
          />
        </div>
      </div>

      <div class="bg-card rounded-xl overflow-hidden shadow-sm">
        <div class="p-4">
          <h3
            class="text-xs font-bold uppercase tracking-widest text-(--hako-fg) flex items-center"
          >
            <i class="fa-solid fa-layer-group text-accent mr-2"></i> Categories
          </h3>
        </div>
        <div class="flex flex-col">
          <button
            onclick={() => setFilter("all", true)}
            class="flex items-center justify-between px-4 py-3 text-sm font-medium transition-all border-l-4 ring-0 outline-none {filterStatus ===
            'all'
              ? 'text-(--hako-fg) bg-(--surface-elevated) border-(--hako-accent)'
              : 'text-slate-400 hover:text-(--hako-fg) border-transparent hover:bg-card'}"
          >
            <div class="flex items-center">
              <span class="w-2 h-2 rounded-full mr-3 bg-(--c7)"></span>
              <span>All {formatType(type)}</span>
            </div>
            <span class="count text-xs text-slate-500">{statusCounts.all}</span>
          </button>
          {#each statusGroups as group}
            <button
              onclick={() => setFilter(group.id, true)}
              class="flex items-center justify-between px-4 py-3 text-sm font-medium ring-0 outline-none {filterStatus ===
              group.id
                ? 'text-(--hako-fg) bg-(--surface-elevated) border-l-4 border-(--hako-accent)'
                : 'text-slate-400 hover:text-(--c15) border-l-4 border-transparent hover:bg-card'}"
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
    </div>
  </aside>

  <!-- Main Content -->
  <main class="lg:flex-1 order-1 lg:order-2 space-y-10 min-h-100">
    <div id="media-list-container" class="space-y-10 scroll-mt-24">
      {#if isReallyLoading}
        {@render listSkeleton()}
      {:else if allGroups.length === 0}
        <div class="p-10 text-center text-[20px] text-slate-500">
          This box is currently empty... ( ｡_｡)
        </div>
      {:else if viewMode === "table"}
        <div class="w-full overflow-x-auto">
          <VirtualScroll
            items={flattenedTableRows}
            itemHeight={105}
            columns={1}
            class="w-full"
            fallback={listSkeleton}
          >
            {#snippet children({
              visibleItems,
              topSpacerHeight,
              bottomSpacerHeight,
              virtualizer,
            })}
              <table
                class="w-full text-left border-separate border-spacing-0 table-fixed min-w-5xl"
              >
                <colgroup>
                  <col class="w-16" />
                  <col />
                  <col class="w-24" />
                  <col class="w-32" />
                  <col class="w-28" />
                </colgroup>
                <tbody>
                  {#if topSpacerHeight > 0}
                    <tr style="height: {topSpacerHeight}px;"
                      ><td colspan="5"></td></tr
                    >
                  {/if}
                  {#each visibleItems as row, i (row.type === "category-label" ? `label-${row.group.id}` : row.type === "table-header" ? `header-${i}` : row.type === "category-spacer" ? `spacer-${i}` : `item-${row.item.media_id}`)}
                    {#if row.type === "category-label"}
                      <tr
                        use:virtualizer.measureElement
                        data-index={virtualizer.getVirtualItems()[i]?.index}
                        class="category-label scroll-mt-24"
                      >
                        <td colspan="5" class="pb-6 p-0">
                          <div class="flex items-center space-x-3">
                            <div
                              class="w-1.5 h-6 rounded-full"
                              style="background-color: {STATUS_COLORS[
                                row.group.id
                              ]}"
                            ></div>
                            <h2
                              class="text-lg font-bold text-(--hako-fg) uppercase tracking-wider"
                            >
                              {row.group.label}
                            </h2>
                          </div>
                        </td>
                      </tr>
                    {:else if row.type === "table-header"}
                      <tr
                        use:virtualizer.measureElement
                        data-index={virtualizer.getVirtualItems()[i]?.index}
                        class="text-[10px] uppercase text-(--c8) sticky top-0 z-20"
                      >
                        <th
                          class="p-4 w-16 text-center bg-(--surface) border-b border-(--surface-elevated) rounded-tl-xl"
                        ></th>
                        <th
                          class="p-4 border-b bg-(--surface) border-(--surface-elevated)"
                          >Title</th
                        >
                        <th
                          class="p-4 text-center w-24 bg-(--surface) border-b border-(--surface-elevated)"
                          >Score</th
                        >
                        <th
                          class="p-4 text-center w-32 bg-(--surface) border-b border-(--surface-elevated)"
                          >Progress</th
                        >
                        <th
                          class="p-4 text-center w-28 bg-(--surface) border-b border-(--surface-elevated) hidden sm:table-cell rounded-tr-xl"
                          >Format</th
                        >
                      </tr>
                    {:else if row.type === "category-spacer"}
                      <tr
                        use:virtualizer.measureElement
                        data-index={virtualizer.getVirtualItems()[i]?.index}
                        class="category-spacer h-10"
                      >
                        <td colspan="5"></td>
                      </tr>
                    {:else}
                      {@const { item, isLast } = row}
                      {@const meta = metadata[item.media_id.toString()] || {}}
                      {@const total =
                        type === "manga" ||
                        type === "lightnovel" ||
                        type === "light_novel"
                          ? (meta.chapters ?? "?")
                          : (meta.episodes ?? "?")}
                      {@const displayTitle =
                        getDisplayTitle(meta.title, settings.titlePreference) ||
                        "Unknown Title"}
                      <tr
                        use:virtualizer.measureElement
                        data-index={virtualizer.getVirtualItems()[i]?.index}
                        class="group last:border-0 {isLast
                          ? 'rounded-b-xl'
                          : ''}"
                      >
                        <td
                          class="p-2 border-b bg-(--surface) border-(--surface-elevated) group-hover:!bg-[color-mix(in_srgb,var(--surface-elevated)_80%,transparent)] transition-colors {isLast
                            ? 'rounded-bl-xl border-b-0'
                            : ''}"
                        >
                          <MediaCover
                            mediaId={item.media_id}
                            {type}
                            size="small"
                            alt={displayTitle}
                            class="mx-auto group-hover:scale-105 transition-transform"
                            showTooltip={false}
                            prefetchedMedia={meta}
                          />
                        </td>
                        <td
                          class="p-4 cursor-pointer border-b bg-(--surface) border-(--surface-elevated) group-hover:!bg-[color-mix(in_srgb,var(--surface-elevated)_80%,transparent)] transition-colors {isLast
                            ? 'border-b-0'
                            : ''}"
                          onclick={() => handleOpenEditor(item.media_id)}
                        >
                          <div
                            class="text-sm font-bold text-(--hako-fg) truncate sm:whitespace-normal"
                          >
                            {displayTitle}
                          </div>
                          <div class="flex flex-wrap gap-1 mt-1.5 sm:flex">
                            {#each meta.genres?.slice(0, 5) || [] as genre}
                              <Badge label={genre} variant="genre" />
                            {/each}
                          </div>
                        </td>
                        <td
                          class="bg-(--surface) group-hover:!bg-[color-mix(in_srgb,var(--surface-elevated)_80%,transparent)] transition-colors p-4 text-center text-sm font-mono {getScoreColor(
                            item.score,
                          )} border-b border-(--surface-elevated) group-last:border-0 {isLast
                            ? 'border-b-0'
                            : ''}">{item.score?.toFixed(1) || "—"}</td
                        >
                        <td
                          class="bg-(--surface) group-hover:!bg-[color-mix(in_srgb,var(--surface-elevated)_80%,transparent)] transition-colors p-4 text-center text-sm font-mono text-(--hako-fg) border-b border-(--surface-elevated) group-last:border-0 {isLast
                            ? 'border-b-0'
                            : ''}"
                        >
                          <span class="text-(--hako-fg)">{item.progress}</span
                          ><span class="text-(--c8) mx-1">/</span><span
                            class="text-(--c8) text-xs">{total}</span
                          >
                        </td>
                        <td
                          class="bg-(--surface) group-hover:!bg-[color-mix(in_srgb,var(--surface-elevated)_80%,transparent)] transition-colors p-4 text-center border-b border-(--surface-elevated) group-last:border-0 hidden sm:table-cell {isLast
                            ? 'rounded-br-xl border-b-0'
                            : ''}"
                        >
                          <span
                            class="text-[10px] font-bold bg-(--surface-dim) px-2 py-1 rounded text-slate-400 border border-(--surface-elevated)"
                            >{(meta.format || "TV").replace(/_/g, " ")}</span
                          >
                        </td>
                      </tr>
                    {/if}
                  {/each}
                  {#if bottomSpacerHeight > 0}
                    <tr style="height: {bottomSpacerHeight}px;"
                      ><td colspan="5"></td></tr
                    >
                  {/if}
                </tbody>
              </table>
            {/snippet}
          </VirtualScroll>
        </div>
      {:else}
        {#each allGroups as group (group.id)}
          <section
            class="space-y-4 scroll-mt-24 category-section {filterStatus !==
              'all' && filterStatus !== group.id
              ? 'hidden'
              : ''}"
          >
            <div class="flex items-center space-x-3 mb-6">
              <div
                class="w-1.5 h-6 rounded-full"
                style="background-color: {STATUS_COLORS[group.id]}"
              ></div>
              <h2
                class="text-lg font-bold text-(--hako-fg) uppercase tracking-wider"
              >
                {group.label}
              </h2>
            </div>
            <div
              class="rounded-xl overflow-hidden shadow-sm w-full"
              bind:clientWidth={gridWidth}
            >
              <VirtualScroll
                enabled={filterStatus === "all" || filterStatus === group.id}
                items={group.items}
                itemHeight={gridRowHeight}
                {columns}
                gap={16}
                class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 p-4"
                fallback={listSkeleton}
              >
                {#snippet children({
                  visibleItems,
                  topSpacerHeight,
                  bottomSpacerHeight,
                  virtualizer,
                })}
                  {#if topSpacerHeight > 0}
                    <div
                      style="height: {topSpacerHeight}px; grid-column: 1 / -1;"
                    ></div>
                  {/if}
                  {#each visibleItems as item, i (item.media_id)}
                    {@const meta = metadata[item.media_id.toString()] || {}}
                    {@const total =
                      type === "manga" ||
                      type === "light_novel" ||
                      type === "lightnovel"
                        ? (meta.chapters ?? "?")
                        : (meta.episodes ?? "?")}
                    {@const displayTitle =
                      getDisplayTitle(meta.title, settings.titlePreference) ||
                      "Unknown Title"}
                    <div
                      class="relative group"
                      data-index={virtualizer.getVirtualItems()[
                        Math.floor(i / columns)
                      ]?.index}
                    >
                      <MediaCover
                        mediaId={item.media_id}
                        {type}
                        size="medium"
                        alt={displayTitle}
                        class="w-full aspect-2/3 rounded-md"
                        showTooltip={false}
                        prefetchedMedia={meta}
                      />
                      <div
                        class="absolute bottom-0 left-0 right-0 bg-(--hako-bg)/80 p-2 text-(--hako-fg) opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"
                      >
                        <div
                          class="text-xs font-bold truncate"
                          title={displayTitle}
                        >
                          {displayTitle}
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
                  {#if bottomSpacerHeight > 0}
                    <div
                      style="height: {bottomSpacerHeight}px; grid-column: 1 / -1;"
                    ></div>
                  {/if}
                {/snippet}
              </VirtualScroll>
            </div>
          </section>
        {/each}
      {/if}
    </div>
  </main>
</div>

<!-- wtf you mean I need an inline style block to override the group hover background color? -->
<style>
  tr.group:hover td {
    background-color: color-mix(
      in srgb,
      var(--surface-elevated) 30%
    ) !important;
  }
</style>
