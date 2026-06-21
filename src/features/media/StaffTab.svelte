<script lang="ts">
  import InitialAvatar from "../../shared/components/InitialAvatar.svelte";
  import Tooltip from "../../shared/components/Tooltip.svelte";
  import { sortStaffGroups, type StaffGroup } from "./services/staffUtils";

  let { staff }: { staff: StaffGroup[] } = $props();

  const sorted = $derived(sortStaffGroups(staff));
</script>

<div class="columns-2 sm:columns-3 gap-3 space-y-3">
  {#each sorted as person}
    <button
      onclick={() => {
        window.history.pushState({}, "", `/staff/${person.id}`);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }}
      class="bg-card rounded-lg p-2 hover:bg-slate-800/30 transition-colors cursor-pointer text-left w-full break-inside-avoid"
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
    <p class="col-span-full text-center text-(--c8) py-8 text-sm">
      No staff data available
    </p>
  {/each}
</div>
