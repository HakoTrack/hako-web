<script lang="ts">
  import { HakoImage } from "../shared/utils/images";
  import MediaCover from "../shared/components/MediaCover.svelte";
  import { supabase } from "../core/supabase.js";
  import type { QuickUpdateItem } from "../shared/types/index";
  import { fade, slide } from "svelte/transition";
  import { settings, getDisplayTitle } from "../core/settings.svelte";
  import { ui, openQuickEditor } from "../core/ui.svelte";
  import { ListService } from "../features/profile/services/listService";
  import { AuthService } from "../core/auth";
  import { registerShortcut } from "../core/keys.svelte";

  let {
    isOpen = false,
    items = [],
    isLoading = false,
    onClose,
  } = $props<{
    isOpen: boolean;
    items: QuickUpdateItem[];
    isLoading: boolean;
    onClose: () => void;
  }>();

  interface ScheduleEntry {
    id: number;
    episode: number;
    episode_end?: number;
    airing_at: number;
    media_id: number;
    title_romaji: string;
    title_english: string | null;
    title_native: string | null;
    format: string;
    episodes: number | null;
    progress: number;
    status: string;
  }

  let scheduleEntries = $state<ScheduleEntry[]>([]);
  let scheduleLoading = $state(false);
  let now = $state(Math.floor(Date.now() / 1000));
  let hoveredScheduleId = $state<number | null>(null);

  const DAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ] as const;

  $effect(() => {
    const interval = setInterval(() => {
      now = Math.floor(Date.now() / 1000);
    }, 1000);
    return () => clearInterval(interval);
  });

  function mergeConsecutive(entries: ScheduleEntry[]): ScheduleEntry[] {
    const merged: ScheduleEntry[] = [];
    for (const entry of entries) {
      const last = merged[merged.length - 1];
      if (
        last &&
        last.media_id === entry.media_id &&
        last.episode_end === entry.episode - 1
      ) {
        last.episode_end = entry.episode;
      } else {
        merged.push({ ...entry, episode_end: entry.episode });
      }
    }
    return merged;
  }

  function getDayName(ts: number): string {
    return DAYS[new Date(ts * 1000).getDay()];
  }

  let mergedEntries = $derived(mergeConsecutive(scheduleEntries));

  let groupedByDay = $derived(() => {
    const groups: Record<string, ScheduleEntry[]> = {};
    for (const entry of mergedEntries) {
      const day = getDayName(entry.airing_at);
      if (!groups[day]) groups[day] = [];
      groups[day].push(entry);
    }
    const ordered = DAYS.filter((d) => groups[d]).map((d) => ({
      day: d,
      entries: groups[d],
    }));
    return ordered;
  });

  async function fetchSchedule() {
    const user = await AuthService.getCurrentUser();
    if (!user) return;

    scheduleLoading = true;

    const nowTs = Math.floor(Date.now() / 1000);
    const weekAgo = nowTs - 7 * 86400;

    const { data: list } = await supabase
      .from("profile_list")
      .select("media_id, progress, status")
      .eq("profile_id", user.id)
      .eq("media_type", "anime")
      .in("status", ["current", "planning"]);

    if (!list?.length) {
      scheduleLoading = false;
      return;
    }

    const mediaIds = list.map((e) => e.media_id);
    const listMap = new Map(
      list.map((e: any) => [
        e.media_id,
        { progress: e.progress, status: e.status },
      ]),
    );

    const { data: schedules } = await supabase
      .from("airing_schedules")
      .select(
        `id, episode, airing_at, media_id,
         media:media_id (
           title_romaji, title_english, title_native,
           format, episodes
         )`,
      )
      .in("media_id", mediaIds)
      .gte("airing_at", weekAgo)
      .order("airing_at", { ascending: true })
      .limit(10);

    if (schedules) {
      scheduleEntries = schedules.map((s: any) => {
        const entry = listMap.get(s.media_id) || {
          progress: 0,
          status: "current",
        };
        return {
          id: s.id,
          episode: s.episode,
          airing_at: s.airing_at,
          media_id: s.media_id,
          progress: entry.progress,
          status: entry.status,
          ...(s.media ?? {}),
        };
      });
    }
    scheduleLoading = false;
  }

  $effect(() => {
    if (isOpen) {
      fetchSchedule();
    } else {
      scheduleEntries = [];
    }
  });

  function countdown(airingAt: number): string {
    const diff = airingAt - now;
    if (diff <= 0) return "Aired";
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  }

  function episodeLabel(entry: ScheduleEntry): string {
    if (entry.episode_end && entry.episode_end !== entry.episode) {
      return `Ep ${entry.episode}-${entry.episode_end}`;
    }
    return `Ep ${entry.episode}`;
  }

  let loadedImages = $state<Record<number, boolean>>({});
  let hoveredPlus = $state<Record<number, boolean>>({});
  let activeItemId = $state<number | null>(null);

  let categorizedItems = $derived(() => {
    const groups: Record<string, QuickUpdateItem[]> = {
      anime: [],
      manga: [],
      light_novel: [],
    };
    items.forEach((item: QuickUpdateItem) => {
      const type = item.media_type;
      if (groups[type]) {
        groups[type].push(item);
      }
    });
    return groups;
  });

  async function incrementProgress(e: MouseEvent, item: QuickUpdateItem) {
    e.preventDefault();
    e.stopPropagation();
    const user = await AuthService.getCurrentUser();
    if (!user) return;

    const media = item.metadata;
    const type = item.media_type;
    const newProgress = (item.progress || 0) + 1;
    const total = media.episodes || media.chapters;

    if (total && newProgress > total) return;

    const updates = {
      progress: newProgress,
      status: total === newProgress ? "completed" : item.status,
      total: total,
    };

    const result = await ListService.updateListEntry(
      user.id,
      type,
      item.media_id,
      updates,
      item,
    );
    if (result.success) {
      item.progress = newProgress;
      item.updated_at = new Date().toISOString();
      if (updates.status === "completed") {
        ui.quickUpdateItems = ui.quickUpdateItems.filter(
          (i) => i.media_id !== item.media_id,
        );
      }
    } else {
      console.error("Failed to update progress:", result.error);
      alert("Failed to update progress: " + result.error);
    }
  }

  function handleItemClick(item: QuickUpdateItem) {
    openQuickEditor(item.media_id, item.media_type);
  }

  function handleItemHover(item: QuickUpdateItem) {
    activeItemId = item.media_id;
  }

  function handleItemLeave() {
    activeItemId = null;
  }

  async function incrementScheduleProgress(
    e: MouseEvent,
    entry: ScheduleEntry,
  ) {
    e.preventDefault();
    e.stopPropagation();
    const user = await AuthService.getCurrentUser();
    if (!user) return;

    const newProgress = (entry.progress || 0) + 1;
    const total = entry.episodes;

    if (total && newProgress > total) return;

    const updates = {
      progress: newProgress,
      status: total === newProgress ? "completed" : entry.status,
      total: total,
    };

    const oldEntry = {
      media_id: entry.media_id,
      metadata: { episodes: entry.episodes },
    };

    const result = await ListService.updateListEntry(
      user.id,
      "anime",
      entry.media_id,
      updates,
      oldEntry,
    );
    if (result.success) {
      entry.progress = newProgress;
      if (updates.status === "completed") {
        scheduleEntries = scheduleEntries.filter(
          (s) => s.media_id !== entry.media_id,
        );
      }
    } else {
      console.error("Failed to update progress:", result.error);
      alert("Failed to update progress: " + result.error);
    }
  }

  function navigateTo(url: string) {
    window.history.pushState({}, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  $effect(() => {
    const cleanups: (() => void)[] = [];
    cleanups.push(
      registerShortcut("u", () => {
        ui.isQuickUpdateOpen = !ui.isQuickUpdateOpen;
        if (ui.isQuickUpdateOpen) {
          ui.loadQuickUpdateItems();
        }
      }),
    );
    cleanups.push(
      registerShortcut("e", () => {
        if (activeItemId != null) {
          const item = items.find(
            (i: QuickUpdateItem) => i.media_id === activeItemId,
          );
          if (item) openQuickEditor(item.media_id, item.media_type);
        }
      }),
    );
    return () => cleanups.forEach((fn) => fn());
  });
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] transition-opacity"
    onclick={onClose}
    transition:fade={{ duration: 150 }}
  ></div>

  <div
    class="fixed top-15 left-0 w-full z-35 bg-(--hako-bg) border-b border-(--c8) shadow-2xl overflow-y-auto max-h-[85vh] origin-top"
    transition:slide={{ duration: 200 }}
  >
    <div class="max-w-375 mx-auto p-6 md:p-10">
      {#if scheduleLoading || scheduleEntries.length > 0}
        <div class="mb-8">
          <h3
            class="text-[0.65rem] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 pb-2 border-b border-(--c8)"
          >
            <i class="fa-solid fa-calendar text-accent/60"></i>
            Seasonal Schedule
          </h3>

          {#if scheduleLoading}
            <div class="flex gap-4 overflow-x-auto pb-2">
              {#each { length: 3 } as _}
                <div class="shrink-0 w-64 animate-pulse">
                  <div
                    class="h-3 w-14 bg-(--surface-elevated) rounded mb-3"
                  ></div>
                  <div class="grid grid-cols-2 gap-2">
                    {#each { length: 4 } as _}
                      <div
                        class="aspect-17/23 bg-(--surface-elevated) rounded"
                      ></div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="flex gap-4 overflow-x-auto pb-2">
              {#each groupedByDay() as { day, entries }}
                <div class="shrink-0 w-64 bg-(--surface)/40 rounded-lg p-2.5">
                  <h4
                    class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2"
                  >
                    {day}
                  </h4>
                  <div class="grid grid-cols-2 gap-2">
                    {#each entries as entry}
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <div
                        class="relative w-28 cursor-pointer group"
                        onclick={() => {
                          onClose();
                          navigateTo(`/anime/${entry.media_id}`);
                        }}
                        onmouseenter={() =>
                          (hoveredScheduleId = entry.media_id)}
                        onmouseleave={() => (hoveredScheduleId = null)}
                      >
                        <MediaCover
                          mediaId={entry.media_id}
                          type="anime"
                          size="medium"
                          showTooltip={true}
                          noHoverScale
                        />
                        <div
                          class="absolute bottom-1 left-1 right-1 bg-(--hako-bg)/80 p-2 rounded-lg pointer-events-none"
                        >
                          {#if hoveredScheduleId === entry.media_id}
                            <div class="flex items-center justify-between">
                              <span class="text-xs font-bold tabular-nums">
                                {episodeLabel(entry)}
                              </span>
                              <!-- svelte-ignore a11y_consider_explicit_label -->
                              <button
                                type="button"
                                onclick={(e) =>
                                  incrementScheduleProgress(e, entry)}
                                class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-accent/10 text-accent hover:bg-accent hover:text-white transition-all pointer-events-auto"
                              >
                                <i class="fa-solid fa-plus text-[10px]"></i>
                              </button>
                            </div>
                          {:else}
                            <div class="text-xs font-bold tabular-nums">
                              {episodeLabel(entry)}
                            </div>
                            <div
                              class="text-[10px] text-(--hako-accent) tabular-nums"
                            >
                              {countdown(entry.airing_at)}
                            </div>
                          {/if}
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      {#if isLoading && items.length === 0}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
          {#each ["Anime", "Manga", "Light Novels"] as label}
            <div class="flex flex-col">
              <h3
                class="text-[0.65rem] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6 pb-2 border-b border-(--c8)"
              >
                {label}
              </h3>
              <div class="space-y-1">
                {#each Array(3) as _}
                  <div class="p-2.5 flex items-center gap-4 animate-pulse">
                    <div
                      class="w-12 h-16 bg-(--surface-elevated) rounded shrink-0"
                    ></div>
                    <div class="grow space-y-3">
                      <div
                        class="h-3 bg-(--surface-elevated) rounded w-3/4"
                      ></div>
                      <div
                        class="h-1.5 bg-(--surface-elevated) rounded w-full"
                      ></div>
                    </div>
                    <div
                      class="w-8 h-8 bg-(--surface-elevated) rounded-lg shrink-0"
                    ></div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {:else if items.length === 0}
        <div class="text-center py-20 text-(--c8)">
          <i class="fa-solid fa-list-check text-4xl mb-4 block opacity-20"></i>
          <p class="text-sm font-medium">No titles currently in progress.</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
          {#each ["anime", "manga", "light_novel"] as type}
            {@const group = categorizedItems()[type]}
            {#if group.length > 0}
              <div class="flex flex-col">
                <h3
                  class="text-[0.65rem] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5 pb-2 border-b border-(--c8)"
                >
                  <i
                    class="fa-solid {type === 'anime'
                      ? 'fa-tv'
                      : type === 'manga'
                        ? 'fa-book'
                        : 'fa-book-open'} text-accent/60"
                  ></i>
                  {type === "light_novel" ? "Light Novels" : type}
                  <span class="ml-auto text-slate-600 font-mono"
                    >{group.length}</span
                  >
                </h3>
                <div class="space-y-1">
                  {#each group as item}
                    {@const media = item.metadata}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div
                      onclick={() => handleItemClick(item)}
                      onmouseenter={() => handleItemHover(item)}
                      onmouseleave={handleItemLeave}
                      class="w-full text-left p-2.5 rounded-lg hover:bg-(--surface) transition-all flex items-center gap-4 group relative cursor-pointer"
                    >
                      <div class="relative shrink-0 w-12 h-16">
                        {#if !loadedImages[media.media_id]}
                          <div
                            class="absolute inset-0 bg-(--surface-elevated) animate-pulse rounded"
                          ></div>
                        {/if}
                        <img
                          src={HakoImage.getCover(media.media_id, "small")}
                          alt={media.title.romaji}
                          class="w-full h-full object-cover rounded shadow-md group-hover:shadow-lg transition-all duration-300 {loadedImages[
                            media.media_id
                          ]
                            ? 'opacity-100'
                            : 'opacity-0'}"
                          onload={() => (loadedImages[media.media_id] = true)}
                        />
                      </div>

                      <div class="min-w-0 grow">
                        <div
                          class="text-sm font-semibold text-(--hako-fg) truncate group-hover:text-accent transition-colors"
                        >
                          {getDisplayTitle(
                            media.title,
                            settings.titlePreference,
                          )}
                        </div>
                        <div class="flex items-center gap-2 mt-2">
                          <div
                            class="grow bg-(--surface-elevated) h-1.5 rounded-full overflow-hidden"
                          >
                            <div
                              class="bg-(--c2) h-full transition-all duration-300"
                              style="width: {((item.progress ?? 0) /
                                (media.episodes || media.chapters || 100)) *
                                100}%"
                            ></div>
                          </div>
                          <span
                            class="text-[10px] font-mono text-slate-500 min-w-12 text-right"
                          >
                            {item.progress} / {media.episodes ||
                              media.chapters ||
                              "?"}
                          </span>
                        </div>
                      </div>
                      <!-- svelte-ignore a11y_consider_explicit_label -->
                      <button
                        type="button"
                        onclick={(e) => incrementProgress(e, item)}
                        onmouseenter={() => (hoveredPlus[item.media_id] = true)}
                        onmouseleave={() =>
                          (hoveredPlus[item.media_id] = false)}
                        class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer {hoveredPlus[
                          item.media_id
                        ]
                          ? 'bg-accent text-white shadow-lg'
                          : 'bg-accent/10 text-accent'}"
                      >
                        <i class="fa-solid fa-plus text-xs"></i>
                      </button>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}
