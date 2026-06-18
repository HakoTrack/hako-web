<script lang="ts">
  import {
    ui,
    closeModal,
    supabase,
    AuthService,
    settings,
    getDisplayTitle,
    CacheService,
  } from "$core";
  import { get_vibes_wasm } from "$wasm/hako_wasm";
  import { ListService, FavoritesService } from "$features/profile/services";
  import { HakoImage, formatDescription } from "$utils";
  import {
    Select,
    NumberStepper,
    DateInput,
    Button,
    Skeleton,
    Badge,
  } from "$components";
  import { registerShortcut } from "$core/keys.svelte";

  let { entry: initialEntry } = $props<{ entry: any }>();
  let entry = $derived(ui.modalData?.entry || initialEntry);
  const displayTitle = $derived(
    getDisplayTitle(entry?.rawMetadata?.title, settings.titlePreference) ||
      entry?.title ||
      "",
  );

  const mediaType = $derived(entry?.type || "anime");
  let vibes = $derived(
    entry?.rawMetadata ? get_vibes_wasm(entry.rawMetadata) : null,
  );

  // Reactive favorite status
  let isFavorited = $state(false);
  let isSaving = $state(false);
  let isLoaded = $state(false);
  let bannerError = $state(false);
  let bannerLoaded = $state(false);
  let coverLoaded = $state(false);
  let favoritesSyncedForEntry = $state<number | null>(null);
  // Check if image is already cached
  $effect(() => {
    if (entry) {
      const src = HakoImage.getCover(entry.id, "medium");
      const img = new Image();
      img.src = src;
      if (img.complete) {
        coverLoaded = true;
      }
    }
  });

  $effect(() => {
    if (entry) {
      isFavorited = ui.favoriteIds.has(entry.id);
    }
  });

  $effect(() => {
    // 4. Async favorite check (only once per entry load)
    if (
      entry?.id &&
      favoritesSyncedForEntry !== entry.id &&
      !ui.favoriteIds.has(entry.id)
    ) {
      favoritesSyncedForEntry = entry.id;
      FavoritesService.syncFavorites(
        ui.modalData?.profileId || entry.profileId,
        mediaType,
      );
    }
  });

  let status = $state("planning");
  let score = $state(0);
  let progress = $state(0);
  let progressVolumes = $state(0);
  let startDate = $state("");
  let finishDate = $state("");

  $effect(() => {
    score = Math.round(score * 10) / 10;
  });

  let lastEntryId = $state<number | null>(null);

  $effect(() => {
    entry = ui.modalData?.entry || initialEntry;
    isLoaded = ui.modalData ? !ui.modalData.isFetching : true;

    console.log(
      `[QuickEditor] Effect ran. Entry: ${!!entry}, isLoaded: ${isLoaded}`,
      entry,
    );

    if (entry && entry.id !== lastEntryId) {
      coverLoaded = false;
      lastEntryId = entry.id;
    }

    if (entry) {
      status = entry.status || "planning";
      score = entry.score || 0;
      progress = entry.progress || 0;
      progressVolumes = entry.progress_volumes || 0;

      startDate = entry.startedAt?.year
        ? `${entry.startedAt.year}-${String(entry.startedAt.month).padStart(2, "0")}-${String(entry.startedAt.day).padStart(2, "0")}`
        : "";
      finishDate = entry.completedAt?.year
        ? `${entry.completedAt.year}-${String(entry.completedAt.month).padStart(2, "0")}-${String(entry.completedAt.day).padStart(2, "0")}`
        : "";
    }
  });

  async function toggleFavorite() {
    const user = await AuthService.getCurrentUser();
    if (!user) return;

    const previousState = isFavorited;
    isFavorited = !isFavorited;

    try {
      await FavoritesService.toggle(
        user.id,
        entry.id,
        mediaType,
        previousState,
      );
    } catch {
      isFavorited = previousState;
    }
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
          progress_volumes: progressVolumes,
          total: entry.total,
          started_at: startDate || null,
          completed_at: finishDate || null,
        },
        ui.modalData?.entry,
      );
      if (!updateResult.success) throw new Error(updateResult.error);

      // Invalidate cache for this specific entry
      await CacheService.deleteListEntry(`${user.id}:${entry.id}:${mediaType}`);

      closeModal();
    } catch (err: any) {
      alert("Failed to save: " + err.message);
    } finally {
      isSaving = false;
    }
  }

  function handleDelete() {
    if (confirm("Delete entry?")) closeModal();
  }

  function goToPage() {
    let type = entry?.type || "anime";
    if (type === "light_novel") type = "lightnovel";
    window.history.pushState({}, "", `/${type}/${entry?.id}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
    closeModal();
  }

  $effect(() => {
    const cleanups: (() => void)[] = [];
    cleanups.push(registerShortcut("f", () => toggleFavorite()));
    cleanups.push(
      registerShortcut(
        "Enter",
        (e) => {
          e.preventDefault();
          save();
        },
        true,
      ),
    );
    cleanups.push(registerShortcut("g", () => goToPage()));
    return () => cleanups.forEach((fn) => fn());
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="bg-(--surface) w-160 max-w-[95dvw] max-h-[95dvh] rounded-2xl shadow-2xl border border-(--surface-elevated) flex flex-col overflow-hidden"
  onclick={(e) => e.stopPropagation()}
>
  <!-- Header with Banner -->
  <div class="relative h-40 shrink-0 bg-(--surface)">
    {#if !entry || !bannerLoaded}
      <div class="absolute inset-0 bg-(--surface-elevated) animate-pulse"></div>
    {/if}

    {#if entry}
      {#if bannerError}
        <div
          class="absolute inset-0"
          style="
            --s: 40px;
            --c1: var(--surface-elevated);
            --c2: var(--surface-dim);
            --c: #0000 71%, var(--c1) 0 79%, #0000 0;
            --_s: calc(var(--s)/2)/calc(2*var(--s)) calc(2*var(--s));
            background:
              linear-gradient(45deg, var(--c)) calc(var(--s)/-2) var(--_s),
              linear-gradient(135deg, var(--c)) calc(var(--s)/2) var(--_s),
              radial-gradient(var(--c1) 35%, var(--c2) 37%) 0 0/var(--s) var(--s);
            opacity: 0.15;
          "
        ></div>
      {:else}
        <img
          src={HakoImage.getBanner(entry.id)}
          class="w-full h-full object-cover transition-opacity duration-300 {bannerLoaded
            ? 'opacity-50'
            : 'opacity-0'}"
          alt="banner"
          onload={() => (bannerLoaded = true)}
          onerror={() => {
            bannerError = true;
            bannerLoaded = true;
          }}
        />
      {/if}
    {/if}
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <div class="absolute top-4 right-4 flex items-center gap-2">
      <button
        onclick={goToPage}
        class="text-(--hako-fg)/70 hover:text-(--hako-fg) p-2 cursor-pointer"
        title="Go to page"
      >
        <i class="fa-solid fa-arrow-up-right-from-square"></i>
      </button>
      <button
        onclick={closeModal}
        class="text-(--hako-fg)/70 hover:text-(--hako-fg) p-2 cursor-pointer"
      >
        <i class="fa-solid fa-xmark text-xl"></i>
      </button>
    </div>
    <div class="absolute -bottom-6 left-6 flex items-end gap-4">
      {#if entry}
        <div class="relative w-24 h-32 shrink-0">
          {#if !coverLoaded}
            <div
              class="absolute inset-0 block bg-gray-500 animate-pulse rounded-lg shadow-lg border-2 border-gray-400 z-10"
            ></div>
          {/if}

          <img
            src={HakoImage.getCover(entry.id, "medium")}
            class="w-24 h-32 object-cover rounded-lg shadow-lg border-2 border-(--surface) transition-opacity duration-300 {coverLoaded
              ? 'opacity-100'
              : 'opacity-0'}"
            alt="cover"
            onload={() => (coverLoaded = true)}
            onerror={(e) => {
              (e.target as HTMLImageElement).src = HakoImage.get(
                "global/placeholderCover.webp",
              );
              coverLoaded = true;
            }}
          />
        </div>
        <h2
          class="text-2xl font-bold text-(--hako-fg) drop-shadow-md pb-2 line-clamp-3"
        >
          {displayTitle}
        </h2>
      {/if}
    </div>
  </div>

  <!-- Editor Content -->
  <div class="p-6 pt-10 space-y-6 flex-1 flex flex-col min-h-0">
    <!-- Main Inputs -->
    <div class="grid grid-cols-3 gap-4 shrink-0">
      <div class="space-y-1.5">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label
          class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block"
          >Status</label
        >
        {#if !isLoaded}
          <Skeleton />
        {:else}
          <Select
            label=""
            bind:value={status}
            items={[
              {
                value: "current",
                label: mediaType === "anime" ? "Watching" : "Reading",
              },
              { value: "completed", label: "Completed" },
              { value: "paused", label: "Paused" },
              { value: "dropped", label: "Dropped" },
              { value: "planning", label: "Planning" },
            ]}
          />
        {/if}
      </div>
      <div class="space-y-1.5">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label
          class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block"
          >Score</label
        >
        {#if !isLoaded}
          <Skeleton />
        {:else}
          <NumberStepper
            label=""
            bind:value={score}
            min={0}
            max={10}
            step={0.5}
            suffix="/ 10"
          />
        {/if}
      </div>
      <div class="space-y-1.5">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label
          class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block"
        >
          Progress
        </label>
        {#if !isLoaded || !entry}
          <Skeleton />
        {:else}
          <NumberStepper
            label=""
            bind:value={progress}
            min={0}
            max={entry.total || 5000}
            suffix="/ {entry.total || '?'}"
          />
        {/if}
      </div>

      <div class="space-y-1.5">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label
          class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block"
          >Start Date</label
        >
        {#if !isLoaded}
          <Skeleton />
        {:else}
          <DateInput label="" bind:value={startDate} />
        {/if}
      </div>
      <div class="space-y-1.5">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label
          class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block"
          >Finish Date</label
        >
        {#if !isLoaded}
          <Skeleton />
        {:else}
          <DateInput label="" bind:value={finishDate} />
        {/if}
      </div>

      <div class="space-y-1.5">
        {#if mediaType !== "anime"}
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label
            class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block"
            >Volumes</label
          >
          {#if !isLoaded || !entry}
            <Skeleton />
          {:else}
            <NumberStepper
              label=""
              bind:value={progressVolumes}
              min={0}
              max={entry.totalVolumes || Infinity}
              suffix="/ {entry.totalVolumes || '?'}"
            />
          {/if}
        {/if}
      </div>
    </div>

    <!-- Description & Vibes -->
    <div class="space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden">
      <div class="space-y-1.5 shrink-0">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label
          class="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0"
          >Description</label
        >
        <div
          class="text-sm text-slate-300 bg-(--surface-dim) p-4 rounded-xl border border-(--surface-elevated) overflow-y-auto scrollbar-thin h-56 max-h-56"
        >
          {#if !isLoaded}
            <div class="space-y-2">
              <Skeleton class="h-3! w-full" />
              <Skeleton class="h-3! w-5/6" />
              <Skeleton class="h-3! w-4/6" />
            </div>
          {:else if entry}
            {@html formatDescription(entry.description)}
          {/if}
        </div>
      </div>

      <div class="space-y-1.5 shrink-0">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider"
          >Genres</label
        >
        <div class="flex flex-wrap gap-2 min-h-7.5 items-start">
          {#if !isLoaded}
            <Badge loading variant="genre" label="Genre" />
            <Badge loading variant="genre" label="Genre" />
            <Badge loading variant="genre" label="Genre" />
          {:else if entry}
            {#each entry.genres as genre}
              <Badge label={genre} variant="genre" />
            {/each}
          {/if}
        </div>
      </div>

      <div class="space-y-1.5 shrink-0">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider"
          >Vibes</label
        >
        <div class="flex flex-wrap gap-2 min-h-7.5 items-start">
          {#if !isLoaded}
            <Badge loading variant="vibe" label="Vibe" />
            <Badge loading variant="vibe" label="Vibe" />
            <Badge loading variant="vibe" label="Vibe" />
          {:else if vibes && vibes.sorted}
            {#each vibes.sorted.slice(0, 3) as pillar}
              <Badge label={pillar.name} variant="vibe" />
            {/each}
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div
    class="px-6 py-4 border-t border-(--surface-elevated) bg-(--surface) flex justify-between items-center shrink-0 rounded-b-2xl"
  >
    <button
      onclick={handleDelete}
      class="text-(--c1) hover:text-(--c1)/80 text-sm font-bold flex items-center gap-2 cursor-pointer"
    >
      <i class="fa-solid fa-trash"></i> Delete
    </button>
    <div class="flex items-center gap-4">
      <!-- svelte-ignore a11y_consider_explicit_label -->
      <button
        onclick={toggleFavorite}
        class="text-xl {isFavorited
          ? 'text-(--c1)'
          : 'text-slate-500 hover:text-accent'} transition-colors cursor-pointer"
      >
        <i class="fa-solid fa-heart"></i>
      </button>
      <Button
        variant="primary"
        onclick={save}
        disabled={isSaving}
        class="cursor-pointer"
      >
        {isSaving ? "Saving" : "Save"}
      </Button>
    </div>
  </div>
</div>
