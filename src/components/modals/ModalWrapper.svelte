<script>
  import { ui } from "../../core/ui.svelte.js";
  import { MODAL_REGISTRY } from "./registry.js";

  let Component = $derived(MODAL_REGISTRY[ui.activeModal]);

  function handleKeydown(e) {
    if (ui.activeModal && e.key === "Escape") {
      ui.closeModal();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if ui.activeModal && Component}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-100 flex items-center justify-center bg-[#0b1622]/80 backdrop-blur-sm p-4"
    onclick={() => ui.closeModal()}
  >
    <div onclick={(e) => e.stopPropagation()}>
      <Component entry={ui.modalData?.entry} />
    </div>
  </div>
{/if}
