<script>
  import { supabase } from "../../core/supabase.js";
  import { ui, closeModal } from "../../core/ui.svelte.ts";
  import Button from "../../shared/components/Button.svelte";

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

<div class="bg-(--surface) p-8 rounded-2xl shadow-xl w-full max-w-md relative">
  <!-- svelte-ignore a11y_consider_explicit_label -->
  <button
    onclick={() => closeModal()}
    class="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer"
  >
    <i class="fa-solid fa-xmark"></i>
  </button>
  <h2 class="text-2xl font-bold mb-6 text-(--hako-accent)">おかえり</h2>
  {#if errorMsg}
    <p class="text-red-500 text-sm mb-4">{errorMsg}</p>
  {/if}
  <form onsubmit={handleLogin} class="space-y-4">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <input
      type="email"
      bind:value={email}
      placeholder="Email"
      class="w-full p-3 bg-(--hako-bg) rounded-xl outline-none text-(--hako-fg) transition-colors"
    />
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <input
      type="password"
      bind:value={password}
      placeholder="Password"
      class="w-full p-3 bg-(--hako-bg) rounded-xl outline-none text-(--hako-fg) transition-colors"
    />
    <Button type="submit" variant="primary" align="center" class="w-full"
      >Sign In</Button
    >
    <p class="mt-4 text-sm text-(--c8)">
      Don't have an account? <button
        type="button"
        onclick={() => ui.openModal("signup")}
        class="text-(--hako-accent) cursor-pointer font-bold hover:underline"
        >Join Hako</button
      >
    </p>
  </form>
</div>
