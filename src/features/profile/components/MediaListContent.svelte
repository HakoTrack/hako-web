<script lang="ts">
  import type { Media, ListEntry } from "../../../shared/types/index";
  import MediaCover from "../../../shared/components/MediaCover.svelte";
  import Badge from "../../../shared/components/Badge.svelte";
  import { openQuickEditor } from "../../../core/ui.svelte";
  import { fetchMediaById } from "../../../shared/utils/mediaData";
  import { STATUS_COLORS } from "../../../shared/utils/constants";

  let { type, viewMode, visibleGroups } = $props<{
    type: string;
    viewMode: "table" | "grid";
    visibleGroups: any[];
  }>();

  function getScoreColor(score: number | null): string {
    if (!score) return "text-(--c8)";
    if (score >= 9) return "text-(--c2)";
    if (score >= 8) return "text-(--c4)";
    if (score >= 7) return "text-(--c15)";
    if (score >= 5) return "text-(--c3)";
    return "text-(--c1)";
  }

  async function handleOpenEditor(id: number) {
    const media = await fetchMediaById(id);
    if (media) openQuickEditor(media, type);
  }
</script>

{#each visibleGroups as group}
  <section class="space-y-4 mb-10">
    <div class="flex items-center space-x-3 mb-6">
      <div
        class="w-1.5 h-6 rounded-full"
        style="background-color: {STATUS_COLORS[group.id]}"
      ></div>
      <h2 class="text-lg font-bold text-(--hako-fg) uppercase tracking-wider">
        {group.label}
      </h2>
    </div>

    <div class="bg-card rounded-xl overflow-hidden shadow-sm w-full">
      {#if viewMode === "table"}
        <table class="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr class="text-[10px] uppercase text-(--c8)">
              <th class="p-4 w-16 border-b border-(--surface-elevated)"></th>
              <th class="p-4 border-b border-(--surface-elevated)">Title</th>
              <th
                class="p-4 text-center w-24 border-b border-(--surface-elevated)"
                >Score</th
              >
              <th
                class="p-4 text-center w-32 border-b border-(--surface-elevated)"
                >Progress</th
              >
              <th
                class="p-4 text-center w-28 hidden sm:table-cell border-b border-(--surface-elevated)"
                >Format</th
              >
            </tr>
          </thead>
          <tbody>
            {#each group.items as item (item.media_id)}
              {@const total =
                type === "manga" ||
                type === "light_novel" ||
                type === "lightnovel"
                  ? item.meta.chapters || item.total || "?"
                  : item.meta.episodes || item.total || "?"}
              {@const displayTitle = item.displayTitle}
              <tr
                class="group hover:bg-(--surface-elevated)/30 border-b border-(--surface-elevated) last:border-0 cursor-pointer"
                onclick={() => handleOpenEditor(item.media_id)}
              >
                <td
                  class="p-2 border-b border-(--surface-elevated) group-last:border-0"
                >
                  <MediaCover
                    mediaId={item.media_id}
                    {type}
                    size="small"
                    alt={displayTitle}
                    class="mx-auto group-hover:scale-105 transition-transform"
                    showTooltip={false}
                  />
                </td>
                <td
                  class="p-4 cursor-pointer border-b border-(--surface-elevated) group-last:border-0"
                  onclick={() => handleOpenEditor(item.media_id)}
                >
                  <div
                    class="text-sm font-bold text-(--hako-fg) truncate sm:whitespace-normal"
                  >
                    {displayTitle}
                  </div>
                  <div class="flex flex-wrap gap-1 mt-1.5 hidden sm:flex">
                    {#each (item.meta as any).genres?.slice(0, 5) as genre}
                      <Badge label={genre} variant="genre" />
                    {/each}
                  </div>
                </td>
                <td
                  class="p-4 text-center text-sm font-mono {getScoreColor(
                    item.score,
                  )} border-b border-(--surface-elevated) group-last:border-0"
                  >{item.score?.toFixed(1) || "—"}</td
                >
                <td
                  class="p-4 text-center text-sm font-mono text-(--hako-fg) border-b border-(--surface-elevated) group-last:border-0"
                >
                  <span class="text-(--hako-fg)">{item.progress}</span>
                  <span class="text-(--c8) mx-1">/</span>
                  <span class="text-(--c8) text-xs">{total}</span>
                </td>
                <td
                  class="p-4 text-center border-b border-(--surface-elevated) group-last:border-0 hidden sm:table-cell"
                >
                  <span
                    class="text-[10px] font-bold bg-(--surface-dim) px-2 py-1 rounded text-slate-400 border border-(--surface-elevated)"
                  >
                    {(item.meta.format || item.type || "TV").replace(/_/g, " ")}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <div
          class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 p-4"
        >
          {#each group.items as item (item.media_id)}
            {@const total =
              type === "manga" ||
              type === "light_novel" ||
              type === "lightnovel"
                ? item.meta.chapters || item.total || "?"
                : item.meta.episodes || item.total || "?"}
            <div class="relative group">
              <MediaCover
                mediaId={item.media_id}
                {type}
                size="medium"
                alt={item.displayTitle}
                class="w-full aspect-2/3 rounded-md"
                showTooltip={false}
              />
              <div
                class="absolute bottom-0 left-0 right-0 bg-(--hako-bg)/80 p-2 text-(--hako-fg) opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"
              >
                <div
                  class="text-xs font-bold truncate"
                  title={item.displayTitle}
                >
                  {item.displayTitle}
                </div>
                <div class="text-[10px] flex justify-between mt-1 font-bold">
                  <span>{item.progress ?? 0} / {total}</span>
                  <span class={getScoreColor(item.score)}
                    >{item.score?.toFixed(1) ?? "—"}</span
                  >
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </section>
{/each}
