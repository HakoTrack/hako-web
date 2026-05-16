<script>
  import { onMount } from "svelte";
  import { fetchAnimeByIds, fetchUserAnimeList } from "../utils/animeData.js";
  import { HakoImage } from "../utils/images.js";

  let { type = "anime", profileId } = $props();

  let listDataEntries = $state([]);
  let metadata = $state({});
  let sortBy = $state("Title");
  let filterStatus = $state("all");
  let searchQuery = $state("");
  let isLoading = $state(true);

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
      if (type === "anime") {
        listDataEntries = await fetchUserAnimeList(profileId);
        const ids = listDataEntries.map((item) => item.id);
        metadata = await fetchAnimeByIds(ids);
      }
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

  let visibleGroups = $derived(
    statusGroups
      .filter((group) => filterStatus === "all" || filterStatus === group.id)
      .map((group) => {
        let items = listDataEntries
          .filter((item) => {
            const matchesStatus = item.status.toLowerCase() === group.id;
            const meta = metadata[item.id.toString()] || {};
            const title = (
              meta.title?.romaji ||
              item.title ||
              ""
            ).toLowerCase();
            const matchesSearch = title.includes(searchQuery.toLowerCase());
            return matchesStatus && matchesSearch;
          })
          .sort((a, b) => {
            const metaA = metadata[a.id.toString()] || {};
            const metaB = metadata[b.id.toString()] || {};
            const titleA = (metaA.title?.romaji || a.title || "").toLowerCase();
            const titleB = (metaB.title?.romaji || b.title || "").toLowerCase();

            if (sortBy === "Title") return titleA.localeCompare(titleB);
            if (sortBy === "Score") return (b.score || 0) - (a.score || 0);
            if (sortBy === "Progress")
              return (b.progress || 0) - (a.progress || 0);
            return new Date(b.updatedAt) - new Date(a.updatedAt);
          });
        return { ...group, items };
      })
      .filter((group) => group.items.length > 0),
  );
</script>

<div
  class="flex flex-col lg:flex-row gap-8 mb-12 animate-in fade-in duration-300"
>
  <aside class="lg:w-[20%]">
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
              class="w-full bg-[#0b1622] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-accent pl-9"
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
            class="w-full bg-[#0b1622] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option>Title</option>
            <option>Score</option>
            <option>Progress</option>
            <option>Last Updated</option>
          </select>
        </div>
      </div>

      <div
        id="media-categories-sidebar"
        class="bg-card rounded-xl border border-slate-800 overflow-hidden"
      >
        <button
          onclick={() => (filterStatus = "all")}
          class="flex items-center justify-between px-4 py-3 text-sm font-medium {filterStatus ===
          'all'
            ? 'text-white bg-slate-800/50 border-l-4 border-accent'
            : 'text-slate-400 hover:text-white border-l-4 border-transparent'} transition-all w-full"
        >
          <span>All {type.charAt(0).toUpperCase() + type.slice(1)}</span>
          <span class="text-xs text-slate-500 bg-[#0b1622] px-2 py-0.5 rounded"
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
            <span class="text-xs text-slate-500"
              >{listDataEntries.filter(
                (i) => i.status.toLowerCase() === group.id,
              ).length}</span
            >
          </button>
        {/each}
      </div>
    </div>
  </aside>

  <main class="lg:w-[80%] space-y-10 min-h-[400px]">
    {#if isLoading}
      <div class="flex items-center justify-center p-20">
        <i class="fa-solid fa-circle-notch fa-spin text-accent text-2xl"></i>
      </div>
    {:else if visibleGroups.length === 0}
      <div class="p-10 text-center text-[20px] text-slate-500">
        This list is empty... (≖､≖╬)
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
                  class="text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-800"
                >
                  <th class="px-4 py-3 font-bold w-16 text-center"></th>
                  <th class="px-4 py-3 font-bold">Title</th>
                  <th class="px-4 py-3 font-bold text-center">Score</th>
                  <th class="px-4 py-3 font-bold text-center">Progress</th>
                  <th class="px-4 py-3 font-bold text-center">Format</th>
                </tr>
              </thead>
              <tbody>
                {#each group.items as item}
                  {@const meta = metadata[item.id.toString()] || {}}
                  {@const total =
                    type === "manga"
                      ? meta.chapters || item.total || "?"
                      : meta.episodes || item.total || "?"}
                  {@const displayTitle = meta.title?.romaji || item.title}
                  <tr
                    class="group hover:bg-slate-800/30 transition-colors border-b border-slate-800/50 last:border-0"
                  >
                    <td class="p-2 text-center">
                      <img
                        loading="lazy"
                        src={HakoImage.getCover(type, item.id, "small")}
                        alt={displayTitle}
                        onerror={(e) =>
                          (e.target.src =
                            item.image ||
                            "/assets/covers/placeholder_medium.jpg")}
                        data-media-id={item.id}
                        onclick={() => window.openQuickEditor(item.id)}
                        onmouseover={() =>
                          HakoImage.prefetchBanner(type, item.id)}
                        class="media-cover w-12 h-16 object-cover rounded shadow-md group-hover:scale-105 transition-transform inline-block cursor-pointer"
                      />
                    </td>
                    <td class="px-4 py-3">
                      <div
                        class="text-sm font-bold text-slate-200 group-hover:text-accent transition-colors cursor-pointer"
                        onclick={() => window.openQuickEditor(item.id)}
                      >
                        {displayTitle}
                      </div>
                      <div class="text-[10px] text-slate-500 mt-1 uppercase">
                        {meta.genres?.slice(0, 3).join(" • ") || ""}
                      </div>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span
                        class="text-sm font-mono {getScoreColor(item.score)}"
                        >{item.score?.toFixed(1) || "—"}</span
                      >
                    </td>
                    <td class="px-4 py-3 text-center font-mono text-sm">
                      <span class="text-white">{item.progress}</span><span
                        class="text-slate-600 mx-1">/</span
                      ><span class="text-slate-500 text-xs">{total}</span>
                    </td>
                    <td class="px-4 py-3 text-center">
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
