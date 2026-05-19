<script>
  import { ui, closeModal } from "../../core/ui.svelte.ts";
  import { MODAL_REGISTRY } from "./registry.ts";

  let Component = $derived(MODAL_REGISTRY[ui.activeModal]);

  function handleKeydown(e) {
    if (ui.activeModal && e.key === "Escape") {
      closeModal();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if ui.activeModal && Component}
  <div
    class="fixed inset-0 z-100 flex items-center justify-center bg-[#0b1622]/80 backdrop-blur-sm p-4"
    onclick={() => closeModal()}
  >
    <div onclick={(e) => e.stopPropagation()}>
      <Component entry={ui.modalData?.entry} />
    </div>
  </div>
{/if}
