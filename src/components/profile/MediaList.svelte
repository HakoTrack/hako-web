<script>
  import { onMount } from "svelte";
  import Fuse from "fuse.js";
  import { openQuickEditor, ui } from "../../core/ui.svelte.js";
  import { ListService } from "../../services/listService.js";
  import { MetadataService } from "../../services/metadataService.js";
  import { HakoImage } from "../../utils/images.js";

  let { type = "anime", profileId } = $props();

  let listDataEntries = $state([]);
  let metadata = $state({});
  let sortBy = $state("Title");
  let filterStatus = $state("all");
  let searchQuery = $state("");
  let isLoading = $state(true);

  // Memoization variables
  let lastProcessed = null;
  let lastListEntries = null;
  let lastMetadata = null;
  let lastSortBy = null;
  let lastFilterStatus = null;
  let lastSearchQuery = null;

  const statusGroups = [
    {
      id: "current",
      label: type === "anime" ? "Watching" : "Reading",
      color: "bg-green-500",
    },
    { id: "completed", label: "Completed", color: "bg-sky-500" },
    { id: "paused", label: "Paused", color: "bg-orange-500" },
    { id: "dropped", label: "Dropped", color: "bg-red-500" },
    { id: "planning", label: "Planning", color: "bg-slate-500" },
  ];

  onMount(async () => {
    try {
      listDataEntries = await ListService.getList(profileId, type);
      const ids = listDataEntries.map((item) => item.media_id);
      metadata = await MetadataService.getMetadata(ids, type);
    } catch (err) {
      console.error(err);
    } finally {
      isLoading = false;
    }
  });

  function getScoreColor(score) {
    if (!score) return "text-slate-500";
    if (score >= 9) return "text-green-400";
    if (score >= 8) return "text-blue-400";
    if (score >= 7) return "text-slate-400";
    if (score >= 5) return "text-yellow-400";
    return "text-red-400";
  }

  let visibleGroups = $derived.by(() => {
    if (
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
        displayTitle: meta.title?.romaji || item.title || "",
      };
    });

    // Fuzzy search with Fuse.js
    let itemsToProcess = processedItems;
    if (searchQuery.length > 0) {
      const fuse = new Fuse(processedItems, {
        keys: ["displayTitle"],
        threshold: 0.3,
      });
      itemsToProcess = fuse.search(searchQuery).map((r) => r.item);
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
            return new Date(b.updatedAt) - new Date(a.updatedAt);
          });
        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);

    lastProcessed = result;
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

      <div class="bg-card rounded-xl border border-slate-800 overflow-hidden">
        <div class="p-4">
          <h3
            class="text-xs font-bold uppercase tracking-widest text-white flex items-center"
          >
            <i class="fa-solid fa-layer-group text-accent mr-2"></i> Categories
          </h3>
        </div>
        <button
          onclick={() => (filterStatus = "all")}
          class="flex items-center justify-between px-4 py-3 text-sm font-medium {filterStatus ===
          'all'
            ? 'text-white bg-slate-800/50 border-l-4 border-accent'
            : 'text-slate-400 hover:text-white border-l-4 border-transparent'} transition-all w-full"
        >
          <span>All {type.charAt(0).toUpperCase() + type.slice(1)}</span>
          <span
            class="count text-xs text-slate-500 bg-[#0b1622] px-2 py-0.5 rounded"
            >{listDataEntries.length}</span
          >
        </button>
        {#each statusGroups as group}
          <button
            onclick={() => (filterStatus = group.id)}
            class="flex items-center justify-between px-4 py-3 text-sm font-medium {filterStatus ===
            group.id
              ? 'text-white bg-slate-800/50 border-l-4 border-accent'
              : 'text-slate-400 hover:text-white border-l-4 border-transparent'} transition-all w-full"
          >
            <span>{group.label}</span>
            <span class="count text-xs text-slate-500"
              >{listDataEntries.filter(
                (i) => (i.status || "").toLowerCase() === group.id,
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
            <div class="w-1.5 h-6 {group.color} rounded-full"></div>
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
                  <th class="p-4 text-center">Score</th>
                  <th class="p-4 text-center">Progress</th>
                  <th class="p-4 text-center">Format</th>
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
                    <td class="p-2 text-center">
                      <img
                        src={HakoImage.getCover(type, item.media_id, "small")}
                        class="w-12 h-16 object-cover rounded shadow-md cursor-pointer group-hover:scale-105 transition-transform"
                        onclick={() => openQuickEditor(item.media_id, type)}
                        alt={displayTitle}
                      />
                    </td>
                    <td
                      class="p-4 cursor-pointer"
                      onclick={() => openQuickEditor(item.media_id, type)}
                    >
                      <div
                        class="text-sm font-bold text-slate-200 group-hover:text-accent transition-colors"
                      >
                        {displayTitle}
                      </div>
                      <div class="text-[10px] text-slate-500 mt-1 uppercase">
                        {meta.genres?.slice(0, 3).join(" • ") || ""}
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
