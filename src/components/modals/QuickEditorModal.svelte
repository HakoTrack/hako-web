<script lang="ts">
  import {
    ui,
    closeModal,
    supabase,
    AuthService,
    settings,
    getDisplayTitle,
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

  let { entry: initialEntry } = $props<{ entry: any }>();
  let entry = $state(ui.modalData?.entry || initialEntry);
  const displayTitle = $derived(
    getDisplayTitle(entry?.rawMetadata?.title, settings.titlePreference) ||
      entry?.title ||
      "",
  );

  $effect(() => {
    if (ui.modalData?.entry) {
      entry = ui.modalData.entry;
    }
  });

  const mediaType = $derived(entry.type);
  let vibes = $derived(get_vibes_wasm(entry?.rawMetadata));
  // Reactive favorite status
  let isFavorited = $state(false);
  let isSaving = $state(false);
  let isLoaded = $state(false);
  let bannerError = $state(false);

  $effect(() => {
    isFavorited = ui.favoriteIds.has(entry.id);
  });

  $effect(() => {
    // 4. Async favorite check (only once per entry load)
    if (entry?.id && !ui.favoriteIds.has(entry.id)) {
      supabase
        .from("profile_favorites")
        .select("media_id")
        .eq("media_id", entry.id)
        .then(({ data }) => {
          if (data && data.length > 0) {
            ui.addFavorite(entry.id);
            isFavorited = true;
          }
        });
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

  $effect(() => {
    entry = ui.modalData?.entry || initialEntry;
    isLoaded = ui.modalData ? !ui.modalData.isFetching : true;
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
  });

  async function toggleFavorite() {
    const user = await AuthService.getCurrentUser();
    if (!user) return;

    const previousState = isFavorited;
    isFavorited = !isFavorited;

    try {
      await FavoritesService.toggle(user.id, entry.id, previousState);
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
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="bg-(--surface) w-160 max-w-[95dvw] max-h-[95dvh] rounded-2xl shadow-2xl border border-(--surface-elevated) flex flex-col overflow-hidden"
  onclick={(e) => e.stopPropagation()}
>
  <!-- Header with Banner -->
  <div class="relative h-40 shrink-0 bg-(--surface)">
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
        src={HakoImage.getBanner(entry.id, 700)}
        class="w-full h-full object-cover opacity-50"
        alt="banner"
        onerror={() => (bannerError = true)}
      />
    {/if}
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <button
      onclick={closeModal}
      class="absolute top-4 right-4 text-(--hako-fg)/70 hover:text-(--hako-fg) p-2"
    >
      <i class="fa-solid fa-xmark text-xl"></i>
    </button>
    <div class="absolute -bottom-6 left-6 flex items-end gap-4">
      <img
        src={HakoImage.getCover(entry.id, "medium")}
        class="w-24 h-32 object-cover rounded-lg shadow-lg border-2 border-(--surface)"
        alt="cover"
      />
      <h2 class="text-2xl font-bold text-(--hako-fg) drop-shadow-md pb-2">
        {displayTitle}
      </h2>
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
          {#if mediaType === "anime"}
            Episodes
          {:else}
            Chapters
          {/if}
        </label>
        {#if !isLoaded}
          <Skeleton />
        {:else}
          <NumberStepper
            label=""
            bind:value={progress}
            min={0}
            max={entry.total || Infinity}
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
          {#if !isLoaded}
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
      <div class="space-y-1.5 flex-1 flex flex-col min-h-0">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label
          class="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0"
          >Description</label
        >
        <div
          class="text-sm text-slate-300 bg-(--surface-dim) p-4 rounded-xl border border-(--surface-elevated) overflow-y-auto scrollbar-thin flex-1 min-h-25"
        >
          {@html formatDescription(entry.description)}
        </div>
      </div>

      <div class="space-y-1.5 shrink-0">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider"
          >Genres</label
        >
        <div class="flex flex-wrap gap-2">
          {#each entry.genres as genre}
            <Badge label={genre} variant="genre" />
          {/each}
        </div>
      </div>

      <div class="space-y-1.5 shrink-0">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider"
          >Vibes</label
        >
        <div class="flex flex-wrap gap-2">
          {#if vibes && vibes.sorted}
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
    class="px-6 py-4 border-t border-(--surface-elevated) bg-(--surface-dim)/30 flex justify-between items-center shrink-0"
  >
    <button
      onclick={handleDelete}
      class="text-(--c1) hover:text-(--c1)/80 text-sm font-bold flex items-center gap-2"
    >
      <i class="fa-solid fa-trash"></i> Delete
    </button>
    <div class="flex items-center gap-4">
      <!-- svelte-ignore a11y_consider_explicit_label -->
      <button
        onclick={toggleFavorite}
        class="text-xl {isFavorited
          ? 'text-(--c1)'
          : 'text-slate-500 hover:text-accent'} transition-colors"
      >
        <i class="fa-solid fa-heart"></i>
      </button>
      <Button variant="primary" onclick={save} disabled={isSaving}>
        {isSaving ? "Saving" : "Save"}
      </Button>
    </div>
  </div>
</div>
