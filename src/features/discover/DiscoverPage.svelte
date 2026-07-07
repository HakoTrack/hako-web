<script lang="ts">
  import { onMount } from "svelte";
  import { ui, openModal } from "../../core/ui.svelte";
  import { CollectionService } from "./services/collectionService";
  import CollectionCard from "./components/CollectionCard.svelte";
  import type {
    CollectionSummary,
    CollectionType,
    CollectionSort,
  } from "../../shared/types";

  let { mediaType = "anime" }: { mediaType?: string } = $props();

  let activeTab = $state<"browse" | "collections">("collections");
  let collections = $state<CollectionSummary[]>([]);
  let total = $state(0);
  let page = $state(1);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  let typeFilter: CollectionType | "" = $state(
    ["anime", "manga", "light_novel", "visual_novel", "mixed"].includes(
      mediaType ?? "",
    )
      ? (mediaType as CollectionType)
      : "",
  );
  let sortFilter = $state<CollectionSort>("newest");
  let perPage = 20;

  const TYPE_OPTIONS: { value: CollectionType | ""; label: string }[] = [
    { value: "", label: "All Types" },
    { value: "anime", label: "Anime" },
    { value: "manga", label: "Manga" },
    { value: "light_novel", label: "Light Novel" },
    { value: "visual_novel", label: "Visual Novel" },
    { value: "mixed", label: "Mixed" },
  ];

  onMount(() => {
    loadCollections();
  });

  async function loadCollections() {
    isLoading = true;
    error = null;

    const result = await CollectionService.list(
      page,
      perPage,
      sortFilter,
      typeFilter || undefined,
    );

    if (result.success) {
      collections = result.data.data;
      total = result.data.total;
    } else {
      error = result.error;
    }

    isLoading = false;
  }

  function handleFilterChange() {
    page = 1;
    loadCollections();
  }

  function nextPage() {
    if (page * perPage < total) {
      page++;
      loadCollections();
    }
  }

  function prevPage() {
    if (page > 1) {
      page--;
      loadCollections();
    }
  }

  let totalPages = $derived(Math.ceil(total / perPage));

  function navigateTo(url: string) {
    window.history.pushState({}, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
</script>

<div class="max-w-6xl mx-auto px-4 py-8">
  <!-- Tabs -->
  <div class="flex items-center border-b border-(--surface-elevated) mb-6">
    <button
      onclick={() => (activeTab = "browse")}
      class="px-4 py-2.5 text-sm font-semibold transition-colors {activeTab ===
      'browse'
        ? 'text-accent border-b-2 border-accent'
        : 'text-slate-400 hover:text-(--hako-fg)'}"
    >
      Browse
    </button>
    <button
      onclick={() => (activeTab = "collections")}
      class="px-4 py-2.5 text-sm font-semibold transition-colors {activeTab ===
      'collections'
        ? 'text-accent border-b-2 border-accent'
        : 'text-slate-400 hover:text-(--hako-fg)'}"
    >
      Collections
    </button>
  </div>

  {#if activeTab === "browse"}
    <!-- <TopMedia {mediaType} /> -->
    <div class="text-center py-20 text-slate-500">Browse tab coming soon.</div>
  {:else if activeTab === "collections"}
    <!-- Filters -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <select
          bind:value={typeFilter}
          onchange={handleFilterChange}
          class="bg-(--surface-elevated) text-(--hako-fg) text-sm rounded-lg px-3 py-2 border border-(--surface-elevated) focus:outline-none focus:border-accent"
        >
          {#each TYPE_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>

        <select
          bind:value={sortFilter}
          onchange={handleFilterChange}
          class="bg-(--surface-elevated) text-(--hako-fg) text-sm rounded-lg px-3 py-2 border border-(--surface-elevated) focus:outline-none focus:border-accent"
        >
          <option value="newest">Newest</option>
          <option value="popular">Most Saved</option>
        </select>
      </div>

      <button
        onclick={() =>
          openModal("collection-form", {
            onSaved: (id) => {
              loadCollections();
              if (id) navigateTo(`/collection/${id}`);
            },
          })}
        class="px-4 py-2 text-sm font-semibold bg-accent text-white rounded-lg hover:brightness-110 transition-all"
      >
        + New Collection
      </button>
    </div>

    <!-- Collection Grid -->
    {#if isLoading}
      <div class="flex justify-center py-20">
        <div
          class="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"
        ></div>
      </div>
    {:else if error}
      <div class="text-center py-20">
        <p class="text-red-400 text-sm">{error}</p>
        <button
          onclick={loadCollections}
          class="mt-2 text-sm text-accent hover:underline"
        >
          Retry
        </button>
      </div>
    {:else if collections.length === 0}
      <div class="text-center py-20 text-slate-500">
        <p class="text-sm">No collections found.</p>
        <button
          onclick={() =>
            openModal("collection-form", {
              onSaved: (id) => {
                loadCollections();
                if (id) navigateTo(`/collection/${id}`);
              },
            })}
          class="mt-2 text-sm text-accent hover:underline"
        >
          Create the first one
        </button>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each collections as c (c.id)}
          <CollectionCard
            collection={c}
            onClick={() => navigateTo(`/collection/${c.id}`)}
          />
        {/each}
      </div>

      <!-- Pagination -->
      {#if totalPages > 1}
        <div class="flex items-center justify-center gap-4 mt-8">
          <button
            onclick={prevPage}
            disabled={page <= 1}
            class="px-3 py-1.5 text-sm bg-(--surface-elevated) text-(--hako-fg) rounded-lg disabled:opacity-40 hover:brightness-110 transition-all"
          >
            ← Prev
          </button>
          <span class="text-xs text-slate-400">
            Page {page} of {totalPages}
          </span>
          <button
            onclick={nextPage}
            disabled={page >= totalPages}
            class="px-3 py-1.5 text-sm bg-(--surface-elevated) text-(--hako-fg) rounded-lg disabled:opacity-40 hover:brightness-110 transition-all"
          >
            Next →
          </button>
        </div>
      {/if}
    {/if}
  {/if}
</div>
