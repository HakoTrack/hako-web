<script>
  import { ui, closeModal } from "../../core/ui.svelte.ts";
  import Button from "../common/Button.svelte";
</script>

<div
  class="bg-(--surface) p-8 rounded-2xl shadow-xl w-full max-w-md text-center relative"
>
  <!-- svelte-ignore a11y_consider_explicit_label -->
  <button
    onclick={() => closeModal()}
    class="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer"
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
      type="button"
      onclick={() => ui.openModal("login")}
      class="text-(--hako-accent) cursor-pointer font-bold hover:underline"
      >Sign In</button
    >
  </p>
</div>
