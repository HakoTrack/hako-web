import type { VibePillar, VibeResult } from "../../shared/types";

interface TagWeight {
  Speculative?: number;
  Visceral?: number;
  Cerebral?: number;
  Emotive?: number;
  Interpersonal?: number;
  Lighthearted?: number;
}

const TAG_WEIGHTS: Record<string, TagWeight> = {
  Action: { Visceral: 6, Speculative: 2 },
  Drama: { Emotive: 6, Interpersonal: 3 },
  "Mahou Shoujo": { Speculative: 5, Visceral: 3, Emotive: 3 },
  Music: { Emotive: 4, Lighthearted: 4, Interpersonal: 2 },
  "Sci-Fi": { Speculative: 6, Cerebral: 4 },
  "Martial Arts": { Visceral: 5, Cerebral: 2 },
  Archery: { Visceral: 3, Cerebral: 3 },
  Guns: { Visceral: 5 },
  Swordplay: { Visceral: 4 },
  Magic: { Speculative: 5, Cerebral: 3 },
  Henshin: { Speculative: 5, Visceral: 3 },
  "Urban Fantasy": { Speculative: 4, Cerebral: 2 },
  Mythology: { Speculative: 5, Cerebral: 3 },
  Gods: { Speculative: 5, Cerebral: 3 },
  Yuri: { Interpersonal: 5, Emotive: 4 },
  "Found Family": { Interpersonal: 10, Emotive: 7, Lighthearted: 4 },
  Survival: { Visceral: 10, Speculative: 4 },
  Rebellion: { Visceral: 7, Speculative: 5, Cerebral: 4 },
  "Fate & Destiny": { Speculative: 9, Cerebral: 5, Emotive: 4 },
  "Self-Sacrifice": { Emotive: 9, Interpersonal: 7, Visceral: 4 },
  "Radical Empathy": { Interpersonal: 10, Emotive: 8, Cerebral: 3, Lighthearted: 3 },
  Urban: { Cerebral: 2, Interpersonal: 2 },
  "Lost Civilization": { Speculative: 3, Cerebral: 2 },
  "Romantic Comedy": { Emotive: 4, Interpersonal: 4, Lighthearted: 5 },
  Harem: { Interpersonal: 5, Emotive: 3 },
  "Slow Burn": { Interpersonal: 7, Emotive: 6 },
  "Otaku Culture": { Cerebral: 4, Lighthearted: 4, Interpersonal: 3 },
  Meta: { Cerebral: 6, Lighthearted: 3 },
  "Primarily Female Cast": { Interpersonal: 2 },
  "Ensemble Cast": { Interpersonal: 3 },
  "Primarily Teen Cast": { Interpersonal: 2, Lighthearted: 2 },
  "Time Skip": { Cerebral: 2 },
  Band: { Interpersonal: 5, Emotive: 4, Lighthearted: 3 },
  Loneliness: { Emotive: 9, Interpersonal: 4 },
  "Second Chance": { Emotive: 8, Interpersonal: 6 },
  Melancholy: { Emotive: 10, Cerebral: 5 },
  Dissociation: { Cerebral: 8, Emotive: 7, Speculative: 4 },
  "Mental Illness": { Emotive: 9, Interpersonal: 5, Cerebral: 4 },
  "Coming of Age": { Interpersonal: 8, Emotive: 6, Lighthearted: 3 },
  Philosophy: { Cerebral: 10, Speculative: 3 },
  Surrealism: { Speculative: 9, Cerebral: 7 },
  "Musical Theater": { Interpersonal: 6, Emotive: 5, Lighthearted: 4 },
  "Boarding School": { Interpersonal: 2, Cerebral: 1 },
  "Time Loop": { Speculative: 10, Cerebral: 8 },
  Existential: { Cerebral: 10, Speculative: 6, Emotive: 5 },
  Revenge: { Visceral: 8, Emotive: 5 },
  Denpa: { Cerebral: 8, Speculative: 4, Emotive: 4 },
  Bullying: { Emotive: 6, Interpersonal: 5 },
  Torture: { Visceral: 8, Emotive: 6 },
  "Self Harm": { Emotive: 8, Cerebral: 3 },
  Nudity: { Emotive: 3, Cerebral: 2 },
  Psychosexual: { Emotive: 8, Visceral: 5, Cerebral: 4 },
  "Ero Guro": { Visceral: 7, Speculative: 4, Cerebral: 3 },
  Tragedy: { Emotive: 10, Interpersonal: 5, Visceral: 4 },
  War: { Visceral: 9, Interpersonal: 6, Cerebral: 5 },
  "Female Harem": { Interpersonal: 3, Emotive: 2 },
  Betrayal: { Emotive: 8, Interpersonal: 7, Cerebral: 3 },
  "Idol Culture": { Emotive: 8, Interpersonal: 6, Cerebral: 4 },
  Forgiveness: { Interpersonal: 8, Emotive: 7, Lighthearted: 4 },
  School: { Interpersonal: 1 },
  "Female Protagonist": { Interpersonal: 2 },
  Idol: { Interpersonal: 3, Emotive: 3, Lighthearted: 2 },
  "Primarily Adult Cast": { Interpersonal: 2, Cerebral: 1 },
  Drugs: { Visceral: 4, Emotive: 3, Cerebral: 2 },
  Suicide: { Emotive: 8, Cerebral: 4 },
  Tsundere: { Interpersonal: 4, Emotive: 3, Lighthearted: 3 },
  Kuudere: { Interpersonal: 3, Cerebral: 3, Emotive: 2 },
  Iyashikei: { Emotive: 9, Lighthearted: 7, Interpersonal: 5, Cerebral: 1 },
  Aquatic: { Lighthearted: 2 },
  "Small Town": { Interpersonal: 2, Lighthearted: 1 },
  "Science Fantasy": { Speculative: 6, Cerebral: 3 },
  CGDCT: { Lighthearted: 7, Emotive: 5, Interpersonal: 3 },
};

const PILLARS = [
  "Speculative",
  "Visceral",
  "Cerebral",
  "Emotive",
  "Interpersonal",
  "Lighthearted",
] as const;

export function computeMockVibes(
  groups: { category: string; tags: { name: string; spoiler?: boolean }[] }[],
): VibeResult {
  // PascalCase keys match WASM serde rename + VIBE_LABELS lookup in chart
  const scores = {
    Speculative: 0,
    Visceral: 0,
    Cerebral: 0,
    Emotive: 0,
    Interpersonal: 0,
    Lighthearted: 0,
  };

  for (const group of groups) {
    for (const tag of group.tags) {
      const weight = TAG_WEIGHTS[tag.name];
      if (!weight) continue;
      for (const pillar of PILLARS) {
        const val = weight[pillar];
        if (val) scores[pillar] += val;
      }
    }
  }

  const sorted: VibePillar[] = PILLARS.map((name) => ({
    name: name.toLowerCase(),
    score: scores[name],
  })).sort((a, b) => b.score - a.score);

  return { scores, sorted } as unknown as VibeResult;
}
