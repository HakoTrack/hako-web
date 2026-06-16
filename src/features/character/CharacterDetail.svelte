<script lang="ts">
  import { getCharacterById } from "../media/services/characterService";
  import { formatDescription } from "../../shared/utils/mediaData";
  import MediaCover from "../../shared/components/MediaCover.svelte";
  import Tooltip from "../../shared/components/Tooltip.svelte";
  import Badge from "../../shared/components/Badge.svelte";
  import { HakoImage } from "../../shared/utils/images";
  import { getDisplayTitle, settings } from "../../core/settings.svelte";
  import type {
    CharacterDetail,
    CharacterMediaAppearance,
  } from "../../shared/types/index";

  let { characterId } = $props<{ characterId: string }>();

  let character: CharacterDetail | null = $state(null);
  let isLoading = $state(true);
  let coverLoaded = $state(false);
  let visibleYears = $state<Set<number>>(new Set());

  $effect(() => {
    const id = characterId;
    if (!id) return;

    character = null;
    coverLoaded = false;
    isLoading = true;

    getCharacterById(Number(id))
      .then((data) => {
        character = data;
      })
      .finally(() => {
        isLoading = false;
      });
  });

  let groupedMedia = $derived.by(() => {
    if (!character)
      return {
        years: [] as number[],
        groups: {} as Record<number, CharacterMediaAppearance[]>,
        unknown: [] as CharacterMediaAppearance[],
      };

    const groups: Record<number, CharacterMediaAppearance[]> = {};
    const unknown: CharacterMediaAppearance[] = [];

    for (const m of character.media) {
      if (m.seasonYear) {
        (groups[m.seasonYear] ??= []).push(m);
      } else {
        unknown.push(m);
      }
    }

    const years = Object.keys(groups)
      .map(Number)
      .sort((a, b) => b - a);
    return { years, groups, unknown };
  });

  $effect(() => {
    const _years = groupedMedia.years;
    const _unknown = groupedMedia.unknown;

    const raf = requestAnimationFrame(() => {
      const sections = document.querySelectorAll<HTMLElement>("[data-year]");
      if (sections.length === 0) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const next = new Set(visibleYears);
          for (const entry of entries) {
            const year = Number((entry.target as HTMLElement).dataset.year);
            if (entry.isIntersecting) {
              next.add(year);
            } else {
              next.delete(year);
            }
          }
          visibleYears = next;
        },
        { rootMargin: "-80px 0px -55% 0px" },
      );

      for (const el of sections) observer.observe(el);
      return () => observer.disconnect();
    });

    return () => cancelAnimationFrame(raf);
  });

  function scrollToYear(year: number) {
    const el = document.getElementById(`year-${year}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function toTitleCase(str: string | null | undefined): string {
    if (!str) return "N/A";
    return str
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  function getMediaType(appearance: CharacterMediaAppearance): string {
    return appearance.mediaType === "light_novel"
      ? "lightnovel"
      : appearance.mediaType;
  }
</script>

{#snippet appearanceCard(appearance: CharacterMediaAppearance)}
  {@const mediaType = getMediaType(appearance)}
  {@const displayTitle =
    getDisplayTitle(appearance.title, settings.titlePreference) ||
    appearance.title.romaji}
  {@const va = appearance.voiceActor}
  <div class="relative group w-40">
    <MediaCover
      mediaId={appearance.mediaId}
      type={mediaType}
      size="large"
      alt={displayTitle}
      showTooltip={false}
    />
    {#if va}
      <Tooltip placement="top" offset={6}>
        {#snippet children()}
          <button
            onclick={(e) => {
              e.stopPropagation();
              window.history.pushState({}, "", `/staff/${va.id}`);
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
            class="absolute top-1.5 right-1.5 z-10 w-10 h-10 rounded-full overflow-hidden border border-(--hako-bg) bg-(--surface-elevated) shadow-md cursor-pointer"
          >
            <img
              src={va.image}
              alt={va.name}
              class="w-full h-full object-cover"
            />
          </button>
        {/snippet}
        {#snippet content()}
          <span class="font-bold text-xs whitespace-nowrap">{va.name}</span>
        {/snippet}
      </Tooltip>
    {/if}
    <div
      class="absolute inset-x-0 bottom-0 bg-(--hako-bg)/85 p-2 text-(--hako-fg) opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"
    >
      <p class="text-xs font-bold truncate" title={displayTitle}>
        {displayTitle}
      </p>
      <div class="flex items-center gap-2 mt-1">
        <span class="text-[10px] text-slate-400 uppercase"
          >{appearance.format}</span
        >
        <Badge label={toTitleCase(appearance.role)} variant="genre" />
      </div>
    </div>
  </div>
{/snippet}

{#if isLoading}
  <div class="animate-in fade-in duration-300">
    <div class="max-w-375 mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex flex-col md:flex-row gap-8 mb-12">
        <div
          class="w-48 lg:w-56 aspect-2/3 rounded-xl bg-(--surface-elevated) animate-pulse shrink-0"
        ></div>
        <div class="flex-1 min-w-0 space-y-4">
          <div
            class="w-1/2 h-10 bg-(--surface-elevated) animate-pulse rounded"
          ></div>
          <div
            class="w-1/3 h-6 bg-(--surface-elevated)/50 animate-pulse rounded"
          ></div>
          <div class="bg-card p-6 rounded-xl shadow-lg space-y-3">
            <div
              class="w-full h-3 bg-(--surface-elevated)/50 animate-pulse rounded"
            ></div>
            <div
              class="w-5/6 h-3 bg-(--surface-elevated)/50 animate-pulse rounded"
            ></div>
            <div
              class="w-4/6 h-3 bg-(--surface-elevated)/50 animate-pulse rounded"
            ></div>
            <div
              class="w-3/4 h-3 bg-(--surface-elevated)/50 animate-pulse rounded"
            ></div>
          </div>
        </div>
      </div>
      <div class="flex gap-8">
        <div class="hidden lg:block shrink-0">
          <div class="sticky top-24 w-20 space-y-1">
            {#each Array(4) as _}
              <div
                class="h-7 bg-(--surface-elevated)/50 animate-pulse rounded"
              ></div>
            {/each}
          </div>
        </div>
        <div class="flex-1 min-w-0 space-y-10">
          <h2 class="text-xl font-bold text-(--hako-fg)">Appearances</h2>
          {#each Array(2) as _}
            <div>
              <div
                class="flex items-center mb-4 pb-2 border-b border-(--surface-elevated)"
              >
                <div
                  class="w-16 h-6 bg-(--surface-elevated)/50 animate-pulse rounded"
                ></div>
                <div
                  class="ml-2 w-8 h-4 bg-(--surface-elevated)/40 animate-pulse rounded"
                ></div>
              </div>
              <div
                class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
              >
                {#each Array(3) as _}
                  <div
                    class="w-40 aspect-[17/23] bg-(--surface-elevated) animate-pulse rounded"
                  ></div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
{:else if !character}
  <div class="text-(--hako-fg) p-10 text-center">Character not found.</div>
{:else}
  <div class="max-w-375 mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex flex-col md:flex-row gap-8 mb-12">
      <div class="shrink-0">
        <div
          class="w-48 lg:w-56 aspect-2/3 rounded-xl overflow-hidden bg-(--surface-elevated) shadow-2xl relative"
        >
          {#if !coverLoaded}
            <div
              class="absolute inset-0 bg-(--surface-elevated) animate-pulse"
            ></div>
          {/if}
          <img
            src={character.image}
            alt={character.name}
            class="w-full h-full object-cover transition-opacity duration-300 {coverLoaded
              ? 'opacity-100'
              : 'opacity-0'}"
            loading="lazy"
            onload={() => (coverLoaded = true)}
            onerror={(e) => {
              (e.target as HTMLImageElement).src = HakoImage.get(
                "global/placeholderCover.webp",
              );
              coverLoaded = true;
            }}
          />
        </div>
      </div>

      <div class="flex-1 min-w-0">
        <h1 class="text-4xl font-bold text-(--hako-fg) mb-2">
          {character.name}
        </h1>
        {#if character.nameNative}
          <p class="text-lg text-slate-500 mb-4">{character.nameNative}</p>
        {/if}

        {#if character.aliases.length > 0}
          <div class="flex flex-wrap gap-2 mb-4">
            {#each character.aliases as alias}
              <span
                class="text-xs text-slate-400 bg-(--surface-elevated) px-2 py-1 rounded"
                >{alias}</span
              >
            {/each}
          </div>
        {/if}

        {#if character.biography}
          <div class="bg-card p-6 rounded-xl shadow-lg">
            <div class="text-slate-400 text-sm leading-relaxed">
              {@html formatDescription(character.biography)}
            </div>
          </div>
        {/if}
      </div>
    </div>

    {#if character.media.length > 0}
      <div class="flex gap-8">
        <aside class="hidden lg:block shrink-0">
          <div class="sticky top-24 w-20 space-y-1">
            {#each groupedMedia.years as year}
              <button
                onclick={() => scrollToYear(year)}
                class="block w-full text-left px-3 py-1.5 rounded text-sm font-medium transition-all cursor-pointer {visibleYears.has(
                  year,
                )
                  ? 'text-(--hako-accent) bg-(--surface-elevated)'
                  : 'text-slate-500 hover:text-(--hako-fg)'}"
              >
                {year}
              </button>
            {/each}
            {#if groupedMedia.unknown.length > 0}
              <button
                onclick={() => scrollToYear(-1)}
                class="block w-full text-left px-3 py-1.5 rounded text-sm font-medium transition-all cursor-pointer {visibleYears.has(
                  -1,
                )
                  ? 'text-(--hako-accent) bg-(--surface-elevated)'
                  : 'text-slate-500 hover:text-(--hako-fg)'}"
              >
                ??
              </button>
            {/if}
          </div>
        </aside>

        <div class="flex-1 min-w-0 space-y-10">
          <h2 class="text-xl font-bold text-(--hako-fg)">Appearances</h2>

          {#each groupedMedia.years as year}
            <section id="year-{year}" data-year={year} class="scroll-mt-24">
              <h3
                class="text-lg font-bold text-(--hako-fg) mb-4 pb-2 border-b border-(--surface-elevated)"
              >
                {year}
                <span class="text-sm font-normal text-slate-500 ml-2"
                  >({groupedMedia.groups[year].length})</span
                >
              </h3>
              <div
                class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
              >
                {#each groupedMedia.groups[year] as appearance}
                  {@render appearanceCard(appearance)}
                {/each}
              </div>
            </section>
          {/each}

          {#if groupedMedia.unknown.length > 0}
            <section id="year--1" data-year="-1" class="scroll-mt-24">
              <h3
                class="text-lg font-bold text-(--hako-fg) mb-4 pb-2 border-b border-(--surface-elevated)"
              >
                Unknown
                <span class="text-sm font-normal text-slate-500 ml-2"
                  >({groupedMedia.unknown.length})</span
                >
              </h3>
              <div
                class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
              >
                {#each groupedMedia.unknown as appearance}
                  {@render appearanceCard(appearance)}
                {/each}
              </div>
            </section>
          {/if}
        </div>
      </div>
    {:else}
      <div class="text-center text-slate-500 py-16">
        <i class="fa-solid fa-film text-4xl mb-4 block opacity-50"></i>
        <p class="text-lg">No known media appearances</p>
      </div>
    {/if}
  </div>
{/if}
