<script>
  import { ui } from "../../core/ui.svelte.ts";
</script>

<div class="bg-card p-8 rounded-lg shadow-xl w-full max-w-md relative">
  <!-- svelte-ignore a11y_consider_explicit_label -->
  <button
    onclick={() => closeModal()}
    class="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer"
  >
    <i class="fa-solid fa-xmark"></i>
  </button>

  <h2 class="text-2xl font-bold mb-6 text-white">Settings</h2>

  <div class="space-y-4">
    <p class="text-slate-400 text-sm">
      Nothing to see here yet, but you're all set to expand this menu!
    </p>
  </div>
</div>
