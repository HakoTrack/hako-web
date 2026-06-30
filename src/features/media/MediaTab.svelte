<script lang="ts">
  import type { AnimeTheme } from "./services/animethemesService";
  import { HakoImage } from "../../shared/utils/images";
  import {
    getExtrasCategories,
    type ExtrasCategory,
  } from "./services/extrasService";

  let {
    themes,
    type,
    mediaId,
  }: { themes: AnimeTheme[]; type: string; mediaId: number } = $props();

  let ops = $derived(themes.filter((t) => t.type === "OP"));
  let eds = $derived(themes.filter((t) => t.type === "ED"));

  let extras: ExtrasCategory[] = $state([]);

  $effect(() => {
    getExtrasCategories(mediaId).then((result) => {
      extras = result;
    });
  });

  let lbOpen = $state(false);
  let lbImages: string[] = $state([]);
  let lbIndex = $state(0);

  function openLightbox(items: string[], startIndex = 0) {
    lbImages = items;
    lbIndex = startIndex;
    lbOpen = true;
  }

  function closeLightbox() {
    lbOpen = false;
  }

  function prevImage() {
    if (lbImages.length === 0) return;
    lbIndex = lbIndex > 0 ? lbIndex - 1 : lbImages.length - 1;
  }

  function nextImage() {
    if (lbImages.length === 0) return;
    lbIndex = lbIndex < lbImages.length - 1 ? lbIndex + 1 : 0;
  }

  let videoLbOpen = $state(false);
  let videoLbSrc = $state("");

  function openVideoLightbox(src: string) {
    videoLbSrc = src;
    videoLbOpen = true;
  }

  function closeVideoLightbox() {
    videoLbOpen = false;
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      closeLightbox();
      closeVideoLightbox();
    }
    if (lbOpen) {
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
    }
  }

  $effect(() => {
    if (lbOpen || videoLbOpen) {
      window.addEventListener("keydown", onKeydown);
      return () => window.removeEventListener("keydown", onKeydown);
    }
  });

  function buildVariantUrls(variants: string[]): string[] {
    return variants.map((v) =>
      HakoImage.getAlternateCover(mediaId, v, "large"),
    );
  }

  function buildFileUrls(files: string[], folder: string): string[] {
    return files.map((f) => HakoImage.getExtras(mediaId, folder, f));
  }
</script>

{#snippet themeCard(theme: AnimeTheme, color: string)}
  <div class="bg-card rounded-xl shadow-lg overflow-hidden">
    <div class="px-5 py-3 border-b border-(--c0)">
      <div class="flex items-center gap-3">
        <span
          class="text-xs font-bold px-2 py-0.5 rounded text-(--hako-bg)"
          style="background-color: {color}">{theme.slug}</span
        >
        {#if theme.song}
          <span class="text-sm text-(--hako-fg) font-bold truncate"
            >{theme.song.title}</span
          >
        {/if}
      </div>
      {#if theme.song?.artists?.length}
        <p class="text-[11px] text-(--c8) mt-0.5 ml-1">
          {theme.song.artists.map((a) => a.name).join(", ")}
        </p>
      {/if}
    </div>
    <div class="p-4 space-y-2">
      {#each theme.animethemeentries as entry}
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
          {#if entry.spoiler}
            <span
              class="text-[10px] px-1.5 py-0.5 rounded bg-(--c1)/20 text-(--c1) font-bold"
              >Spoiler</span
            >
          {/if}
          <span class="text-[10px] text-(--c8) shrink-0">
            v{entry.version}{entry.episodes ? ` · ${entry.episodes}` : ""}
          </span>
          {#each entry.videos as video}
            <button
              onclick={() => openVideoLightbox(video.link)}
              class="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded bg-(--surface-elevated) text-(--hako-fg) hover:bg-(--c5)/20 hover:text-(--c5) transition-colors"
            >
              <i class="fa-solid fa-play text-[9px]"></i>
              {video.resolution}p
              {#if video.nc}
                <span class="text-[9px] text-(--c2) font-bold">NC</span>
              {/if}
              {#if video.subbed}
                <span class="text-[9px] text-(--c4)">SUB</span>
              {/if}
              {#if video.source === "BD"}
                <span class="text-[9px] text-(--c3)">BD</span>
              {:else if video.source === "WEB"}
                <span class="text-[9px] text-(--c8)">WEB</span>
              {/if}
              {#if video.overlap === "Transition"}
                <span class="text-[9px] text-(--c6) font-bold">TRN</span>
              {/if}
            </button>
          {/each}
        </div>
      {/each}
    </div>
  </div>
{/snippet}

{#if themes.length === 0}
  <div class="bg-card p-6 rounded-xl shadow-lg">
    <h3 class="text-(--hako-fg) font-bold mb-4">Opening & Ending Themes</h3>
    <p class="text-(--c8) text-sm">
      {type === "manga"
        ? "Theme song data is not available for manga."
        : "No theme data found for this title on AnimeThemes."}
    </p>
  </div>
{:else}
  <div class="flex items-center justify-between mb-2">
    <h3 class="text-(--hako-fg) font-bold">Themes</h3>
    <p class="text-[10px] text-(--c8)">
      <a
        href="https://animethemes.moe"
        target="_blank"
        rel="noopener noreferrer"
        class="underline hover:text-(--c5) transition-colors">AnimeThemes.moe</a
      >
    </p>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="space-y-4">
      {#each ops as theme}
        {@render themeCard(theme, "var(--c10)")}
      {/each}
    </div>
    <div class="space-y-4">
      {#each eds as theme}
        {@render themeCard(theme, "var(--c4)")}
      {/each}
    </div>
  </div>
{/if}

{#each extras as category}
  <div class="space-y-3 mt-6">
    <div class="flex items-center justify-between">
      <h3 class="text-(--hako-fg) font-bold">{category.label}</h3>
      {#if (category.variants && category.variants.length > 4) || (category.files && category.files.length > 4)}
        <button
          class="text-xs text-(--c8) underline hover:text-(--c5) transition-colors"
          >View all</button
        >
      {/if}
    </div>

    {#if category.type === "strip"}
      <div class="flex gap-3 overflow-x-auto pb-2">
        {#if category.variants}
          {#each category.variants as variant, i}
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <img
              src={HakoImage.getAlternateCover(mediaId, variant, "medium")}
              alt=""
              class="shrink-0 w-36 aspect-2/3 object-cover rounded-lg bg-(--surface-elevated) cursor-pointer"
              loading="lazy"
              onclick={() =>
                openLightbox(buildVariantUrls(category.variants!), i)}
            />
          {/each}
        {:else if category.files}
          {#each category.files as file, i}
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <img
              src={HakoImage.getExtras(mediaId, category.folder, file)}
              alt=""
              class="shrink-0 w-36 aspect-2/3 object-cover rounded-lg bg-(--surface-elevated) cursor-pointer"
              loading="lazy"
              onclick={() =>
                openLightbox(
                  buildFileUrls(category.files!, category.folder),
                  i,
                )}
            />
          {/each}
        {/if}
      </div>
    {:else}
      <div class="columns-2 sm:columns-3 gap-3 space-y-3">
        {#each category.files ?? [] as file, i}
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <img
            src={HakoImage.getExtras(mediaId, category.folder, file)}
            alt=""
            class="w-full rounded-lg bg-(--surface-elevated) object-cover cursor-pointer"
            loading="lazy"
            style="aspect-ratio: {category.folder === 'character-art'
              ? '2/3'
              : 'auto'}"
            onclick={() =>
              openLightbox(buildFileUrls(category.files!, category.folder), i)}
          />
        {/each}
      </div>
    {/if}
  </div>
{/each}

{#if lbOpen || videoLbOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="fixed inset-0 z-50 bg-(--hako-bg)/80 flex items-center justify-center"
    onclick={() => {
      closeLightbox();
      closeVideoLightbox();
    }}
  >
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <button
      class="absolute top-4 right-4 text-white/70 hover:text-white text-2xl z-10"
      onclick={() => {
        closeLightbox();
        closeVideoLightbox();
      }}
    >
      <i class="fa-solid fa-xmark"></i>
    </button>

    {#if lbOpen && lbImages.length > 1}
      <!-- svelte-ignore a11y_consider_explicit_label -->
      <button
        class="absolute left-4 text-white/70 hover:text-white text-3xl z-10"
        onclick={(e) => {
          e.stopPropagation();
          prevImage();
        }}
      >
        <i class="fa-solid fa-chevron-left"></i>
      </button>
    {/if}

    {#if videoLbOpen}
      <!-- svelte-ignore a11y_media_has_caption -->
      <video
        src={videoLbSrc}
        controls
        autoplay
        class="max-h-[90vh] max-w-[90vw]"
        onclick={(e) => e.stopPropagation()}
      ></video>
    {:else}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <img
        src={lbImages[lbIndex]}
        alt=""
        class="max-h-[90vh] max-w-[90vw] object-contain"
        onclick={(e) => e.stopPropagation()}
      />
    {/if}

    {#if lbOpen && lbImages.length > 1}
      <!-- svelte-ignore a11y_consider_explicit_label -->
      <button
        class="absolute right-4 text-white/70 hover:text-white text-3xl z-10"
        onclick={(e) => {
          e.stopPropagation();
          nextImage();
        }}
      >
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    {/if}

    {#if lbOpen}
      <div class="absolute bottom-4 text-white/50 text-sm">
        {lbIndex + 1} / {lbImages.length}
      </div>
    {/if}
  </div>
{/if}
