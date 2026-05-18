/**
 * src/utils/toneCalc.js
 * Calculates tonal pillar scores for media entries based on metadata.
 */

const SCHEMA = {
  genres: {
    "Action": { primary: "Visceral" },
    "Adventure": { primary: "Speculative", secondary: "Visceral" },
    "Comedy": { primary: "Lighthearted" },
    "Drama": { primary: "Emotive", secondary: "Cerebral" },
    "Ecchi": { primary: "Visceral", secondary: "Lighthearted" },
    "Fantasy": { primary: "Speculative" },
    "Hentai": { primary: "Visceral", secondary: "Interpersonal" },
    "Horror": { primary: "Visceral", secondary: "Cerebral" },
    "Mahou Shoujo": { primary: "Speculative", secondary: "Lighthearted" },
    "Mecha": { primary: "Speculative", secondary: "Visceral" },
    "Music": { primary: "Visceral", secondary: "Emotive" },
    "Mystery": { primary: "Cerebral" },
    "Psychological": { primary: "Cerebral", secondary: "Emotive" },
    "Romance": { primary: "Interpersonal", secondary: "Emotive" },
    "Sci-Fi": { primary: "Speculative", secondary: "Cerebral" },
    "Slice of Life": { primary: "Lighthearted", secondary: "Interpersonal" },
    "Sports": { primary: "Visceral", secondary: "Interpersonal" },
    "Supernatural": { primary: "Speculative", secondary: "Cerebral" },
    "Thriller": { primary: "Cerebral", secondary: "Visceral" }
  },
  tags: {
    "Afterlife": { p: "Speculative", w: 2 }, "Alternate Universe": { p: "Speculative", w: 2 }, "Cyberspace": { p: "Speculative", w: 2 },
    "Space": { p: "Speculative", w: 2 }, "Virtual World": { p: "Speculative", w: 2 }, "Post-Apocalyptic": { p: "Speculative", w: 2 }, "Underwater": { p: "Speculative", w: 2 },
    "Achronological Order": { p: "Cerebral", w: 2 }, "Time Loop": { p: "Cerebral", w: 2 }, "Anachronism": { p: "Cerebral", w: 2 },
    "War": { p: "Visceral", w: 1 }, "Historical": { p: "Visceral", w: 1 },
    "Anti-Hero": { p: "Cerebral", w: 1 }, "Detective": { p: "Cerebral", w: 1 }, "God-Complex": { p: "Cerebral", w: 1 },
    "Assassins": { p: "Visceral", w: 1 }, "Delinquents": { p: "Visceral", w: 1 }, "Merc mercenaries": { p: "Visceral", w: 1 }, "Zombie": { p: "Visceral", w: 1 },
    "Orphan": { p: "Emotive", w: 1 }, "Hikikomori": { p: "Emotive", w: 1 }, "Twins": { p: "Emotive", w: 1 },
    "Chibi": { p: "Lighthearted", w: 1 }, "Kemonomimi": { p: "Lighthearted", w: 1 }, "Ojou-sama": { p: "Lighthearted", w: 1 },
    "Maid": { p: "Interpersonal", w: 1 }, "Butler": { p: "Interpersonal", w: 1 }, "Teacher": { p: "Interpersonal", w: 1 },
    "Battle Royale": { p: "Visceral", w: 5 }, "Martial Arts": { p: "Visceral", w: 5 }, "Swordplay": { p: "Visceral", w: 5 }, "Gore": { p: "Visceral", w: 5 }, "Guns": { p: "Visceral", w: 5 }, "Tanks": { p: "Visceral", w: 5 }, "Archery": { p: "Visceral", w: 5 },
    "Tragedy": { p: "Emotive", w: 5 }, "Grief": { p: "Emotive", w: 5 }, "Bullying": { p: "Emotive", w: 5 }, "Suicide": { p: "Emotive", w: 5 }, "Melancholy": { p: "Emotive", w: 5 }, "Rejection": { p: "Emotive", w: 5 },
    "Conspiracy": { p: "Cerebral", w: 5 }, "Class Struggle": { p: "Cerebral", w: 5 }, "Memory Manipulation": { p: "Cerebral", w: 5 }, "Politics": { p: "Cerebral", w: 5 }, "Social Commentary": { p: "Cerebral", w: 5 },
    "Alchemy": { p: "Speculative", w: 5 }, "Magic": { p: "Speculative", w: 5 }, "Mythology": { p: "Speculative", w: 5 }, "Isekai": { p: "Speculative", w: 5 }, "Cultivation": { p: "Speculative", w: 5 }, "Urban Fantasy": { p: "Speculative", w: 5 }, "Youkai": { p: "Speculative", w: 5 },
    "High Stakes": { p: "Visceral", w: 5 }, "Gambling": { p: "Visceral", w: 5 }, "Death Game": { p: "Visceral", w: 5 }, "Survival": { p: "Visceral", w: 5 },
    "Teamwork": { p: "Interpersonal", w: 5 }, "Rivalry": { p: "Interpersonal", w: 5 }, "E-Sports": { p: "Interpersonal", w: 5 },
    "Philosophy": { p: "Cerebral", w: 5 }, "Satire": { p: "Cerebral", w: 5 }, "Denpa": { p: "Cerebral", w: 5 }, "Meta": { p: "Cerebral", w: 5 }, "Surreal": { p: "Cerebral", w: 5 },
    "Mental Illness": { p: "Emotive", w: 5 }, "Loneliness": { p: "Emotive", w: 5 }, "Family Life": { p: "Emotive", w: 5 }, "Existential": { p: "Emotive", w: 5 },
    "Slapstick": { p: "Lighthearted", w: 5 }, "Crossover": { p: "Lighthearted", w: 5 }, "Holidays": { p: "Lighthearted", w: 5 }, "Parody": { p: "Lighthearted", w: 5 },
    "Cohabitation": { p: "Interpersonal", w: 5 }, "Marriage": { p: "Interpersonal", w: 5 }, "Fake Relationship": { p: "Interpersonal", w: 5 }, "Yuri": { p: "Interpersonal", w: 5 }, "Yaoi": { p: "Interpersonal", w: 5 }, "Childhood Friends": { p: "Interpersonal", w: 5 },
    "Heartbreak": { p: "Emotive", w: 5 }, "Unrequited Love": { p: "Emotive", w: 5 }, "Love Triangle": { p: "Emotive", w: 5 },
    "Cyberpunk": { p: "Speculative", w: 5 }, "Space Opera": { p: "Speculative", w: 5 }, "Time Travel": { p: "Speculative", w: 5 }, "Dystopian": { p: "Speculative", w: 5 }, "Steampunk": { p: "Speculative", w: 5 }, "Aliens": { p: "Speculative", w: 5 },
    "Artificial Intelligence": { p: "Cerebral", w: 5 }, "Transhumanism": { p: "Cerebral", w: 5 },
    "Iyashikei": { p: "Lighthearted", w: 5 }, "Cute Girls Doing Cute Things": { p: "Lighthearted", w: 5 }, "Surreal Comedy": { p: "Lighthearted", w: 5 },
    "Friendship": { p: "Interpersonal", w: 5 }, "Work": { p: "Interpersonal", w: 5 }, "School": { p: "Interpersonal", w: 5 }, "Club": { p: "Interpersonal", w: 5 }, "Parenting": { p: "Interpersonal", w: 5 }
  }
};

const TAG_RANK_FLOOR = 60;

/**
 * Calculates vibe scores for a media entry.
 * @param {Object} media - The media metadata (must contain genres and tags).
 * @returns {Object} { scores, sorted }
 */
export function getVibes(media) {
  const scores = { Speculative: 0, Visceral: 0, Cerebral: 0, Emotive: 0, Interpersonal: 0, Lighthearted: 0 };
  if (!media) return { scores, sorted: [] };

  if (media.genres) {
    media.genres.forEach(genre => {
      const map = SCHEMA.genres[genre];
      if (map) {
        scores[map.primary] += 3;
        if (map.secondary) scores[map.secondary] += 3;
      }
    });
  }

  if (media.tags) {
    media.tags.forEach(tag => {
      if (tag.rank < TAG_RANK_FLOOR) return;
      const config = SCHEMA.tags[tag.name];
      if (config) scores[config.p] += config.w;
    });
  }

  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([name, score]) => ({ name, score }));

  return { scores, sorted };
}

/**
 * Calculates normalized tonal affinity across a list of media entries.
 * Normalizes scores to 0-100 range based on weighted ratings.
 * @param {Array} list - User's media list entries
 * @param {Object} metadata - Metadata map for the media
 * @returns {Array} List of { name, value } objects for chart rendering
 */
export function getProfileAffinity(list, metadata) {
  const VIBE_CATEGORIES = ["Speculative", "Visceral", "Cerebral", "Emotive", "Interpersonal", "Lighthearted"];
  const categoryTotals = { Speculative: 0, Visceral: 0, Cerebral: 0, Emotive: 0, Interpersonal: 0, Lighthearted: 0 };
  let grandTotalPoints = 0;

  list.forEach(entry => {
    const meta = metadata[entry.media_id.toString()];
    if (!meta) return;

    const vibes = getVibes(meta);
    const scoreMultiplier = (entry.score || 3) / 10; // Influence of rating

    VIBE_CATEGORIES.forEach(cat => {
      const weightedScore = vibes.scores[cat] * scoreMultiplier;
      categoryTotals[cat] += weightedScore;
      grandTotalPoints += weightedScore;
    });
  });

  // 1. Get raw relative percentages
  const rawValues = VIBE_CATEGORIES.map(cat => ({
    name: cat,
    val: grandTotalPoints > 0 ? (categoryTotals[cat] / grandTotalPoints) * 100 : 0
  }));

  const vals = rawValues.map(x => x.val);
  const min = Math.min(...vals);
  const max = Math.max(...vals);

  // 2. Stretch them to a range of 40-100 to make the chart more dynamic
  // Formula: ((x - min) / (max - min)) * (targetMax - targetMin) + targetMin
  return rawValues.map(item => ({
    name: item.name,
    value: max === min ? 50 : Math.round(((item.val - min) / (max - min)) * 80 + 10)
  }));
}
