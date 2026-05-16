<script>
  import { ui } from "../core/ui.svelte.js";
  import { onMount } from "svelte";
  import { getTonalProfile } from "../utils/toneCalc.js";

  let { entry } = ui.modalData || {};

  // Reactive tonal profile based on raw metadata
  let tonalProfile = $derived(getTonalProfile(entry?.rawMetadata));

  // Bindable local state for the form
  let status = $state(entry?.status || "planning");

  let score = $state(entry?.score || 0);
  let progress = $state(entry?.progress || 0);
  let isFavorited = $state(entry?.isFavorited || false);
  let startDate = $state(entry?.startDate || "");
  let finishDate = $state(entry?.finishDate || "");

  function close() {
    ui.closeModal();
  }

  function save() {
    console.log("Saving entry:", {
      status,
      score,
      progress,
      isFavorited,
      startDate,
      finishDate,
    });
    close();
  }

  function toggleFavorite() {
    isFavorited = !isFavorited;
  }

  function handleDelete() {
    if (confirm("Delete this entry?")) close();
  }

  // Handle Escape key
  function handleKeydown(e) {
    if (e.key === "Escape") close();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div
  id="quick-editor-overlay"
  class="fixed inset-0 z-[100] flex items-center justify-center bg-[#0b1622]/80 backdrop-blur-sm p-4"
  on:click|self={close}
>
  <div
    class="bg-[#151f2e] w-full max-w-[700px] h-[800px] max-h-[90vh] rounded-md shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col overflow-hidden"
  >
    <!-- Banner Section -->
    <div class="relative w-full h-[160px] bg-[#0b1622] flex-shrink-0">
      <img
        src={entry.banner}
        class="w-full h-full object-cover opacity-60"
        alt="banner"
        on:error={(e) => (e.target.src = "")}
      />
      <div
        class="absolute inset-0 bg-gradient-to-t from-[#151f2e] to-transparent"
      ></div>
      <button
        on:click={close}
        class="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-20"
      >
        <i class="fa-solid fa-xmark text-lg"></i>
      </button>
      <div
        class="absolute -bottom-10 left-8 flex items-end space-x-6 z-10 w-[calc(100%-4rem)]"
      >
        <img
          src={entry.image}
          class="w-[100px] h-[140px] rounded shadow-xl border border-[#151f2e] object-cover bg-[#0b1622]"
          alt="cover"
          on:error={(e) =>
            (e.target.src = "/assets/covers/placeholder_medium.jpg")}
        />

        <div class="flex-1 min-w-0">
          <h2
            class="text-white font-bold text-xl leading-tight truncate drop-shadow-md"
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
            {#if tonalProfile && tonalProfile.sorted}
              {#each tonalProfile.sorted.slice(0, 3) as pillar, i}
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
      <!-- Controls Grid -->
      <div
        class="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6 flex-shrink-0"
      >
        <div class="space-y-1.5">
          <label
            class="text-xs font-bold text-slate-400 uppercase tracking-wider"
            >Status</label
          >
          <select
            bind:value={status}
            class="w-full bg-[#0b1622] text-slate-200 text-sm rounded border-none p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none cursor-pointer"
          >
            <option value="current">Watching</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
            <option value="dropped">Dropped</option>
            <option value="planning">Planning</option>
          </select>
        </div>
        <div class="space-y-1.5">
          <label
            class="text-xs font-bold text-slate-400 uppercase tracking-wider"
            >Score</label
          >
          <input
            type="number"
            step="0.1"
            max="10"
            min="0"
            bind:value={score}
            class="w-full bg-[#0b1622] text-slate-200 text-sm rounded border-none p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none"
          />
        </div>
        <div class="space-y-1.5">
          <label
            class="text-xs font-bold text-slate-400 uppercase tracking-wider"
            >Progress</label
          >
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
        </div>
        <div class="space-y-1.5">
          <label
            class="text-xs font-bold text-slate-400 uppercase tracking-wider"
            >Start Date</label
          >
          <input
            type="date"
            bind:value={startDate}
            class="w-full bg-[#0b1622] text-slate-200 text-sm rounded border-none p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none [color-scheme:dark]"
          />
        </div>
        <div class="space-y-1.5">
          <label
            class="text-xs font-bold text-slate-400 uppercase tracking-wider"
            >Finish Date</label
          >
          <input
            type="date"
            bind:value={finishDate}
            class="w-full bg-[#0b1622] text-slate-200 text-sm rounded border-none p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none [color-scheme:dark]"
          />
        </div>
      </div>

      <!-- Scrollable Description Area -->
      <div class="mt-8 flex-1 flex flex-col min-h-0">
        <label
          class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 flex-shrink-0"
          >Description</label
        >
        <div
          class="text-slate-400 text-sm leading-relaxed overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800 flex-1"
        >
          {@html entry.description}
        </div>
      </div>

      <!-- Footer -->
      <div
        class="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between flex-shrink-0"
      >
        <button
          on:click={handleDelete}
          class="text-red-500/60 hover:text-red-500 text-sm font-bold transition-colors"
          >Delete</button
        >
        <div class="flex items-center space-x-6">
          <button
            on:click={toggleFavorite}
            class="{isFavorited
              ? 'text-red-500'
              : 'text-slate-400'} hover:scale-110 transition-all"
          >
            <i class="fa-solid fa-heart text-xl"></i>
          </button>
          <button
            on:click={save}
            class="bg-blue-500 hover:bg-blue-400 text-white px-8 py-2 rounded text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >Save</button
          >
        </div>
      </div>
    </div>
  </div>
</div>
