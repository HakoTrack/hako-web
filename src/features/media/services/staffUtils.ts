export function isLowLevelRole(role: string): boolean {
  const r = role.toLowerCase();
  if (r.includes("animation") && !r.includes("main animator") && !r.includes("lead animator")) return true;
  if (r.startsWith("adr") || r.includes(" adr ")) return true;
  if (r.includes("english")) return true;
  if (r.includes("lyrics") || r.includes("song") || r.includes("insert")) return true;
  if (r.includes("illustration")) return true;
  if (r === "graphic design") return true;
  if (r.includes("in-between") || r.includes("inbetween")) return true;
  if (r.includes("theme song")) return true;
  return false;
}

export function roleTier(role: string): number {
  const r = role.toLowerCase();
  if (r === "story & art" || r === "story and art" || r === "original creator" || r === "creator") return 1;

  if (r === "director" || r === "chief director" || r === "series director" || r === "executive producer") return 2;

  if (r.includes("assistant director") || r.includes("assistant producer") || r.includes("art director") || r.includes("animation producer") || r.includes("character design") || r.includes("series composition") || r.includes("series composer") || r.includes("series script") || r.includes("series writer")) return 3;

  if (r.includes("episode director") || r.includes("unit director") || r.includes("co-director")) return 4;

  if (r.includes("sound director") || r.includes("sound production") || r.includes("sound effects")) return 5;

  if (r.includes("storyboard") || r.includes("screenplay") || r.includes("script") || r.includes("composition")) return 6;

  if (r.includes("animation director") || r.includes("key animation")) return 7;

  if (r.includes("producer") || r.includes("creator")) return 3;
  if (r.includes("director")) return 7;

  return 8;
}

export function rolePriority(role: string): number {
  const r = role.toLowerCase();
  if (r.includes("assistant director")) return 1;
  if (r.includes("assistant producer")) return 2;
  if (r.includes("art director")) return 3;
  if (r.includes("animation producer")) return 4;
  if (r.includes("character design")) return 5;
  if (r.includes("series composition") || r.includes("series composer")) return 6;
  if (r.includes("series script") || r.includes("series writer")) return 7;
  if (r.includes("episode director")) return 1;
  if (r.includes("unit director")) return 2;
  if (r.includes("co-director")) return 3;
  if (r.includes("sound director")) return 1;
  if (r.includes("sound production")) return 2;
  if (r.includes("sound effects")) return 3;
  if (r.includes("storyboard")) return 1;
  if (r.includes("screenplay") || r.includes("script")) return 2;
  if (r.includes("composition")) return 3;
  if (r.includes("animation director")) return 1;
  if (r.includes("key animation")) return 2;
  return 99;
}

export interface StaffGroup {
  id: number;
  name: string;
  image: string;
  roles: { role: string; tier: number; priority: number }[];
}

export function groupStaff(staff: { id: number; name: string; image: string; role: string }[]): StaffGroup[] {
  const groups = new Map<number, StaffGroup>();
  for (const person of staff) {
    let g = groups.get(person.id);
    if (!g) {
      g = { id: person.id, name: person.name, image: person.image, roles: [] };
      groups.set(person.id, g);
    }
    g.roles.push({ role: person.role, tier: roleTier(person.role), priority: rolePriority(person.role) });
  }
  return [...groups.values()].map((g) => {
    g.roles.sort((a, b) => a.tier - b.tier || a.priority - b.priority);
    return g;
  });
}

export function filterTopStaff(groups: StaffGroup[], limit = 12): StaffGroup[] {
  return groups
    .filter((g) => !isLowLevelRole(g.roles[0].role))
    .sort((a, b) => {
      const aBest = a.roles[0];
      const bBest = b.roles[0];
      const t = aBest.tier - bBest.tier;
      if (t !== 0) return t;
      const p = aBest.priority - bBest.priority;
      if (p !== 0) return p;
      return a.id - b.id;
    })
    .slice(0, limit);
}

export function sortStaffGroups(groups: StaffGroup[]): StaffGroup[] {
  return [...groups].sort((a, b) => {
    const aBest = a.roles[0];
    const bBest = b.roles[0];
    const t = aBest.tier - bBest.tier;
    if (t !== 0) return t;
    const p = aBest.priority - bBest.priority;
    if (p !== 0) return p;
    return a.id - b.id;
  });
}
