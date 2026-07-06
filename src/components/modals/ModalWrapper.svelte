<script>
  import { ui, closeModal } from "../../core/ui.svelte.ts";
  import { MODAL_REGISTRY } from "./registry.ts";

  let Component = $derived(MODAL_REGISTRY[ui.activeModal]);

  $effect(() => {
    function handler(e) {
      if (e.key === "Escape" && ui.activeModal) {
        e.stopPropagation();
        closeModal();
      }
    }
    window.addEventListener("keydown", handler, { capture: true });
    return () =>
      window.removeEventListener("keydown", handler, { capture: true });
  });
</script>

{#if ui.activeModal && Component}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-100 flex items-center justify-center bg-[color-mix(in srgb,var(--hako-bg),transparent_20%)] backdrop-blur-sm p-4"
    onclick={() => closeModal()}
  >
    <div onclick={(e) => e.stopPropagation()}>
      <Component entry={ui.modalData?.entry} />
    </div>
  </div>
{/if}
