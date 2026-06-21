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
