# **AniTrack**
AniTrack is a lightweight tracking platform and database being designed as a one stop shop for all otaku related media. The project currently exists as an interactive mockup used to test performance, data structures, and UI before moving to a full backend implementation.

## What Will Make AniTrack Special
Innovation. While other sites have stagnated development for over a decade, AniTrack is being created out of frustration for this as well as passion to improve upon those that came before.

### Basic Improvements
- Light Novel tracking, existing as separate lists from Manga.
- Visual Novel tracking.
- "Collections", which will bring improvements to the Interest Stacks concept created by MAL.
- Improvements to user stats to better represent your taste, via the Tonal Meta-Categories System.

### The Tonal Meta-Categories System
User statistics, like genres, tend to get dominated by 1 of 3 genres (action, comedy, drama) due to the nature of anime and related media, due to their omnipresence across the mediums. These statistics end up telling you ultimately nothing about about _why_ you like what you like. To remedy this, AniTrack introduces six pillars of "vibes" that are based not just on genre, but the main themes of the item.

- Speculative (Sci-Fi, Fantasy, Supernatural, Isekai)
  - Focus: World-building & Imagination.
  - Examples: Steins;Gate, Made in Abyss, Fullmetal Alchemist
- Visceral (Action, Adventure, Sports, Martial Arts)
  - Focus: Energy, Conflict, & Pacing.
  - Examples: Redline, Chainsaw Man, Hajime no Ippo
- Cerebral (Mystery, Psychological, Thriller, Horror)
  - Focus: Plot Twists & Intellectual Engagement.
  - Examples: Monster, Serial Experiments Lain, Shinsekai Yori
- Emotive (Drama, Tragedy, Melodrama)
  - Focus: Emotional Weight & Catharsis.
  - Examples: March Comes in Like a Lion, A Silent Voice, To Your Eternity
- Interpersonal (Romance, School, Workplace, Shoujo/Josei themes)
  - Focus: Character Bonds.
  - Examples: NANA, Horimiya, Haikyuu!!
- Lighthearted (Comedy, Slice of Life, Iyashikei)
  - Focus: Humor & Relaxation.
  - Examples: Yuru Camp, Joshiraku, Aria

Beyond this, anime can fit multiple categories.
- Fullmetal Alchemist: Speculative, Emotive, Visceral
- Steins;Gate: Speculative, Cerebral, Emotive
- Mob Psycho 100: Lighthearted, Visceral, Interpersonal

Titles are limited to primary, secondary, and tertiary meta-categories (in that order), for three total.

A real-world example to demonstrate why this can be better at helping you undestand _why_ you like something is what happens when we apply these categories to different Mahou Shoujo anime.
- Puella Magi Madoka Magica: Cerebral, Speculative, Emotive
- Princess Tutu: Emotive, Cerebral, Lighthearted
- Revolutionary Girl Utena: Cerebral, Emotive, Interpersonal
- Mawaru Penguindrum: Cerebral, Emotive, Speculative
- Symphogear: Visceral, Interpersonal, Emotive
- Kill la Kill: Visceral, Speculative, Interpersonal
- Flip Flappers: Speculative, Visceral, Lighthearted
- Cardcaptor Sakura: Interpersonal, Lighthearted, Speculative
- Precure: Lighthearted, Interpersonal, Visceral

Given these categorizations, we can observe the following.
- Someone who enjoyed Kill la Kill will most likely enjoy Symphogear more than Cardcaptor Sakura.
- Someone who enjoyed Mawaru Penduindrumm will most likely enjoy Revolutionary Girl utena more than Precure.

Now let's look outside the Mahou Shoujo genre.
- You enjoyed Madoka Magica
  - Shinsekai Yori
  - Psycho-Pass
  - Steins;Gate
- You enjoyed Symphogear
  - Gurren Lagann
  - 86 Eighty-Six
  - Promare
- You enjoyed Precure
  - Haikyuu!!
  - Mob Psycho 100
  - Little Witch Academia

## Project Context
This is not a finished website. It is a functional static prototype. Data is managed via local JSON files to simulate database interactions, and the UI is rendered dynamically using a custom component loader and vanilla JavaScript utilities.

## Current Architecture
- Component System: Uses loadComponent.js to fetch and inject HTML fragments, for a modular development workflow without a heavy framework.
- Data Layer: User lists and global media metadata are stored in `data/`, organized by user ID and media type.

## Tech Stack
- Frontend: HTML5, Tailwind CSS, Vanilla JavaScript.
- Charts: Chart.js for the "Taste Profile" radar visualizations.
- Icons: Font Awesome 6.

## Feature Roadmap
The following features are planned for the transition from mockup to application:
1. The Database: Implementation of a real database to replace local JSON files and allow for cross-device syncing.
2. Authentication: Secure user accounts with customizable profile settings.
3. Social Layer: Real-time activity feeds, global forums, and user following.
4. Advanced Filtering: Multi-criteria sorting and filtering for large media libraries (1000+ entries), including filters by genre, tag, etc.
5. Mobile Optimization: Further refinement of the responsive layouts for a native-app feel on mobile browsers.

## Directory Layout
- `/assets`: Covers and user profile images.
- `/components`: Reusable UI blocks (Nav, Footer, Overviews).
- `/data`: Local JSON storage for mock data.
- `/scripts`: Logic for rendering lists, charts, and component loading.
- `/views`: Main entry points for the profile and utility tools.
