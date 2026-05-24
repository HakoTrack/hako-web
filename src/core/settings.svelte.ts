import { SvelteSet } from 'svelte/reactivity';

export type SettingKey = 'titlePreference' | 'profileVisibility';

export interface SettingOption {
  value: string;
  label: string;
}

export interface SettingDefinition {
  label: string;
  options: SettingOption[];
  default: string;
}

export const SETTINGS_CONFIG: Record<SettingKey, SettingDefinition> = {
  titlePreference: {
    label: "Media Title Preference",
    options: [
      { value: "romaji", label: "Romaji" },
      { value: "native", label: "Native" },
      { value: "english", label: "English" },
    ],
    default: "romaji",
  },
  profileVisibility: {
    label: "Profile Visibility",
    options: [
      { value: "public", label: "Public" },
      { value: "followers", label: "Followers Only" },
      { value: "private", label: "Private" },
    ],
    default: "public",
  },
};

// State initialization
const initialSettings: Record<string, string> = {};
for (const key in SETTINGS_CONFIG) {
  const typedKey = key as SettingKey;
  initialSettings[typedKey] =
    (typeof localStorage !== 'undefined' ? localStorage.getItem(typedKey) : null) ||
    SETTINGS_CONFIG[typedKey].default;
}

export const settings = $state(initialSettings);

// Persist to localStorage
$effect.root(() => {
  $effect(() => {
    for (const key in settings) {
      localStorage.setItem(key, settings[key]);
    }
  });
});

/**
 * Resolves the display title based on the user's preference.
 */
export function getDisplayTitle(titleObj: any, preference: string): string {
  if (!titleObj) return "";
  // Look up the property dynamically based on the preference key (e.g., 'romaji', 'native')
  return titleObj[preference] || titleObj.romaji || "";
}
