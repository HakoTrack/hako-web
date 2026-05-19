# Hako-web Refactoring & Migration Plan

## Summary
We are currently in the middle of a comprehensive migration of the Hako-web application, focusing on:
1. Moving from legacy Svelte to Svelte 5 Runes.
2. Migrating vanilla JS services/utilities to TypeScript.
3. Centralizing UI and Data logic.

---

## Current Status
- **Schema:** Unified `media` and `profile_list` tables.
- **UI:** Key views and components (Overview, Detail, Feed, Navbar) migrated to Svelte 5.
- **TypeScript:** Core services (Media, Profile, Metadata, Feed, Favorites) migrated. Entry point is `main.ts`.
- **Modals:** Centralized dismissal logic in `ModalWrapper.svelte`.

---

## Improvement Roadmap (The Audit List)

### 1. Eliminate "any" Types
Currently, many service responses and UI state objects use `any` or `Record<string, any>`.
- **Target:** Update `FeedService`, `ListService`, and `ui.svelte.ts` to use explicit interfaces (e.g., `Post`, `ListEntry`).
- **Benefit:** Full compile-time safety and better IDE autocomplete.

### 2. Standardize Import Architecture
Clean up references. 
- **Action:** Ensure all internal imports point to `.ts` files and remove any remaining `.js` references that were migrated.
- **Action:** audit and standardize how we handle file extensions in `tsconfig` and `vite.config`.

### 3. Centralize Error Handling
Currently, every service handles errors differently (throwing errors vs. returning null vs. console logging).
- **Target:** Implement a standard `Result<T>` wrapper or custom error class.
- **Benefit:** Components can handle "failure to fetch" in a standard way instead of checking for `null` or logging to console.

### 4. Optimize Modal Re-rendering
- **Current State:** Using `{#key}` in `ModalWrapper` to force destruction and re-mounting.
- **Future Goal:** Refactor modals to support "prop-updates" rather than re-mounting, which would be slightly more performant for complex editors.

### 5. Finalize Migration of Remaining JS
- **Target:** Migrate `vibeCalc.js` and `renderMediaList.js` to TypeScript.
- **Benefit:** Complete the transition to a strictly typed codebase.

---

## Next Steps
We will prioritize these items one by one based on your preference. 
- [ ] Migrate `vibeCalc.js` to TypeScript.
- [ ] Replace `any` types with interfaces in `ui.svelte.ts` and `feedService.ts`.
- [ ] Implement a unified Error Handling pattern.
