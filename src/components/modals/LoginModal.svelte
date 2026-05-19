<script>
  import { supabase } from "../../utils/supabase.js";
  import { ui, closeModal } from "../../core/ui.svelte.ts";

  let email = "";
  let password = "";
  let errorMsg = "";

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      closeModal();
      window.history.pushState({}, "", "/feed");
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch (error) {
      errorMsg = error.message;
    }
  }
</script>

<div class="bg-card p-8 rounded-lg shadow-xl w-full max-w-md relative">
  <!-- svelte-ignore a11y_consider_explicit_label -->
  <button
    onclick={() => closeModal()}
    class="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer"
  >
    <i class="fa-solid fa-xmark"></i>
  </button>
  <h2 class="text-2xl font-bold mb-6 text-accent">おかえり</h2>
  {#if errorMsg}
    <p class="text-red-500 text-sm mb-4">{errorMsg}</p>
  {/if}
  <form onsubmit={handleLogin}>
    <input
      type="email"
      bind:value={email}
      placeholder="Email"
      class="w-full p-3 mb-4 bg-[#0b1622] border border-slate-700 rounded focus:border-accent outline-none text-white"
    />
    <input
      type="password"
      bind:value={password}
      placeholder="Password"
      class="w-full p-3 mb-6 bg-[#0b1622] border border-slate-700 rounded focus:border-accent outline-none text-white"
    />
    <button
      type="submit"
      class="w-full bg-indigo-400/50 text-white py-3 rounded font-bold hover:bg-indigo-400 transition-all cursor-pointer"
    >
      Sign In
    </button>
    <p class="mt-4 text-sm text-slate-400">
      Don't have an account? <button
        type="button"
        onclick={() => ui.openModal("signup")}
        class="text-accent cursor-pointer">Join Hako</button
      >
    </p>
  </form>
</div>
