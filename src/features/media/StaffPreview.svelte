<script lang="ts">
  import InitialAvatar from "../../shared/components/InitialAvatar.svelte";
  import Tooltip from "../../shared/components/Tooltip.svelte";
  import type { StaffGroup } from "./services/staffUtils";

  let {
    staff,
    onViewAll,
  }: {
    staff: StaffGroup[];
    onViewAll?: () => void;
  } = $props();
</script>

<div class="space-y-4">
  <div class="flex justify-between items-center">
    <h3 class="text-(--hako-fg) font-bold">Staff</h3>
    {#if onViewAll}
      <button
        onclick={onViewAll}
        class="text-xs text-(--c8) hover:text-accent font-medium transition-colors"
        >View all</button
      >
    {/if}
  </div>
  <div class="columns-2 gap-3 space-y-3">
    {#each staff as person}
      <button
        onclick={() => {
          window.history.pushState({}, "", `/staff/${person.id}`);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }}
        class="bg-card rounded-lg p-2 cursor-pointer w-full text-left break-inside-avoid"
      >
        <div class="flex gap-2 items-start">
          <InitialAvatar
            src={person.image}
            name={person.name}
            class="w-12 h-12 object-cover rounded-full shrink-0"
          />
          <div class="min-w-0 flex-1">
            <span class="block text-xs text-(--hako-fg) font-bold truncate"
              >{person.name}</span
            >
            <div class="flex flex-wrap gap-1 mt-1">
              {#each person.roles as r}
                <Tooltip
                  placement="bottom"
                  offset={10}
                  style="max-width:100%;flex-shrink:1;min-width:0"
                >
                  {#snippet children()}
                    <span
                      class="text-[10px] px-1.5 py-0.5 rounded bg-(--surface-elevated) text-(--c7) truncate max-w-full"
                      >{r.role}</span
                    >
                  {/snippet}
                  {#snippet content()}
                    <div class="font-bold text-xs">{r.role}</div>
                  {/snippet}
                </Tooltip>
              {/each}
            </div>
          </div>
        </div>
      </button>
    {:else}
      <p class="col-span-full text-center text-(--c8) py-4 text-sm">
        No staff data available
      </p>
    {/each}
  </div>
</div>
