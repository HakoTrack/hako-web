<script lang="ts">
  import { closeModal as close } from "../../core/ui.svelte";
  import { HakoImage } from "../../shared/utils/images";
  import Button from "../../shared/components/Button.svelte";
  import DateInput from "../../shared/components/DateInput.svelte";
  import TextInput from "../../shared/components/TextInput.svelte";
  import Select from "../../shared/components/Select.svelte";
  import { SETTINGS_CONFIG, settings } from "../../core/settings.svelte";
  import { ui } from "../../core/ui.svelte";

  let activeTab = $state("profile");
  let profile = $derived(ui.modalData?.profile);

  // Local state for inputs to avoid binding to potentially undefined profile fields
  let birthday = $state("");
  let location = $state("");
  let favoriteStudio = $state("");
  let username = $state("");
  let email = $state("");
  let deleteEmail = $state("");
  let deletePassword = $state("");
  let deletionCode = $state("");

  $effect(() => {
    if (profile) {
      username = profile.username || "";
      email = profile.email || "";
    }
  });

  const tabs = [
    { id: "profile", label: "Profile", icon: "fa-user" },
    { id: "account", label: "Account", icon: "fa-key" },
    { id: "media", label: "Media", icon: "fa-photo-video" },
    { id: "appearance", label: "Appearance", icon: "fa-palette" },
    { id: "privacy", label: "Privacy", icon: "fa-shield" },
  ];

  function closeModal() {
    close();
  }
</script>

<div
  class="bg-card p-6 rounded-2xl shadow-2xl w-160 h-175 border border-(--surface-elevated) flex flex-col"
>
  <!-- Header -->
  <div class="flex items-center justify-between mb-6 shrink-0">
    <h2 class="text-xl font-bold text-(--hako-fg) flex items-center gap-2">
      <i class="fa-solid fa-cog text-accent"></i> Settings
    </h2>
    <button
      onclick={closeModal}
      class="text-slate-500 hover:text-(--hako-fg) transition-colors"
      aria-label="Close"
    >
      <i class="fa-solid fa-xmark text-lg"></i>
    </button>
  </div>

  <!-- Main Body -->
  <div class="flex gap-8 flex-1 min-h-0">
    <!-- Sidebar -->
    <div
      class="flex flex-col gap-1 w-40 shrink-0 border-r border-(--surface-elevated) pr-4"
    >
      {#each tabs as tab}
        <button
          onclick={() => (activeTab = tab.id)}
          class="flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-lg transition-colors outline-none focus:ring-0 {activeTab ===
          tab.id
            ? 'text-(--hako-fg) bg-(--surface-dim)'
            : 'text-slate-500 hover:text-(--hako-fg) hover:bg-(--surface-elevated)'}"
        >
          <i class="fa-solid {tab.icon} text-xs"></i>
          {tab.label}
        </button>
      {/each}
    </div>

    <!-- Content Area -->
    <div class="flex-1">
      {#if activeTab === "profile"}
        <div class="space-y-6">
          <h3 class="text-lg font-bold text-(--hako-fg)">Profile Settings</h3>

          <div class="flex gap-4 items-center">
            <div class="relative w-20 h-20 group cursor-pointer">
              <img
                src={HakoImage.get(profile?.avatar_url, { w: 80, f: "webp" })}
                class="w-full h-full rounded-full object-cover border-2 border-slate-700"
                alt="Avatar"
              />
              <div
                class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full text-xs font-bold transition-opacity"
              >
                Edit
              </div>
            </div>
            <div class="relative w-48 h-20 group cursor-pointer">
              <img
                src={HakoImage.get(profile?.banner_url, { w: 192, f: "webp" })}
                class="w-full h-full rounded-lg object-cover border border-slate-700"
                alt="Banner"
              />
              <div
                class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg text-xs font-bold transition-opacity"
              >
                Edit
              </div>
            </div>
          </div>
          <p class="text-xs text-slate-500">
            Avatar: 160x160px (max 2MB) • Banner: 1400x400px (max 4MB)
          </p>

          <div class="space-y-3">
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-xs font-bold text-slate-400 uppercase"
              >About Me</label
            >
            <textarea
              class="w-full bg-(--surface-dim) border border-(--c8) rounded-xl p-3 text-sm text-(--hako-fg) outline-none min-h-[80px]"
              placeholder="Tell us about yourself..."
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-3">
              <TextInput
                label="Location"
                placeholder="e.g. Tokyo, JP"
                bind:value={location}
              />
            </div>
            <div class="space-y-3">
              <DateInput label="Birthday" bind:value={birthday} />
            </div>
          </div>

          <div class="space-y-3">
            <TextInput
              label="Favorite Studio"
              placeholder="e.g. Kyoto Animation"
              bind:value={favoriteStudio}
            />
          </div>
        </div>
      {:else if activeTab === "account"}
        <div class="space-y-6">
          <h3 class="text-lg font-bold text-(--hako-fg)">Account Settings</h3>

          <div class="space-y-3">
            <TextInput
              label="Username"
              placeholder="Username"
              bind:value={username}
            />
            <TextInput
              label="Email Address"
              placeholder="user@email.com"
              bind:value={email}
            />
          </div>

          <div class="space-y-3 pt-4 border-t border-(--surface-elevated)">
            <h4 class="text-sm font-bold text-(--hako-fg)">Change Password</h4>
            <TextInput label="Current Password" type="password" />
            <div class="grid grid-cols-1 gap-4">
              <TextInput label="New Password" type="password" />
              <TextInput label="Confirm New Password" type="password" />
            </div>
          </div>
        </div>
      {:else if activeTab === "media"}
        <div class="space-y-6">
          <h3 class="text-lg font-bold text-(--hako-fg)">Media Settings</h3>

          <div class="space-y-3">
            <Select
              label={SETTINGS_CONFIG.titlePreference.label}
              bind:value={settings.titlePreference}
              items={SETTINGS_CONFIG.titlePreference.options}
            />
          </div>

          <div class="space-y-3 pt-4 border-t border-(--surface-elevated)">
            <h4 class="text-sm font-bold text-(--hako-fg)">
              Clear List Scores
            </h4>
            <div class="flex gap-4 items-end">
              <div class="flex-1">
                <Select
                  label="Select Format"
                  value=""
                  items={[
                    { value: "anime", label: "Anime" },
                    { value: "manga", label: "Manga" },
                    { value: "light_novel", label: "Light Novel" },
                  ]}
                />
              </div>
              <Button
                variant="danger"
                class="h-10"
                onclick={() =>
                  confirm("Are you sure you want to clear scores?") &&
                  console.log("Clearing scores...")}
              >
                Delete
              </Button>
            </div>
          </div>

          <div class="space-y-3 pt-4 border-t border-(--surface-elevated)">
            <h4 class="text-sm font-bold text-(--hako-fg)">Delete List</h4>
            <div class="flex gap-4 items-end">
              <div class="flex-1">
                <Select
                  label="Select Format"
                  value=""
                  items={[
                    { value: "anime", label: "Anime" },
                    { value: "manga", label: "Manga" },
                    { value: "light_novel", label: "Light Novel" },
                  ]}
                />
              </div>
              <Button
                variant="danger"
                class="h-10"
                onclick={() =>
                  confirm("Are you sure you want to delete this list?") &&
                  console.log("Deleting list...")}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      {:else if activeTab === "appearance"}
        <div class="space-y-4">
          <h3 class="text-lg font-bold text-(--hako-fg)">Appearance</h3>
          <p class="text-sm text-slate-400">Customize how Hako looks.</p>
          <div
            class="h-40 bg-(--surface-dim) rounded-xl border border-(--surface-elevated) flex items-center justify-center text-xs text-slate-500"
          >
            Theme/Layout controls placeholder
          </div>
        </div>
      {:else if activeTab === "privacy"}
        <div class="space-y-6">
          <h3 class="text-lg font-bold text-(--hako-fg)">Privacy</h3>
          <Select
            label={SETTINGS_CONFIG.profileVisibility.label}
            bind:value={settings.profileVisibility}
            items={SETTINGS_CONFIG.profileVisibility.options}
          />

          <div class="space-y-3 pt-4 border-t border-(--surface-elevated)">
            <h4 class="text-sm font-bold text-(--c1)">Danger Zone</h4>
            <TextInput
              label="Confirm Email"
              placeholder="Enter your email"
              bind:value={deleteEmail}
            />
            <TextInput
              label="Confirm Password"
              type="password"
              bind:value={deletePassword}
            />
            <div class="flex gap-4 items-end">
              <div class="flex-1">
                <TextInput
                  label="Deletion Code"
                  placeholder="Enter code"
                  bind:value={deletionCode}
                />
              </div>
              <Button variant="secondary" class="h-10">Send Code</Button>
            </div>
            <Button
              variant="danger"
              class="w-full"
              onclick={() =>
                confirm(
                  "Are you sure you want to delete your account? This action is irreversible.",
                ) && console.log("Deleting account...")}
            >
              Delete Account
            </Button>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Footer -->
</div>
