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
    media_id: number;
    next_episode: number;
    airing_at: number;
    progress: number;
    status: string;
    behind: number;
    episodes: number | null;
  }

  const COLORS = {
    progress: "var(--c2)",
    behind: "var(--c1)",
    empty: "var(--surface-elevated)",
  };
  const GRACE_PERIOD = 72 * 3600;

  function getSegments(entry: ScheduleEntry) {
    const total = entry.episodes ?? Math.max(entry.next_episode + 10, 26);
    const segs: {
      color: string;
      first: boolean;
      last: boolean;
      flex: number;
    }[] = [];
    const progress = Math.max(0, entry.progress);
    const behind = Math.max(0, entry.next_episode - 1 - entry.progress);
    const unreleased = Math.max(0, total - (entry.next_episode - 1));

    if (progress > 0)
      segs.push({
        color: COLORS.progress,
        first: segs.length === 0,
        last: false,
        flex: progress,
      });
    if (behind > 0)
      segs.push({
        color: COLORS.behind,
        first: segs.length === 0,
        last: false,
        flex: behind,
      });
    if (unreleased > 0)
      segs.push({
        color: COLORS.empty,
        first: segs.length === 0,
        last: true,
        flex: unreleased,
      });

    if (segs.length === 0)
      segs.push({ color: COLORS.empty, first: true, last: true, flex: 1 });
    segs[segs.length - 1].last = true;
    return segs;
  }

  let scheduleEntries = $state<ScheduleEntry[]>([]);
  let scheduleLoading = $state(false);
  let scheduleMediaIds = $state(new Set<number>());
  let now = $state(Math.floor(Date.now() / 1000));

  let loadedImages = $state<Record<number, boolean>>({});
  let hoveredPlus = $state<Record<number, boolean>>({});
  let activeItemId = $state<number | null>(null);

  let categorizedItems = $derived(() => {
    const groups: Record<string, QuickUpdateItem[]> = {
      anime: [],
      manga: [],
      light_novel: [],
    };
    for (const item of items) {
      if (scheduleMediaIds.has(item.media_id)) continue;
      const type = item.media_type;
      if (groups[type]) {
        groups[type].push(item);
      }
    }
    return groups;
  });

  let filteredCount = $derived(() => {
    const groups = categorizedItems();
    return (
      groups.anime.length + groups.manga.length + groups.light_novel.length
    );
  });

  let sortedEntries = $derived(
    [...scheduleEntries].sort((a, b) => {
      const aBehind = a.behind > 0 ? 0 : 1;
      const bBehind = b.behind > 0 ? 0 : 1;
      if (aBehind !== bBehind) return aBehind - bBehind;
      return a.airing_at - b.airing_at;
    }),
  );

  function getDayName(ts: number): string {
    return new Date(ts * 1000).toLocaleDateString("en-US", {
      weekday: "short",
    });
  }

  function countdown(airingAt: number): string {
    const diff = airingAt - now;
    if (diff <= 0) return "Airing";
    if (diff < 60) return `${diff}s`;
    const totalMinutes = Math.floor(diff / 60);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return parts.join(" ");
  }

  async function fetchSchedule() {
    const user = await AuthService.getCurrentUser();
    if (!user) return;

    scheduleLoading = true;

    const nowTs = Math.floor(Date.now() / 1000);

    const allListEntries: {
      media_id: number;
      progress: number;
      status: string;
    }[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data } = await supabase
        .from("profile_list")
        .select("media_id, progress, status")
        .eq("profile_id", user.id)
        .eq("media_type", "anime")
        .in("status", ["current", "planning"])
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (data?.length) allListEntries.push(...data);
      hasMore = data?.length === pageSize;
      page++;
    }

    if (!allListEntries.length) {
      scheduleLoading = false;
      return;
    }

    const mediaIds = allListEntries.map((e) => e.media_id);
    const listMap = new Map(
      allListEntries.map((e) => [
        e.media_id,
        { progress: e.progress, status: e.status },
      ]),
    );

    const { data: schedules } = await supabase
      .from("airing_schedules")
      .select("id, episode, airing_at, media_id")
      .in("media_id", mediaIds)
      .gte("airing_at", nowTs - 14 * 86400)
      .order("airing_at", { ascending: true });

    if (!schedules?.length) {
      scheduleLoading = false;
      return;
    }

    const mediaSchedMap = new Map<number, typeof schedules>();
    for (const s of schedules) {
      if (!mediaSchedMap.has(s.media_id)) mediaSchedMap.set(s.media_id, []);
      mediaSchedMap.get(s.media_id)!.push(s);
    }

    const entries: ScheduleEntry[] = [];
    for (const [mediaId, scheds] of mediaSchedMap) {
      const nextEntry = scheds.find((s) => s.airing_at > nowTs);
      if (!nextEntry) continue;

      const entry = listMap.get(mediaId) || { progress: 0, status: "current" };
      const behind = Math.max(0, nextEntry.episode - 1 - entry.progress);

      entries.push({
        media_id: mediaId,
        next_episode: nextEntry.episode,
        airing_at: nextEntry.airing_at,
        progress: entry.progress,
        status: entry.status,
        behind,
        episodes: null,
      });
    }

    const graceIds = new Set<number>();
    for (const [mediaId, scheds] of mediaSchedMap) {
      const hasFuture = scheds.some((s) => s.airing_at > nowTs);
      if (hasFuture) continue;
      const lastAired = Math.max(...scheds.map((s) => s.airing_at));
      if (lastAired > nowTs - GRACE_PERIOD) graceIds.add(mediaId);
    }

    const excludedIds = new Set([
      ...entries.map((e) => e.media_id),
      ...graceIds,
    ]);

    if (!entries.length && !graceIds.size) {
      scheduleMediaIds = excludedIds;
      scheduleLoading = false;
      return;
    }

    const { data: mediaRows } = await supabase
      .from("media")
      .select("id, episodes")
      .in("id", [...excludedIds]);

    if (mediaRows) {
      const epMap = new Map(mediaRows.map((m) => [m.id, m.episodes]));
      for (const e of entries) {
        e.episodes = epMap.get(e.media_id) ?? null;
      }
    }

    scheduleEntries = entries;
    scheduleMediaIds = excludedIds;
    scheduleLoading = false;
  }

  $effect(() => {
    const interval = setInterval(() => {
      now = Math.floor(Date.now() / 1000);
    }, 1000);
    return () => clearInterval(interval);
  });

  $effect(() => {
    if (isOpen) {
      fetchSchedule();
    }
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

    const updates: Record<string, any> = {
      progress: newProgress,
    };

    if (entry.status === "planning") {
      updates.status = "current";
      updates.started_at = new Date().toISOString().split("T")[0];
    } else if (total && total === newProgress) {
      updates.status = "completed";
    }

    const listItem = items.find(
      (i: QuickUpdateItem) =>
        i.media_id === entry.media_id && i.media_type === "anime",
    );

    const result = await ListService.updateListEntry(
      user.id,
      "anime",
      entry.media_id,
      updates,
      listItem || null,
    );
    if (result.success) {
      entry.progress = newProgress;
      if (entry.status === "planning") {
        entry.status = "current";
      }
      if (listItem) {
        listItem.progress = newProgress;
        listItem.updated_at = new Date().toISOString();
        if (updates.status === "completed") {
          ui.quickUpdateItems = ui.quickUpdateItems.filter(
            (i) => i.media_id !== entry.media_id,
          );
        }
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
            <div class="flex gap-3 overflow-x-auto pb-2">
              {#each { length: 11 } as _}
                <div class="shrink-0 w-28">
                  <div
                    class="aspect-17/23 bg-(--surface-elevated) rounded animate-pulse"
                  ></div>
                  <div class="flex gap-px w-full h-1 mt-1">
                    <div
                      class="h-full flex-1 bg-(--surface-elevated) rounded-sm animate-pulse"
                    ></div>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="flex gap-3 overflow-x-auto pb-2">
              {#each sortedEntries as entry}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                  class="shrink-0 w-28 cursor-pointer group"
                  onclick={() => {
                    onClose();
                    navigateTo(`/anime/${entry.media_id}`);
                  }}
                >
                  <div class="relative">
                    <MediaCover
                      mediaId={entry.media_id}
                      type="anime"
                      size="medium"
                      showTooltip={true}
                      noHoverScale
                    />
                    <button
                      type="button"
                      aria-label="Increment progress"
                      onclick={(e) => incrementScheduleProgress(e, entry)}
                      class="absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center bg-(--hako-bg)/80 text-(--hako-fg) hover:bg-accent hover:text-white transition-all opacity-0 group-hover:opacity-100 pointer-events-auto cursor-pointer"
                    >
                      <svg
                        class="w-3 h-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="3.5"
                        stroke-linecap="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    <div
                      class="absolute top-1.5 left-1.5 bg-(--hako-bg)/80 text-(--hako-fg) text-[10px] font-bold px-1.5 py-0.5 rounded leading-none pointer-events-none"
                    >
                      {getDayName(entry.airing_at)}
                    </div>
                    {#if entry.behind > 0}
                      <div
                        class="absolute bottom-6 right-1.5 bg-(--c1)/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded leading-none pointer-events-none"
                      >
                        {entry.behind} behind
                      </div>
                    {/if}
                    <div
                      class="absolute bottom-1.5 right-1.5 bg-(--hako-bg)/80 text-(--hako-fg) text-[10px] font-bold px-1.5 py-0.5 rounded leading-none tabular-nums pointer-events-none"
                    >
                      {countdown(entry.airing_at)}
                    </div>
                  </div>
                  <div class="flex gap-px w-full h-1 mt-1">
                    {#each getSegments(entry) as seg}
                      <div
                        class="h-full bg-(--surface-elevated)"
                        style="flex: {seg.flex}; background-color: {seg.color}; border-radius: 2px"
                      ></div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      {#if isLoading && items.length === 0 && filteredCount() === 0}
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
      {:else if filteredCount() === 0}
        <div class="text-center py-20 text-(--c8)">
          <i class="fa-solid fa-list-check text-4xl mb-4 block opacity-20"></i>
          <p class="text-sm font-medium">
            {items.length > 0
              ? "All airing titles are shown in the schedule above."
              : "No titles currently in progress."}
          </p>
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
                              class="bg-(--c2) h-full transition-all duration-300 rounded-sm"
                              style="width: {((item.progress ?? 0) /
                                (media.episodes || media.chapters || 100)) *
                                100}%"
                            ></div>
                          </div>
                        </div>
                        <div
                          class="text-[10px] font-mono text-slate-500 min-w-12 mt-2 text-right"
                        >
                          {item.progress} / {media.episodes ||
                            media.chapters ||
                            "??"}
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
