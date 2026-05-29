<script lang="ts">
  import type { Profile } from "../../types";

  let { profileData } = $props<{
    profileData: Profile | null;
  }>();
</script>

<div class="bg-card p-6 rounded-xl shadow-md">
  <h3 class="text-(--hako-fg) font-bold mb-4 flex items-center">
    <i class="fa-solid fa-user-tag text-accent mr-2"></i> About Me
  </h3>
  <p class="text-sm leading-relaxed text-slate-400 mb-4">
    {profileData?.about_me || "No description provided."}
  </p>
  <div
    class="space-y-3 pt-4 border-t border-(--surface-elevated) text-xs uppercase tracking-wider font-semibold text-slate-500"
  >
    <div class="flex justify-between">
      <span>Joined</span><span class="text-(--hako-fg)"
        >{profileData?.join_date
          ? new Date(profileData.join_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "N/A"}</span
      >
    </div>
    <div class="flex justify-between">
      <span>Location</span><span class="text-(--hako-fg)">Tokyo, JP</span>
    </div>
    <div class="flex justify-between">
      <span>Favorite Studio</span><span class="text-(--hako-fg)"
        >Kyoto Animation</span
      >
    </div>
  </div>
  <div
    class="mt-6 pt-6 border-t border-(--surface-elevated) flex justify-between items-center px-2"
  >
    <div class="text-center">
      <div class="text-lg font-bold text-(--hako-fg)">142</div>
      <div
        class="text-[10px] uppercase text-slate-500 font-bold tracking-tighter"
      >
        Followers
      </div>
    </div>
    <div class="h-8 w-px bg-(--surface-elevated)"></div>
    <div class="text-center">
      <div class="text-lg font-bold text-(--hako-fg)">89</div>
      <div
        class="text-[10px] uppercase text-slate-500 font-bold tracking-tighter"
      >
        Following
      </div>
    </div>
    <div class="h-8 w-px bg-(--surface-elevated)"></div>
    <div class="text-center">
      <div class="text-lg font-bold text-(--hako-fg)">12</div>
      <div
        class="text-[10px] uppercase text-slate-500 font-bold tracking-tighter"
      >
        Reviews
      </div>
    </div>
    <div class="h-8 w-px bg-(--surface-elevated)"></div>
    <div class="text-center">
      <div class="text-lg font-bold text-(--hako-fg)">21</div>
      <div
        class="text-[10px] uppercase text-slate-500 font-bold tracking-tighter"
      >
        Collections
      </div>
    </div>
  </div>
</div>
