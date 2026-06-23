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
      status: "completed",
      description: "Core platform features.",
      features: [
        { name: "Basic List Management", status: "completed" },
        { name: "User Profiles", status: "completed" },
        { name: "Initial Vibes System", status: "completed" },
        { name: "Basic Search", status: "completed" },
        { name: "Activity Feed", status: "completed" },
      ],
    },
    {
      name: "Closed Beta",
      status: "current",
      description: "Community features live, refining based on feedback.",
      features: [
        { name: "Forums", status: "completed" },
        { name: "Advanced Media Search", status: "completed" },
        { name: "Media Detail Overhaul", status: "completed" },
        { name: "User Recommendations", status: "completed" },
        { name: "Curated Tags v2", status: "completed" },
        { name: "Refined Vibes & Recommendations", status: "in-progress" },
        { name: "Mobile Responsive Design", status: "in-progress" },
      ],
    },
    {
      name: "Full Release",
      status: "upcoming",
      description: "Parity with existing platforms, social expansion.",
      features: [
        { name: "Database Parity with MAL/AniList", status: "in-progress" },
        { name: "Social Features (Groups, Collections)", status: "upcoming" },
        { name: "User Reviews", status: "upcoming" },
        { name: "Achievements System", status: "upcoming" },
        { name: "Visual Novel Data & Tracking", status: "upcoming" },
      ],
    },
    {
      name: "Post Release",
      status: "upcoming",
      description: "Going further beyond.",
      features: [
        { name: "Custom Profile Theming (CSS)", status: "upcoming" },
        { name: "Advanced Analytics & Insights", status: "upcoming" },
        { name: "API for Third-Party Integrations", status: "upcoming" },
        { name: "Community Translations", status: "upcoming" },
      ],
    },
  ];

  const statusConfig: Record<
    string,
    { icon: string; label: string; color: string }
  > = {
    completed: {
      icon: "fa-check",
      label: "Done",
      color: "var(--c2)",
    },
    current: {
      icon: "fa-spinner fa-pulse",
      label: "In Progress",
      color: "var(--c3)",
    },
    upcoming: {
      icon: "fa-clock",
      label: "Planned",
      color: "var(--c8)",
    },
  };
</script>

<div class="relative">
  <!-- Timeline line -->
  <div
    class="absolute left-[7px] md:left-[15px] top-0 bottom-0 w-px bg-(--c0)"
  ></div>

  <div class="space-y-10">
    {#each phases as phase, i}
      <div class="relative md:pl-10 pl-5">
        <!-- Timeline dot -->
        <div
          class="absolute left-[0px] md:left-[8px] top-[5px] w-[15px] h-[15px] rounded-full border-2 z-10"
          style="border-color: {statusConfig[phase.status]
            .color}; background: var(--hako-bg);"
        >
          <div
            class="w-[7px] h-[7px] rounded-full mx-auto mt-[2px]"
            style="background: {statusConfig[phase.status].color};"
          ></div>
        </div>

        <!-- Phase header row -->
        <div class="flex items-start gap-4 mb-4">
          <div class="min-w-0">
            <h3 class="text-lg font-bold text-(--hako-fg)">{phase.name}</h3>
            <p class="text-xs text-(--c8)">{phase.description}</p>
          </div>
          <span
            class="ml-auto shrink-0 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full whitespace-nowrap"
            style="color: {statusConfig[phase.status]
              .color}; background: {statusConfig[phase.status]
              .color}15; border: 1px solid {statusConfig[phase.status]
              .color}30;"
          >
            <i class="fa-solid {statusConfig[phase.status].icon} text-[8px]"
            ></i>
            {statusConfig[phase.status].label}
          </span>
        </div>

        <!-- Feature list -->
        <ul class="space-y-1.5">
          {#each phase.features as feature}
            <li class="flex items-center gap-2 text-xs text-(--hako-fg)">
              <i
                class="fa-solid {feature.status === 'completed'
                  ? 'fa-check-circle text-(--c2)'
                  : feature.status === 'in-progress'
                    ? 'fa-circle-notch fa-pulse text-(--c3)'
                    : 'fa-circle text-(--c8)/40'} text-[8px]"
              ></i>
              <span
                class={feature.status === "completed"
                  ? "line-through opacity-50"
                  : ""}>{feature.name}</span
              >
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>
</div>
