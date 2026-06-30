<script lang="ts">
  import type { Media, MediaCompanies } from "$shared/types";
  import type { VibeResult } from "$shared/types";
  import TasteProfile from "$features/profile/components/TasteProfile.svelte";

  let {
    media,
    type = "anime",
    companies,
    vibes,
    categorizedTags = [],
    effectiveSource = "",
  } = $props<{
    media: Media;
    type: string;
    companies: MediaCompanies;
    vibes: VibeResult;
    categorizedTags: {
      category: string;
      label: string;
      color: string;
      tags: { name: string; parent?: string; spoiler?: boolean }[];
    }[];
    effectiveSource: string;
  }>();

  function toTitleCase(str: string | null | undefined): string {
    if (!str) return "N/A";
    return str
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
</script>

<div class="top-24 space-y-6">
  <div class="bg-card p-5 rounded-xl shadow-lg">
    <h3 class="text-(--hako-fg) font-bold mb-3 text-sm">Info</h3>
    <div class="space-y-2.5 text-sm text-slate-300">
      <div class="flex justify-between">
        <span class="text-(--c8)">Type</span>
        <span class="text-(--hako-fg)"
          >{type === "light_novel" ? "Light Novel" : toTitleCase(type)}</span
        >
      </div>
      <div class="flex justify-between">
        <span class="text-(--c8)">Format</span>
        <span class="text-(--hako-fg)">{media.format}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-(--c8)">Source</span>
        <span class="text-(--hako-fg)">{effectiveSource}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-(--c8)"
          >{type === "anime" ? "Episodes" : "Chapters"}</span
        >
        <span class="text-(--hako-fg)">
          {type === "anime" ? media.episodes || "N/A" : media.chapters || "N/A"}
        </span>
      </div>
      {#if type !== "anime"}
        <div class="flex justify-between">
          <span class="text-(--c8)">Volumes</span>
          <span class="text-(--hako-fg)">{media.volumes || "N/A"}</span>
        </div>
      {/if}
      {#if type === "anime"}
        <div class="flex justify-between">
          <span class="text-(--c8)">Duration</span>
          <span class="text-(--hako-fg)">{media.duration || "N/A"} mins</span>
        </div>
      {/if}
      <div class="space-y-0.5">
        <div class="flex justify-between">
          <span class="text-(--c8)"
            >{type === "anime" ? "Season" : "Publishing"}</span
          >
          <span class="text-(--hako-fg)">
            {#if type === "anime"}
              {toTitleCase(media.season)} {media.seasonYear || ""}
            {:else}
              —
            {/if}
          </span>
        </div>
        {#if media.startDate?.year || media.endDate?.year}
          <div class="text-[10px] text-slate-500 text-right">
            {media.startDate?.year
              ? `${String(media.startDate.month).padStart(2, "0")}/${String(media.startDate.day).padStart(2, "0")}/${media.startDate.year}`
              : "???"}
            -
            {media.endDate?.year
              ? `${String(media.endDate.month).padStart(2, "0")}/${String(media.endDate.day).padStart(2, "0")}/${media.endDate.year}`
              : "Present"}
          </div>
        {/if}
      </div>
      {#if type === "anime"}
        <div class="flex justify-between">
          <span class="text-(--c8)">Studios</span>
          <div class="text-right">
            {#if companies.studios.length > 0}
              {#each companies.studios as studio (studio.id)}
                <div
                  class="text-xs text-(--hako-accent) font-medium bg-(--hako-accent)/10 border rounded-full px-2 py-0.5"
                >
                  {studio.name}
                </div>
              {/each}
            {:else}
              <span class="text-(--c5) font-medium">—</span>
            {/if}
          </div>
        </div>
        {#if companies.producers.length > 0}
          <div class="space-y-1">
            <span class="text-(--c8)">Producers</span>
            <div class="flex flex-wrap gap-1">
              {#each companies.producers as producer (producer.id)}
                <span
                  class="text-xs text-(--c12) bg-(--c12)/10 rounded-full border px-2 py-0.5"
                  >{producer.name}</span
                >
              {/each}
            </div>
          </div>
        {/if}
      {/if}
    </div>
  </div>

  <TasteProfile {vibes} />

  <div class="bg-card p-5 rounded-xl shadow-lg">
    <h3 class="text-(--hako-fg) font-bold mb-3 text-sm">Tags</h3>
    <div class="space-y-4">
      {#each categorizedTags as group}
        <div>
          <h4
            class="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
            style="color: {group.color}"
          >
            {group.label}
          </h4>
          <div class="flex flex-wrap gap-1">
            {#each group.tags as tag}
              <span
                class="px-2 py-0.5 rounded text-[11px] font-medium border {tag.spoiler
                  ? 'blur-sm hover:blur-none cursor-pointer transition-all duration-200'
                  : ''}"
                style="border-color: {group.color}30; color: {group.color}; background: {group.color}10"
              >
                {tag.name}
                {#if tag.parent}
                  <span class="opacity-50 ml-0.5">· {tag.parent}</span>
                {/if}
              </span>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <div class="bg-card p-5 rounded-xl shadow-lg">
    <h3 class="text-(--hako-fg) font-bold mb-3 text-sm">Stats</h3>
    <div class="space-y-3">
      <div class="flex justify-between items-center">
        <span class="text-(--c8) text-sm">Mean Score</span>
        <span class="text-lg font-black text-(--c5)">8.5</span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-(--c8) text-sm">Median Score</span>
        <span class="text-lg font-black text-(--c5)">82</span>
      </div>
      <hr class="border-(--c0)" />
      <div class="flex justify-between items-center">
        <span class="text-(--c8) text-sm">Favorites</span>
        <span class="flex items-center gap-1 text-pink-500 font-bold">
          <i class="fa-solid fa-heart text-xs"></i>
          12.4k
        </span>
      </div>
      <hr class="border-(--c0)" />
      <div>
        <span class="text-(--c8) text-xs font-medium block mb-2"
          >Score Distribution</span
        >
        <div class="flex items-end gap-px h-20">
          {#each [{ score: 10, count: 120 }, { score: 20, count: 450 }, { score: 30, count: 800 }, { score: 40, count: 1500 }, { score: 50, count: 3200 }, { score: 60, count: 5600 }, { score: 70, count: 12000 }, { score: 80, count: 18000 }, { score: 90, count: 14000 }, { score: 100, count: 9000 }] as dist}
            <div
              class="flex-1 flex flex-col items-center justify-end h-full gap-0.5"
            >
              <div
                class="w-full rounded-t opacity-70 hover:opacity-100 transition-opacity"
                style="height: {(dist.count / 18000) *
                  100}%; background: var(--c5)"
              ></div>
              <span class="text-[8px] text-(--c8) font-bold">{dist.score}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>
