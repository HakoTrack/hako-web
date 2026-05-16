<script>
  import { ui } from "../core/ui.svelte.js";
</script>

<div
  class="fixed inset-0 z-[100] flex items-center justify-center bg-[#0b1622]/80 backdrop-blur-sm p-4"
  on:click|self={() => ui.closeModal()}
>
  <div
    class="bg-card p-6 rounded-lg shadow-xl w-full max-w-md text-center relative"
  >
    <button
      on:click={() => ui.closeModal()}
      class="absolute top-4 right-4 text-slate-500 hover:text-white"
    >
      <i class="fa-solid fa-xmark"></i>
    </button>
    <h2 class="text-2xl font-bold mb-4 text-slate-400">Registration Closed</h2>
    <p class="text-slate-500 mb-6">
      We are currently in a closed alpha phase.<br />
      Please check back later.
    </p>
    <p class="text-sm text-slate-400">
      Already have an account? <button
        on:click={() => ui.openModal("login")}
        class="text-accent cursor-pointer">Sign In</button
      >
    </p>
  </div>
</div>
