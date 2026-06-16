<script lang="ts">
  import { onMount } from "svelte";
  import { HakoImage } from "$utils/images";
  import TermsOfService from "../../components/TermsOfService.svelte";
  import { Button, TextInput } from "$components";
  import { supabase } from "$core/supabase";
  import { toast } from "$utils/toast";

  let heroUrl = $state("");
  type Step = "tos" | "credentials" | "profile" | "import";
  let step = $state<Step>("tos");
  let isSaving = $state(false);
  let signupComplete = $state(false);
  let signupEmail = $state("");

  let formData = $state({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    inviteCode: "",
    quote: "",
    aboutMe: "",
    importProvider: "",
  });

  onMount(() => {
    heroUrl = HakoImage.get("global/landing.webp");
  });

  async function next() {
    if (step === "tos") {
      step = "credentials";
    } else if (step === "credentials") {
      if (!formData.username.trim()) {
        toast.error("Username is required");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      if (formData.password.length < 8) {
        toast.error("Password must be at least 8 characters");
        return;
      }
      if (!formData.inviteCode.trim()) {
        toast.error("Invite code is required");
        return;
      }
      step = "profile";
    } else if (step === "profile") {
      step = "import";
    }
  }

  function back() {
    if (step === "credentials") step = "tos";
    else if (step === "profile") step = "credentials";
    else if (step === "import") step = "profile";
  }

  async function finish() {
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!formData.username.trim()) {
      toast.error("Username is required");
      return;
    }
    if (!formData.inviteCode.trim()) {
      toast.error("Invite code is required");
      return;
    }

    isSaving = true;

    const { data: codeData, error: codeError } = await supabase.rpc(
      "redeem_invite_code",
      { invite_code: formData.inviteCode },
    );

    if (codeError || !codeData) {
      toast.error("Invalid or already used invite code.");
      isSaving = false;
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      toast.error(authError.message);
      isSaving = false;
      return;
    }

    if (!authData.user) {
      toast.error("Signup failed, please try again.");
      isSaving = false;
      return;
    }

    const { error: claimError } = await supabase.rpc("claim_invite_code", {
      invite_code: formData.inviteCode,
      user_id: authData.user.id,
    });

    if (claimError) {
      toast.error("Failed to link invite code: " + claimError.message);
      isSaving = false;
      return;
    }

    const { error: profileError } = await supabase.rpc("setup_profile", {
      user_id: authData.user.id,
      p_username: formData.username,
      p_quote: formData.quote,
      p_about_me: formData.aboutMe,
    });

    if (profileError) {
      toast.error("Failed to set up profile: " + profileError.message);
      isSaving = false;
      return;
    }

    signupEmail = formData.email;
    signupComplete = true;
  }
</script>

<div
  class="min-h-screen hako-hero-bg flex items-center justify-center p-2"
  style="--hero-bg: url('{heroUrl}')"
>
  <div class="w-full max-w-2xl p-2">
    {#if signupComplete}
      <div class="text-center py-16">
        <i class="fa-solid fa-envelope text-6xl text-(--hako-accent) mb-6 block"
        ></i>
        <h1 class="text-2xl font-bold text-(--hako-fg) mb-3">
          Check your email
        </h1>
        <p class="text-slate-400 mb-2">We sent a confirmation link to</p>
        <p class="text-(--hako-fg) font-medium mb-8">
          {signupEmail}
        </p>
        <p class="text-sm text-slate-500">
          Click the link in the email to verify your account, then log in.
        </p>
      </div>
    {:else if step === "tos"}
      <h1 class="text-2xl font-bold text-(--hako-fg) mb-2 text-center">
        Terms of Service
      </h1>
      <div class="pr-4 mb-8 text-sm text-slate-300">
        <TermsOfService />
      </div>
      <div class="flex justify-end gap-4">
        <button
          type="button"
          class="px-6 py-2.5 rounded-xl font-bold text-sm bg-white/5 backdrop-blur-xl text-(--hako-fg) border border-white/10 hover:bg-white/10 transition-all"
          onclick={() => window.history.back()}
        >
          Decline
        </button>
        <button
          type="button"
          class="px-6 py-2.5 rounded-xl font-bold text-sm bg-var(--hako-accent) text-var(--hako-bg) hover:opacity-90 shadow-lg transition-all"
          onclick={next}
        >
          Accept & Continue
        </button>
      </div>
    {:else if step === "credentials"}
      <h1 class="text-2xl font-bold text-(--hako-fg) mb-6 text-center">
        Create Account
      </h1>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <TextInput
          label="Username"
          bind:value={formData.username}
          name="username"
          autocomplete="username"
        />
        <TextInput
          label="Password"
          type="password"
          bind:value={formData.password}
          name="password"
          autocomplete="new-password"
        />
        <TextInput
          label="Email"
          type="email"
          bind:value={formData.email}
          name="email"
          autocomplete="email"
        />
        <TextInput
          label="Confirm Password"
          type="password"
          bind:value={formData.confirmPassword}
          name="confirm-password"
          autocomplete="new-password"
        />
      </div>

      <div class="mb-8">
        <TextInput
          label="Invite Code"
          bind:value={formData.inviteCode}
          placeholder="xxxx-xxxx-xxxx-xxxx-xxxx-xxxx"
          class="max-w-62.5 mx-auto"
        />
      </div>

      <div class="flex justify-between gap-4">
        <Button variant="secondary" onclick={back}>Back</Button>
        <Button variant="primary" onclick={next}>Next: Profile</Button>
      </div>
    {:else if step === "profile"}
      <h1 class="text-2xl font-bold text-(--hako-fg) mb-6 text-center">
        Profile Details
      </h1>
      <div class="space-y-4 mb-8">
        <div class="space-y-1.5">
          <TextInput
            label="Quote"
            bind:value={formData.quote}
            maxlength="140"
          />
          <p class="text-[10px] text-slate-500 text-right">
            {formData.quote.length}/140
          </p>
        </div>
        <div class="space-y-1.5">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label
            class="text-xs font-bold text-slate-400 uppercase tracking-wider block"
            >About Me</label
          >

          <textarea
            bind:value={formData.aboutMe}
            class="w-full h-32 bg-(--surface-dim) rounded-lg border border-(--c8) p-3 text-sm text-(--hako-fg) focus:border-(--hako-accent) outline-none"
          ></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <Button variant="secondary">Upload Avatar</Button>
          <Button variant="secondary">Upload Banner</Button>
        </div>
      </div>
      <div class="flex justify-between gap-4">
        <Button variant="secondary" onclick={back}>Back</Button>
        <Button variant="primary" onclick={next}>Next: Import</Button>
      </div>
    {:else if step === "import"}
      <h1 class="text-2xl font-bold text-(--hako-fg) mb-6 text-center">
        Import Lists
      </h1>
      <p class="text-slate-400 mb-8 text-center">
        Want to bring your existing lists over?
      </p>

      <div class="space-y-4 mb-8">
        {#each ["AniList", "MyAnimeList"] as provider}
          <div
            class="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden"
          >
            <button
              class="w-full p-4 text-left font-bold text-(--hako-fg) hover:bg-white/10 transition-colors flex justify-between items-center"
              onclick={() => {
                const isExpanded = formData.importProvider === provider;
                formData.importProvider = isExpanded ? "" : provider;
              }}
            >
              Import from {provider}
              <i
                class="fa-solid fa-chevron-{formData.importProvider === provider
                  ? 'up'
                  : 'down'} text-xs"
              ></i>
            </button>

            {#if formData.importProvider === provider}
              <div
                class="p-4 grid grid-cols-2 gap-4 border-t border-(--c8) animate-in slide-in-from-top-2"
              >
                <div
                  class="border-2 border-dashed border-(--c8) rounded-lg p-6 text-center text-sm text-slate-500 hover:border-(--hako-accent) cursor-pointer"
                >
                  Drop Anime List Here
                </div>
                <div
                  class="border-2 border-dashed border-(--c8) rounded-lg p-6 text-center text-sm text-slate-500 hover:border-(--hako-accent) cursor-pointer"
                >
                  Drop Manga List Here
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <div class="flex justify-between gap-4">
        <Button variant="secondary" onclick={back}>Back</Button>
        <Button variant="primary" onclick={finish} disabled={isSaving}>
          {isSaving ? "Creating..." : "Finish"}
        </Button>
      </div>
    {/if}
  </div>
</div>
