<script lang="ts">
  import { ui, closeModal } from "../../core/ui.svelte";
  import { getVibes } from "../../utils/vibeCalc";
  import { HakoImage } from "../../utils/images";
  import { supabase } from "../../utils/supabase";
  import { AuthService } from "../../core/auth";
  import { FeedService } from "../../services/feedService";
  import { ListService } from "../../services/listService";
  import { FavoritesService } from "../../services/favoritesService";
  import { formatDescription } from "../../utils/mediaData";

  let { entry: initialEntry } = $props<{ entry: any }>();
  let entry = $state(initialEntry);

  $effect(() => {
    if (ui.modalData?.entry) {
      entry = ui.modalData.entry;
    }
  });

  const mediaType = entry.type || "anime";

  // Reactive vibes based on raw metadata
  let vibes = $derived(getVibes(entry?.rawMetadata));

  // Determine favorite status reactively from the global Set
  let isFavorited = $derived(ui.favoriteIds.has(entry.id));

  // Bindable local state for the form
  let status = $state("planning");
  let score = $state(0);
  let progress = $state(0);
  let startDate = $state("");
  let finishDate = $state("");
  let isSaving = $state(false);
  let isLoaded = $state(false);

  // Sync state whenever the entry or modalData changes
  $effect(() => {
    // 1. Merge entry if background data is available
    entry = ui.modalData?.entry || initialEntry;

    // 2. Set loading status
    isLoaded = ui.modalData ? !ui.modalData.isFetching : true;

    // 3. Update form fields
    status = entry.status || "planning";
    score = entry.score || 0;
    progress = entry.progress || 0;

    startDate = entry.startedAt?.year
      ? `${entry.startedAt.year}-${String(entry.startedAt.month).padStart(2, "0")}-${String(entry.startedAt.day).padStart(2, "0")}`
      : "";
    finishDate = entry.completedAt?.year
      ? `${entry.completedAt.year}-${String(entry.completedAt.month).padStart(2, "0")}-${String(entry.completedAt.day).padStart(2, "0")}`
      : "";

    // 4. Async favorite check (only once per entry load)
    if (entry?.id && !isFavorited && !ui.favoriteIds.has(entry.id)) {
      supabase
        .from("profile_favorites")
        .select("media_id")
        .eq("media_id", entry.id)
        .then(({ data }) => {
          if (data && data.length > 0) ui.addFavorite(entry.id);
        });
    }
  });

  async function toggleFavorite() {
    const user = await AuthService.getCurrentUser();
    if (!user) return;
    await FavoritesService.toggle(user.id, entry.id, isFavorited);
  }

  async function save() {
    isSaving = true;
    const user = await AuthService.getCurrentUser();
    if (!user) return;

    try {
      const updateResult = await ListService.updateListEntry(
        user.id,
        mediaType,
        entry.id,
        {
          status,
          score: score > 0 && score <= 10 ? score : null,
          progress,
          started_at: startDate || null,
          completed_at: finishDate || null,
        },
      );

      if (!updateResult.success) throw new Error(updateResult.error);

      const postResult = await FeedService.createListUpdatePost(
        user.id,
        user.id,
        entry.id,
        entry.title,
        progress,
        entry.total,
        status === "completed" ? "completed" : "updated",
      );

      if (!postResult.success) throw new Error(postResult.error);

      closeModal();
    } catch (err: any) {
      console.error("Save error:", err);
      alert("Failed to save changes: " + (err.message || "Unknown error"));
    } finally {
      isSaving = false;
    }
  }

  function handleDelete() {
    if (confirm("Delete this entry?")) closeModal();
  }

  function navigateToMedia() {
    const typeSlug = mediaType === "light_novel" ? "lightnovel" : mediaType;
    window.history.pushState({}, "", `/${typeSlug}/${entry.id}`);
    window.dispatchEvent(new Event("popstate"));
    closeModal();
  }
</script>

<div
  class="bg-[#151f2e] w-[700px] max-w-[90vw] h-200 max-h-[90vh] rounded-md shadow-2xl duration-300 transition-all ease-out animate-unroll flex flex-col"
  onclick={(e) => e.stopPropagation()}
>
  <!-- Banner Section -->
  <div class="relative w-full h-40 bg-[#0b1622] shrink-0">
    <img
      src={HakoImage.getBanner(entry.id, 700)}
      class="w-full h-full object-cover opacity-60"
      alt="banner"
      onerror={(e) => (e.target.src = "")}
    />
    <div
      class="absolute inset-0 bg-linear-to-t from-[#151f2e] to-transparent"
    ></div>
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <button
      onclick={() => closeModal()}
      class="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-50"
    >
      <i class="fa-solid fa-xmark text-lg cursor-pointer"></i>
    </button>
    <div
      class="absolute -bottom-10 left-8 flex items-end space-x-6 z-10 w-[calc(100%-4rem)]"
    >
      <img
        src={HakoImage.getCover(entry.id, "medium")}
        class="w-25 h-35 rounded shadow-xl border border-[#151f2e] object-cover bg-[#0b1622]"
        alt="cover"
        onerror={(e) =>
          (e.target.src =
            "https://ik.imagekit.io/HakoImage/covers/placeholder.jpg?tr=w-240,f=webp")}
      />
      <div class="flex-1 min-w-0">
        <h2
          class="text-white font-bold text-xl leading-tight truncate drop-shadow-md cursor-pointer hover:text-accent transition-colors"
          onclick={navigateToMedia}
        >
          {entry.title}
        </h2>
        <div class="flex flex-wrap gap-1.5 mt-2">
          {#each entry.genres as genre}
            <span
              class="bg-blue-500/10 text-blue-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider"
            >
              {genre}
            </span>
          {/each}
        </div>
        <div class="flex flex-wrap gap-1.5 mt-1.5">
          {#if vibes && vibes.sorted}
            {#each vibes.sorted.slice(0, 3) as pillar, i}
              <span
                class="{i === 0
                  ? 'bg-accent text-white'
                  : 'bg-slate-800 text-slate-400'} text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider"
              >
                {pillar.name}
              </span>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Editor Content -->
  <div class="flex-1 flex flex-col min-h-0 px-8 pt-16 pb-6 overflow-hidden">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6 shrink-0">
      <div class="space-y-1.5">
        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider"
          >Status</label
        >
        {#if !isLoaded}
          <div class="w-full h-[40px] bg-slate-700 animate-pulse rounded"></div>
        {:else}
          <select
            bind:value={status}
            class="w-full bg-[#0b1622] text-slate-200 text-sm rounded border-none p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none cursor-pointer"
          >
            <option value="current"
              >{mediaType === "anime" ? "Watching" : "Reading"}</option
            >
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
            <option value="dropped">Dropped</option>
            <option value="planning">Planning</option>
          </select>
        {/if}
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider"
          >Score</label
        >
        {#if !isLoaded}
          <div class="w-full h-[40px] bg-slate-700 animate-pulse rounded"></div>
        {:else}
          <input
            type="number"
            step="0.1"
            max="10"
            min="0"
            bind:value={score}
            class="w-full bg-[#0b1622] text-slate-200 text-sm rounded border-none p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none"
          />
        {/if}
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider"
          >Progress</label
        >
        {#if !isLoaded}
          <div class="w-full h-[40px] bg-slate-700 animate-pulse rounded"></div>
        {:else}
          <div class="flex items-center space-x-2">
            <input
              type="number"
              bind:value={progress}
              class="w-full bg-[#0b1622] text-slate-200 text-sm rounded border-none p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none"
            />
            <span class="text-slate-500 text-sm font-medium whitespace-nowrap"
              >/ {entry.total}</span
            >
          </div>
        {/if}
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider"
          >Start Date</label
        >
        {#if !isLoaded}
          <div class="w-full h-[40px] bg-slate-700 animate-pulse rounded"></div>
        {:else}
          <input
            type="date"
            bind:value={startDate}
            class="w-full bg-[#0b1622] text-slate-200 text-sm rounded border-none p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none"
          />
        {/if}
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider"
          >Finish Date</label
        >
        {#if !isLoaded}
          <div class="w-full h-[40px] bg-slate-700 animate-pulse rounded"></div>
        {:else}
          <input
            type="date"
            bind:value={finishDate}
            class="w-full bg-[#0b1622] text-slate-200 text-sm rounded border-none p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none"
          />
        {/if}
      </div>
    </div>

    <!-- Description -->
    <div class="mt-8 flex-1 flex flex-col min-h-[200px] w-full">
      <label
        class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 shrink-0"
        >Description</label
      >
      <div
        class="text-slate-400 text-sm leading-relaxed overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800 flex-1 w-full"
      >
        {@html formatDescription(entry.description)}
      </div>
    </div>

    <!-- Footer -->
    <div
      class="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between shrink-0"
    >
      <button
        onclick={handleDelete}
        class="text-red-500/60 hover:text-red-500 text-sm font-bold transition-colors cursor-pointer"
        >Delete</button
      >
      <div class="flex items-center space-x-6">
        <!-- svelte-ignore a11y_consider_explicit_label -->
        <button
          onclick={toggleFavorite}
          class="{isFavorited
            ? 'text-red-500'
            : 'text-slate-400'} hover:scale-110 transition-all"
        >
          <i class="fa-solid fa-heart text-xl cursor-pointer"></i>
        </button>
        <button
          onclick={save}
          disabled={isSaving}
          class="bg-blue-500 hover:bg-blue-400 text-white px-8 py-2 rounded text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  </div>
</div>
