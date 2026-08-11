<script lang="ts">
  import { getStaffById } from "../media/services/staffService";
  import { formatDescription } from "../../shared/utils/mediaData";
  import MediaCover from "../../shared/components/MediaCover.svelte";
  import { HakoImage } from "../../shared/utils/images";
  import { getDisplayTitle, settings } from "../../core/settings.svelte";
  import type {
    StaffDetail,
    StaffMediaAppearance,
    StaffRole,
  } from "../../shared/types/index";

  let { staffId } = $props<{ staffId: string }>();

  let staff: StaffDetail | null = $state(null);
  let isLoading = $state(true);
  let coverLoaded = $state(false);
  let visibleYears = $state<Set<number>>(new Set());
  let prevStaffId = $state<string | null>(null);

  $effect(() => {
    const id = staffId;
    if (!id) return;

    if (prevStaffId !== null && prevStaffId !== id) {
      staff = null;
      coverLoaded = false;
      isLoading = true;
    }
    prevStaffId = id;

    getStaffById(Number(id))
      .then((data) => {
        staff = data;
      })
      .finally(() => {
        isLoading = false;
      });
  });

  let groupedMedia = $derived.by(() => {
    if (!staff)
      return {
        years: [] as number[],
        groups: {} as Record<number, StaffMediaAppearance[]>,
        unknown: [] as StaffMediaAppearance[],
      };

    const groups: Record<number, StaffMediaAppearance[]> = {};
    const unknown: StaffMediaAppearance[] = [];

    for (const m of staff.media) {
      if (m.startYear) {
        (groups[m.startYear] ??= []).push(m);
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

  function goto(path: string) {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function toTitleCase(str: string | null | undefined): string {
    if (!str) return "";
    return str
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  function getMediaType(appearance: StaffMediaAppearance): string {
    return appearance.mediaType === "light_novel"
      ? "lightnovel"
      : appearance.mediaType;
  }
</script>

{#snippet mediaCard(appearance: StaffMediaAppearance)}
  {@const mediaType = getMediaType(appearance)}
  {@const displayTitle =
    getDisplayTitle(appearance.title, settings.titlePreference) ||
    appearance.title.romaji}
  <div class="flex gap-3 bg-card rounded-xl p-3">
    <div class="w-28 shrink-0">
      <MediaCover
        mediaId={appearance.mediaId}
        type={mediaType}
        size="medium"
        alt={displayTitle}
        showTooltip={false}
        noHoverScale
      />
    </div>
    <div class="min-w-0 flex-1">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <span
        onclick={() => goto(`/${mediaType}/${appearance.mediaId}`)}
        class="text-sm font-bold text-(--hako-fg) truncate leading-tight hover:text-(--c5) transition-colors cursor-pointer"
      >
        {displayTitle}
      </span>
      <div class="flex items-center gap-2 mt-0.5">
        {#if appearance.startYear}
          <span class="text-[11px] text-(--c8)">{appearance.startYear}</span>
        {/if}
        <span class="text-[10px] font-semibold uppercase text-(--c5)">{appearance.format?.replace(/_/g, ' ')}</span>
      </div>
      <div class="mt-1.5 space-y-1">
        {#each appearance.roles as role (role.character?.id ?? role.role)}
          {#if role.character}
            <div class="flex items-center gap-1.5">
              <img
                src={role.character.image}
                alt={role.character.name}
                class="w-8 h-8 rounded-full object-cover shrink-0"
              />
              <div class="min-w-0 leading-tight">
                <p class="text-[11px] font-bold text-(--c7) truncate">{role.character.name}</p>
                <p class="text-[10px] text-(--c8) truncate">{toTitleCase(role.role)}</p>
              </div>
            </div>
          {:else}
            <span class="inline-block text-[10px] bg-(--surface-elevated) text-(--c7) rounded px-1.5 py-0.5 leading-tight">
              {toTitleCase(role.role)}
            </span>
          {/if}
        {/each}
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
          <h2 class="text-xl font-bold text-(--hako-fg)">Media Appearances</h2>
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
               <div class="grid grid-cols-1 lg:grid-cols-2 gap-2">
                 {#each Array(4) as _}
                   <div class="flex gap-3 bg-card rounded-xl p-3">
                     <div
                       class="w-28 aspect-[17/23] bg-(--surface-elevated) animate-pulse rounded shrink-0"
                     ></div>
                     <div class="flex-1 space-y-2">
                       <div
                         class="h-4 w-1/2 bg-(--surface-elevated)/50 animate-pulse rounded"
                       ></div>
                       <div
                         class="h-10 w-3/4 bg-(--surface-elevated)/40 animate-pulse rounded"
                       ></div>
                     </div>
                   </div>
                 {/each}
               </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
{:else if !staff}
  <div class="text-(--hako-fg) p-10 text-center">Staff member not found.</div>
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
            src={staff.image}
            alt={staff.name}
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
          {staff.name}
        </h1>
        {#if staff.nameNative}
          <p class="text-lg text-slate-500 mb-4">{staff.nameNative}</p>
        {/if}

        {#if staff.biography}
          <div class="bg-card p-6 rounded-xl shadow-lg">
            <div class="text-slate-400 text-sm leading-relaxed">
              {@html formatDescription(staff.biography)}
            </div>
          </div>
        {/if}
      </div>
    </div>

    {#if staff.media.length > 0}
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
          <h2 class="text-xl font-bold text-(--hako-fg)">Media Appearances</h2>

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
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {#each groupedMedia.groups[year] as appearance}
                  {@render mediaCard(appearance)}
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
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {#each groupedMedia.unknown as appearance}
                  {@render mediaCard(appearance)}
                {/each}
              </div>
            </section>
          {/if}
        </div>
      </div>
    {:else}
      <div class="text-center text-slate-500 py-16">
        <i class="fa-solid fa-user-tie text-4xl mb-4 block opacity-50"></i>
        <p class="text-lg">No known media appearances</p>
      </div>
    {/if}
  </div>
{/if}
