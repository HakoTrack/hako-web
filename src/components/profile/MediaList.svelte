<script lang="ts">
  import Fuse from "fuse.js";
  import { openQuickEditor } from "../../core/ui.svelte";
  import { ListService } from "../../services/listService";
  import { MetadataService } from "../../services/metadataService";
  import { HakoImage } from "../../utils/images";
  import { fetchMediaById } from "../../utils/mediaData";
  import type { Media, ListEntry } from "../../types/index";

  let { type = "anime", profileId } = $props<{
    type?: string;
    profileId: string;
  }>();

  let listDataEntries: ListEntry[] = $state([]);
  let metadata: Record<string, Media> = $state({});
  let imageLoaded: Record<number, boolean> = $state({});
  let sortBy = $state("Title");
  let filterStatus = $state("all");
  let searchQuery = $state("");
  let isLoading = $state(true);

  // Memoization variables
  let lastProcessed: any = null;
  let lastListEntries: ListEntry[] | null = null;
  let lastMetadata: Record<string, Media> | null = null;
  let lastSortBy: string | null = null;
  let lastFilterStatus: string | null = null;
  let lastSearchQuery: string | null = null;

  const statusGroups = $derived([
    {
      id: "current",
      label: type === "anime" ? "Watching" : "Reading",
      color: "bg-green-500",
    },
    { id: "completed", label: "Completed", color: "bg-sky-500" },
    { id: "paused", label: "Paused", color: "bg-orange-500" },
    { id: "dropped", label: "Dropped", color: "bg-red-500" },
    { id: "planning", label: "Planning", color: "bg-slate-500" },
  ]);

  function formatType(t: string): string {
    if (t === "light_novel" || t === "lightnovel") return "Light Novels";
    if (t === "anime") return "Anime";
    if (t === "manga") return "Manga";
    return t.charAt(0).toUpperCase() + t.slice(1) + "s";
  }

  const statusColors: Record<string, string> = {
    current: "var(--c2)",
    completed: "var(--c12)",
    paused: "var(--c3)",
    dropped: "var(--c1)",
    planning: "var(--c8)",
  };

  let hasFetched = $state(false);

  // Sync state whenever the profileId or type arrives/changes
  $effect(() => {
    if (profileId && type) {
      // Synchronously clear and show spinner to prevent hang
      isLoading = true;
      listDataEntries = [];
      loadData();
    }
  });

  async function loadData() {
    const result = await ListService.getList(profileId, type);
    if (result.success) {
      // Yield to the main thread so the browser can paint the spinner
      await new Promise((resolve) => setTimeout(resolve, 0));

      listDataEntries = result.data;
      const ids = listDataEntries.map((item) => item.media_id);
      metadata = await MetadataService.getMetadata(ids, type);
      isLoading = false;
    } else {
      console.error("Error loading list:", result.error);
      isLoading = false;
    }
  }

  function getScoreColor(score: number | null): string {
    if (!score) return "text-slate-500";
    if (score >= 9) return "text-green-400";
    if (score >= 8) return "text-blue-400";
    if (score >= 7) return "text-slate-400";
    if (score >= 5) return "text-yellow-400";
    return "text-red-400";
  }

  async function handleOpenEditor(id: number) {
    const media = await fetchMediaById(id);
    if (media) openQuickEditor(media, type);
  }

  // Memoization variables for visibleGroups
  let lastType: string | null = null;

  let visibleGroups = $derived.by(() => {
    // Short-circuit heavy processing while loading or empty
    if (isLoading || listDataEntries.length === 0) return [];

    if (
      lastType === type &&
      lastListEntries === listDataEntries &&
      lastMetadata === metadata &&
      lastSortBy === sortBy &&
      lastFilterStatus === filterStatus &&
      lastSearchQuery === searchQuery
    ) {
      return lastProcessed;
    }

    const groups = statusGroups.filter(
      (g) => filterStatus === "all" || g.id === filterStatus,
    );

    const processedItems = listDataEntries.map((item) => {
      const meta = metadata[item.media_id?.toString()] || {};
      return {
        ...item,
        meta,
        displayTitle: (meta as any).title?.romaji || (item as any).title || "",
      };
    });

    // Fuzzy search with Fuse.js
    let itemsToProcess = processedItems;
    if (searchQuery.length > 0) {
      const fuse = new Fuse(processedItems, {
        keys: ["displayTitle"],
        threshold: 0.3,
      });
      itemsToProcess = fuse.search(searchQuery).map((r: any) => r.item);
    }

    const result = groups
      .map((group) => {
        let items = itemsToProcess
          .filter((item) => (item.status || "").toLowerCase() === group.id)
          .sort((a, b) => {
            if (sortBy === "Title")
              return a.displayTitle.localeCompare(b.displayTitle);
            if (sortBy === "Score") return (b.score || 0) - (a.score || 0);
            if (sortBy === "Progress")
              return (b.progress || 0) - (a.progress || 0);
            return (
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
          });
        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);

    lastProcessed = result;
    lastType = type;
    lastListEntries = listDataEntries;
    lastMetadata = metadata;
    lastSortBy = sortBy;
    lastFilterStatus = filterStatus;
    lastSearchQuery = searchQuery;

    return result;
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
        <div>
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label
            class="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2"
            >Search List</label
          >
          <div class="relative">
            <input
              type="text"
              placeholder="Filter titles..."
              bind:value={searchQuery}
              class="w-full bg-[#0b1622] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:ring-1 focus:ring-accent pl-9"
            />
            <i
              class="fa-solid fa-search absolute left-3 top-2.5 text-slate-600 text-xs"
            ></i>
          </div>
        </div>
        <div>
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label
            class="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2"
            >Sort By</label
          >
          <select
            bind:value={sortBy}
            class="w-full bg-[#0b1622] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:ring-1 focus:ring-accent"
          >
            <option>Title</option>
            <option>Score</option>
            <option>Progress</option>
            <option>Last Updated</option>
          </select>
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
          onclick={() => (filterStatus = "all")}
          class="flex items-center justify-between px-4 py-3 text-sm font-medium w-full transition-all border-l-4 {filterStatus ===
          'all'
            ? 'text-white bg-(--surface-dim) border-accent'
            : 'text-slate-400 hover:text-white border-transparent'} transition-all w-full"
        >
          <div class="flex items-center">
            <span class="w-2 h-2 rounded-full mr-3 bg-(--c7)"></span>
            <span>All {formatType(type)}</span>
          </div>
          <span class="count text-xs text-slate-500"
            >{listDataEntries.length}</span
          >
        </button>

        {#each statusGroups as group}
          <button
            onclick={() => (filterStatus = group.id)}
            class="flex items-center justify-between px-4 py-3 text-sm font-medium {filterStatus ===
            group.id
              ? 'text-white bg-(--surface-dim) border-l-4 border-accent'
              : 'text-slate-400 hover:text-white border-l-4 border-transparent'} transition-all w-full"
          >
            <div class="flex items-center">
              <span
                class="w-2 h-2 rounded-full mr-3"
                style="background-color: {statusColors[group.id]}"
              ></span>
              <span>{group.label}</span>
            </div>
            <span class="count text-xs text-slate-500"
              >{listDataEntries.filter(
                (i: any) => (i.status || "").toLowerCase() === group.id,
              ).length}</span
            >
          </button>
        {/each}
      </div>
    </div>
  </aside>
  <main class="lg:w-[80%] order-1 lg:order-2 space-y-10 min-h-100">
    {#if isLoading}
      <div class="flex items-center justify-center p-20">
        <i class="fa-solid fa-circle-notch fa-spin text-accent text-2xl"></i>
      </div>
    {:else if visibleGroups.length === 0}
      <div class="p-10 text-center text-[20px] text-slate-500">
        This box is currently empty... ( ｡_｡)
      </div>
    {:else}
      {#each visibleGroups as group}
        <section
          class="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <div class="flex items-center space-x-3 mb-6">
            <div
              class="w-1.5 h-6 rounded-full"
              style="background-color: {statusColors[group.id]}"
            ></div>
            <h2 class="text-lg font-bold text-white uppercase tracking-wider">
              {group.label}
            </h2>
          </div>
          <div class="bg-card rounded-xl overflow-hidden shadow-sm">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr
                  class="text-[10px] uppercase text-slate-500 border-b border-slate-800"
                >
                  <th class="p-4 w-16 text-center"></th>
                  <th class="p-4">Title</th>
                  <th class="p-4 text-center w-24">Score</th>
                  <th class="p-4 text-center w-32">Progress</th>
                  <th class="p-4 text-center w-28">Format</th>
                </tr>
              </thead>
              <tbody>
                {#each group.items as item}
                  {@const meta = item.meta || {}}
                  {@const total =
                    type === "manga"
                      ? meta.chapters || item.total || "?"
                      : meta.episodes || item.total || "?"}
                  {@const displayTitle = item.displayTitle}
                  <tr
                    class="group hover:bg-slate-800/30 border-b border-slate-800/50 last:border-0"
                  >
                    <td class="p-2 text-center relative">
                      {#if !imageLoaded[item.media_id]}
                        <div
                          class="absolute inset-0 flex items-center justify-center"
                        >
                          <div
                            class="w-12 h-16 bg-slate-700 animate-pulse rounded shadow-md"
                          ></div>
                        </div>
                      {/if}
                      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <img
                        src={HakoImage.getCover(item.media_id, "small")}
                        class="w-12 h-16 object-cover rounded shadow-md cursor-pointer group-hover:scale-105 transition-transform {imageLoaded[
                          item.media_id
                        ]
                          ? 'opacity-100'
                          : 'opacity-0'}"
                        onclick={() => handleOpenEditor(item.media_id)}
                        alt={displayTitle}
                        loading="lazy"
                        onload={() => (imageLoaded[item.media_id] = true)}
                      />
                    </td>
                    <td
                      class="p-4 cursor-pointer"
                      onclick={() => handleOpenEditor(item.media_id)}
                    >
                      <div
                        class="text-sm font-bold text-slate-200 group-hover:text-accent transition-colors"
                      >
                        {displayTitle}
                      </div>
                      <div class="text-[10px] text-slate-500 mt-1 uppercase">
                        {(meta as any).genres?.slice(0, 3).join(" • ") || ""}
                      </div>
                    </td>
                    <td
                      class="p-4 text-center text-sm font-mono {getScoreColor(
                        item.score,
                      )}">{item.score?.toFixed(1) || "—"}</td
                    >
                    <td class="p-4 text-center text-sm font-mono text-white">
                      <span class="text-white">{item.progress}</span><span
                        class="text-slate-600 mx-1">/</span
                      ><span class="text-slate-500 text-xs">{total}</span>
                    </td>
                    <td class="p-4 text-center">
                      <span
                        class="text-[10px] font-bold bg-[#0b1622] px-2 py-1 rounded text-slate-400 border border-slate-800"
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
