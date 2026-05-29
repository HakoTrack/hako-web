<script>
  import { ui, closeModal } from "../../core/ui.svelte.ts";
  import Button from "../../shared/components/Button.svelte";
  import TermsOfService from "../TermsOfService.svelte";

  let username = $state("");
  let email = $state("");
  let password = $state("");
  let inviteCode = $state("");
  let tosAccepted = $state(false);
  let showTos = $state(false);

  function handleSignup() {
    // Signup logic
    console.log("Signing up:", { username, email, password, inviteCode });
  }
</script>

<div
  class="bg-(--surface) p-8 rounded-2xl shadow-xl w-full {showTos
    ? 'max-w-4xl'
    : 'max-w-md'} max-h-[90vh] text-left relative transition-all duration-300 flex flex-col"
>
  <button
    onclick={() => closeModal()}
    class="absolute top-4 right-4 text-slate-500 hover:text(--hako-fg) cursor-pointer"
  >
    <i class="fa-solid fa-xmark"></i>
  </button>

  <div class="flex gap-8 overflow-y-auto">
    <div class="w-full {showTos ? 'max-w-md' : ''} shrink-0">
      <h2 class="text-2xl font-bold mb-6 text(--hako-fg) text-center">
        Join Hako
      </h2>

      <form
        onsubmit={(e) => {
          e.preventDefault();
          handleSignup();
        }}
        class="space-y-4"
      >
        <input
          type="text"
          placeholder="Username"
          bind:value={username}
          class="w-full p-3 rounded-lg bg-(--surface-dim) text(--hako-fg) border border-(--surface-elevated)"
          required
        />
        <input
          type="email"
          placeholder="Email"
          bind:value={email}
          class="w-full p-3 rounded-lg bg-(--surface-dim) text(--hako-fg) border border-(--surface-elevated)"
          required
        />
        <input
          type="password"
          placeholder="Password"
          bind:value={password}
          class="w-full p-3 rounded-lg bg-(--surface-dim) text(--hako-fg) border border-(--surface-elevated)"
          required
        />
        <input
          type="text"
          placeholder="Invite Code"
          bind:value={inviteCode}
          class="w-full p-3 rounded-lg bg-(--surface-dim) text(--hako-fg) border border-(--surface-elevated)"
          required
        />

        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="tos"
            bind:checked={tosAccepted}
            class="accent-(--hako-accent)"
          />
          <label for="tos" class="text-sm text-slate-400">
            I agree to the <button
              type="button"
              onclick={() => (showTos = !showTos)}
              class="text-(--hako-accent) underline cursor-pointer"
              >Terms of Service</button
            >
          </label>
        </div>

        <Button
          variant="primary"
          type="submit"
          disabled={!tosAccepted || !inviteCode}
          class="w-full">Sign Up</Button
        >
      </form>

      <p class="text-sm text-slate-400 mt-6 text-center">
        Already have an account? <button
          type="button"
          onclick={() => ui.openModal("login")}
          class="text-(--hako-accent) cursor-pointer font-bold hover:underline"
          >Sign In</button
        >
      </p>
    </div>

    {#if showTos}
      <div
        class="w-full border-l border-(--surface-elevated) pl-8 overflow-y-auto"
      >
        <TermsOfService />
      </div>
    {/if}
  </div>
</div>
