<script lang="ts">
  type FeatureStatus = "completed" | "in-progress" | "upcoming";

  interface Feature {
    name: string;
    status: FeatureStatus;
  }

  interface Phase {
    name: string;
    description: string;
    status: "completed" | "current" | "upcoming";
    features: Feature[];
  }

  const phases: Phase[] = [
    {
      name: "Foundation",
      status: "current",
      description: "Basic core features.",
      features: [
        { name: "Basic List Management", status: "completed" },
        { name: "User Profiles", status: "completed" },
        { name: "Initial Vibes System", status: "completed" },
        { name: "Activity Feed", status: "in-progress" },
      ],
    },
    {
      name: "Closed Beta",
      status: "upcoming",
      description: "Refining features based on feedback, database expansion.",
      features: [
        { name: "Robust Media Search", status: "in-progress" },
        { name: "Forums", status: "upcoming" },
        { name: "Refining Vibes System", status: "upcoming" },
        { name: "Vibes Based Recommendations", status: "upcoming" },
        { name: "Mobile Responsive Design", status: "in-progress" },
      ],
    },
    {
      name: "Full Release",
      status: "upcoming",
      description: "Social and community expansion.",
      features: [
        { name: "Database Parity with MAL/AniList", status: "in-progress" },
        { name: "Refined Social Features", status: "upcoming" },
        { name: "Groups", status: "upcoming" },
        { name: "Collections", status: "upcoming" },
        { name: "Achievements System", status: "upcoming" },
        { name: "User Reviews", status: "upcoming" },
      ],
    },
    {
      name: "Post Release",
      status: "upcoming",
      description: "Going further beyond.",
      features: [
        { name: "Visual Novel Data and Tracking", status: "upcoming" },
        {
          name: "Changes and refinements based on user feedback",
          status: "upcoming",
        },
        {
          name: "In-depth Profile themeing via custom CSS",
          status: "upcoming",
        },
      ],
    },
  ];
</script>

<div class="w-full py-12 px-8">
  <div class="flex justify-between items-start">
    {#each phases as phase, i}
      <div class="flex flex-col items-center flex-1 relative">
        <!-- Node Container (Circle) -->
        <div
          class="w-8 h-8 rounded-full border-2 bg-(--hako-bg) flex items-center justify-center mb-6 z-10"
          style={phase.status === "completed"
            ? "background-color: var(--c2); border-color: var(--c2);"
            : phase.status === "current"
              ? "background-color: var(--c3); border-color: var(--c3);"
              : "background-color: var(--hako-bg); border-color: var(--c8);"}
        >
          {#if phase.status === "completed"}
            <i class="fa-solid fa-check text-(--hako-bg) text-xs"></i>
          {:else if phase.status === "current"}
            <div class="w-3 h-3 rounded-full bg-(--hako-bg)"></div>
          {:else}
            <div class="w-3 h-3 rounded-full bg-(--c8)"></div>
          {/if}
        </div>

        <!-- Connector Line -->
        {#if i < phases.length - 1}
          <div
            class="absolute top-4 left-[50%] w-full h-0.5 -z-10"
            style={phase.status === "completed"
              ? "background-color: var(--hako-fg);"
              : "background-color: var(--c8);"}
          ></div>
        {/if}

        <!-- Content -->
        <div class="text-center w-full px-2">
          <div class="text-lg font-bold text-(--hako-fg) mb-1">
            {phase.name}
          </div>
          <p
            class="text-xs text-(--c8) mb-6 leading-tight max-w-[200px] mx-auto"
          >
            {phase.description}
          </p>

          <!-- Checklist -->
          <ul class="text-left space-y-2 w-full inline-block max-w-[240px]">
            {#each phase.features as feature}
              <li class="flex items-center text-xs text-(--hako-fg)">
                <i
                  class="fa-solid {feature.status === 'completed'
                    ? 'fa-check-circle text-(--c2)'
                    : feature.status === 'in-progress'
                      ? 'fa-spinner fa-spin text-(--c3)'
                      : 'fa-circle text-(--c8)'} mr-2"
                ></i>
                {feature.name}
              </li>
            {/each}
          </ul>
        </div>
      </div>
    {/each}
  </div>
</div>
