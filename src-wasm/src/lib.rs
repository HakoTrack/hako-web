use fuzzy_matcher::FuzzyMatcher;
use fuzzy_matcher::skim::SkimMatcherV2;
use serde::{Deserialize, Serialize};
use serde_wasm_bindgen::{Serializer, from_value};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize, Clone, Default, Debug)]
pub struct Title {
    #[serde(default)]
    pub romaji: Option<String>,
    pub english: Option<String>,
    pub native: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Default, Debug)]
pub struct FuzzyDate {
    pub year: Option<i32>,
    pub month: Option<i32>,
    pub day: Option<i32>,
}

#[derive(Serialize, Deserialize, Clone, Default, Debug)]
pub struct Media {
    #[serde(rename = "media_id", alias = "id", default)]
    pub media_id: i32,
    #[serde(default)]
    pub title: Title,
    pub format: Option<String>,
    #[serde(default)]
    pub genres: Vec<String>,
    pub episodes: Option<i32>,
    pub chapters: Option<i32>,
    pub volumes: Option<i32>,
    pub duration: Option<i32>,
    #[serde(rename = "startDate", alias = "start_date")]
    pub start_date: Option<FuzzyDate>,
    #[serde(rename = "seasonYear", alias = "season_year")]
    pub season_year: Option<i32>,
    #[serde(default)]
    pub tags: Vec<Tag>,
}

#[derive(Serialize, Deserialize, Clone, Default, Debug)]
pub struct Tag {
    pub name: String,
    pub rank: i32,
}

#[derive(Serialize, Deserialize, Clone, Default, Debug)]
pub struct ListEntry {
    #[serde(rename = "media_id", default)]
    pub media_id: i32,
    pub score: Option<f32>,
    pub progress: Option<i32>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(rename = "updatedAt", alias = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct ProcessedItem {
    #[serde(rename = "media_id")]
    pub media_id: i32,
    pub score: Option<f32>,
    pub progress: Option<i32>,
    pub status: String,
    #[serde(rename = "displayTitle")]
    pub display_title: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub meta: Media,
}

#[derive(Serialize, Deserialize)]
pub struct StatsResult {
    pub total: i32,
    #[serde(rename = "metricLabel")]
    pub metric_label: String,
    #[serde(rename = "metricValue")]
    pub metric_value: String,
    #[serde(rename = "medianScore")]
    pub median_score: String,
    #[serde(rename = "avgScore")]
    pub avg_score: String,
    #[serde(rename = "totalProgress")]
    pub total_progress: i32,
    #[serde(rename = "daysPlanned")]
    pub days_planned: String,
    #[serde(rename = "scoreDistribution")]
    pub score_distribution: Vec<i32>,
    #[serde(rename = "statusDistribution")]
    pub status_distribution: Vec<StatusDist>,
    #[serde(rename = "yearStats")]
    pub year_stats: HashMap<String, YearStat>,
    #[serde(rename = "genreStats")]
    pub genre_stats: HashMap<String, GenreStat>,
}

#[derive(Serialize, Deserialize)]
pub struct StatusDist {
    pub id: String,
    pub label: String,
    pub color: String,
    pub count: i32,
    pub percent: f32,
}

#[derive(Serialize, Deserialize)]
pub struct YearStat {
    pub count: i32,
    pub minutes: i32,
    pub scores: Vec<f32>,
}

#[derive(Serialize, Deserialize)]
pub struct GenreStat {
    pub completed: i32,
    #[serde(rename = "totalMinutes")]
    pub total_minutes: i32,
    pub scores: Vec<f32>,
    #[serde(rename = "topTitles")]
    pub top_titles: Vec<TopTitle>,
}

#[derive(Serialize, Deserialize)]
pub struct TopTitle {
    pub id: i32,
    pub score: f32,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "PascalCase")] // VibeScore categories are PascalCase
pub struct VibeScore {
    pub speculative: f32,
    pub visceral: f32,
    pub cerebral: f32,
    pub emotive: f32,
    pub interpersonal: f32,
    pub lighthearted: f32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct VibePillar {
    pub name: String,
    pub score: f32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct VibeResult {
    pub scores: VibeScore,
    pub sorted: Vec<VibePillar>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct VibeAffinity {
    pub name: String,
    pub value: i32,
}

#[derive(Deserialize, Debug)]
enum VibeCategory {
    Speculative,
    Visceral,
    Cerebral,
    Emotive,
    Interpersonal,
    Lighthearted,
}

#[derive(Deserialize, Debug)]
struct GenreVibeMap {
    primary: VibeCategory,
    secondary: Option<VibeCategory>,
}

#[derive(Deserialize, Debug)]
struct TagVibeMap {
    p: VibeCategory,
    w: i32,
}

#[derive(Deserialize, Debug)]
struct VibeSchema {
    genres: HashMap<String, GenreVibeMap>,
    tags: HashMap<String, TagVibeMap>,
}

lazy_static::lazy_static! {
    static ref SCHEMA: VibeSchema = {
        let json_str = r#"{
            "genres": {
                "Action": { "primary": "Visceral" },
                "Adventure": { "primary": "Speculative", "secondary": "Visceral" },
                "Comedy": { "primary": "Lighthearted" },
                "Drama": { "primary": "Emotive", "secondary": "Cerebral" },
                "Ecchi": { "primary": "Visceral", "secondary": "Lighthearted" },
                "Fantasy": { "primary": "Speculative" },
                "Hentai": { "primary": "Visceral", "secondary": "Interpersonal" },
                "Horror": { "primary": "Visceral", "secondary": "Cerebral" },
                "Mahou Shoujo": { "primary": "Speculative", "secondary": "Lighthearted" },
                "Mecha": { "primary": "Speculative", "secondary": "Visceral" },
                "Music": { "primary": "Visceral", "secondary": "Emotive" },
                "Mystery": { "primary": "Cerebral" },
                "Psychological": { "primary": "Cerebral", "secondary": "Emotive" },
                "Romance": { "primary": "Interpersonal", "secondary": "Emotive" },
                "Sci-Fi": { "primary": "Speculative", "secondary": "Cerebral" },
                "Slice of Life": { "primary": "Lighthearted", "secondary": "Interpersonal" },
                "Sports": { "primary": "Visceral", "secondary": "Interpersonal" },
                "Supernatural": { "primary": "Speculative", "secondary": "Cerebral" },
                "Thriller": { "primary": "Cerebral", "secondary": "Visceral" }
            },
            "tags": {
                "Afterlife": { "p": "Speculative", "w": 2 }, "Alternate Universe": { "p": "Speculative", "w": 2 }, "Cyberspace": { "p": "Speculative", "w": 2 },
                "Space": { "p": "Speculative", "w": 2 }, "Virtual World": { "p": "Speculative", "w": 2 }, "Post-Apocalyptic": { "p": "Speculative", "w": 2 }, "Underwater": { "p": "Speculative", "w": 2 },
                "Achronological Order": { "p": "Cerebral", "w": 2 }, "Time Loop": { "p": "Cerebral", "w": 2 }, "Anachronism": { "p": "Cerebral", "w": 2 },
                "War": { "p": "Visceral", "w": 1 }, "Historical": { "p": "Visceral", "w": 1 },
                "Anti-Hero": { "p": "Cerebral", "w": 1 }, "Detective": { "p": "Cerebral", "w": 1 }, "God-Complex": { "p": "Cerebral", "w": 1 },
                "Assassins": { "p": "Visceral", "w": 1 }, "Delinquents": { "p": "Visceral", "w": 1 }, "Merc mercenaries": { "p": "Visceral", "w": 1 }, "Zombie": { "p": "Visceral", "w": 1 },
                "Orphan": { "p": "Emotive", "w": 1 }, "Hikikomori": { "p": "Emotive", "w": 1 }, "Twins": { "p": "Emotive", "w": 1 },
                "Chibi": { "p": "Lighthearted", "w": 1 }, "Kemonomimi": { "p": "Lighthearted", "w": 1 }, "Ojou-sama": { "p": "Lighthearted", "w": 1 },
                "Maid": { "p": "Interpersonal", "w": 1 }, "Butler": { "p": "Interpersonal", "w": 1 }, "Teacher": { "p": "Interpersonal", "w": 1 },
                "Battle Royale": { "p": "Visceral", "w": 5 }, "Martial Arts": { "p": "Visceral", "w": 5 }, "Swordplay": { "p": "Visceral", "w": 5 }, "Gore": { "p": "Visceral", "w": 5 }, "Guns": { "p": "Visceral", "w": 5 }, "Tanks": { "p": "Visceral", "w": 5 }, "Archery": { "p": "Visceral", "w": 5 },
                "Tragedy": { "p": "Emotive", "w": 5 }, "Grief": { "p": "Emotive", "w": 5 }, "Bullying": { "p": "Emotive", "w": 5 }, "Suicide": { "p": "Emotive", "w": 5 }, "Melancholy": { "p": "Emotive", "w": 5 }, "Rejection": { "p": "Emotive", "w": 5 },
                "Conspiracy": { "p": "Cerebral", "w": 5 }, "Class Struggle": { "p": "Cerebral", "w": 5 }, "Memory Manipulation": { "p": "Cerebral", "w": 5 }, "Politics": { "p": "Cerebral", "w": 5 }, "Social Commentary": { "p": "Cerebral", "w": 5 },
                "Alchemy": { "p": "Speculative", "w": 5 }, "Magic": { "p": "Speculative", "w": 5 }, "Mythology": { "p": "Speculative", "w": 5 }, "Isekai": { "p": "Speculative", "w": 5 }, "Cultivation": { "p": "Speculative", "w": 5 }, "Urban Fantasy": { "p": "Speculative", "w": 5 }, "Youkai": { "p": "Speculative", "w": 5 },
                "High Stakes": { "p": "Visceral", "w": 5 }, "Gambling": { "p": "Visceral", "w": 5 }, "Death Game": { "p": "Visceral", "w": 5 }, "Survival": { "p": "Visceral", "w": 5 },
                "Teamwork": { "p": "Interpersonal", "w": 5 }, "Rivalry": { "p": "Interpersonal", "w": 5 }, "E-Sports": { "p": "Interpersonal", "w": 5 },
                "Philosophy": { "p": "Cerebral", "w": 5 }, "Satire": { "p": "Cerebral", "w": 5 }, "Denpa": { "p": "Cerebral", "w": 5 }, "Meta": { "p": "Cerebral", "w": 5 }, "Surreal": { "p": "Cerebral", "w": 5 },
                "Mental Illness": { "p": "Emotive", "w": 5 }, "Loneliness": { "p": "Emotive", "w": 5 }, "Family Life": { "p": "Emotive", "w": 5 }, "Existential": { "p": "Emotive", "w": 5 },
                "Slapstick": { "p": "Lighthearted", "w": 5 }, "Crossover": { "p": "Lighthearted", "w": 5 }, "Holidays": { "p": "Lighthearted", "w": 5 }, "Parody": { "p": "Lighthearted", "w": 5 },
                "Cohabitation": { "p": "Interpersonal", "w": 5 }, "Marriage": { "p": "Interpersonal", "w": 5 }, "Fake Relationship": { "p": "Interpersonal", "w": 5 }, "Yuri": { "p": "Interpersonal", "w": 5 }, "Yaoi": { "p": "Interpersonal", "w": 5 }, "Childhood Friends": { "p": "Interpersonal", "w": 5 },
                "Heartbreak": { "p": "Emotive", "w": 5 }, "Unrequited Love": { "p": "Emotive", "w": 5 }, "Love Triangle": { "p": "Emotive", "w": 5 },
                "Cyberpunk": { "p": "Speculative", "w": 5 }, "Space Opera": { "p": "Speculative", "w": 5 }, "Time Travel": { "p": "Speculative", "w": 5 }, "Dystopian": { "p": "Speculative", "w": 5 }, "Steampunk": { "p": "Speculative", "w": 5 }, "Aliens": { "p": "Speculative", "w": 5 },
                "Artificial Intelligence": { "p": "Cerebral", "w": 5 }, "Transhumanism": { "p": "Cerebral", "w": 5 },
                "Iyashikei": { "p": "Lighthearted", "w": 5 }, "Cute Girls Doing Cute Things": { "p": "Lighthearted", "w": 5 }, "Surreal Comedy": { "p": "Lighthearted", "w": 5 },
                "Friendship": { "p": "Interpersonal", "w": 5 }, "Work": { "p": "Interpersonal", "w": 5 }, "School": { "p": "Interpersonal", "w": 5 }, "Club": { "p": "Interpersonal", "w": 5 }, "Parenting": { "p": "Interpersonal", "w": 5 }
            }
        }"#;
        serde_json::from_str(json_str).expect("Failed to parse Vibe SCHEMA")
    };
}

const TAG_RANK_FLOOR: i32 = 60;

fn get_vibes(media: &Media) -> VibeResult {
    let mut scores = VibeScore::default();

    for genre in &media.genres {
        if let Some(map) = SCHEMA.genres.get(genre) {
            match map.primary {
                VibeCategory::Speculative => scores.speculative += 3.0,
                VibeCategory::Visceral => scores.visceral += 3.0,
                VibeCategory::Cerebral => scores.cerebral += 3.0,
                VibeCategory::Emotive => scores.emotive += 3.0,
                VibeCategory::Interpersonal => scores.interpersonal += 3.0,
                VibeCategory::Lighthearted => scores.lighthearted += 3.0,
            }
            if let Some(secondary) = &map.secondary {
                match secondary {
                    VibeCategory::Speculative => scores.speculative += 3.0,
                    VibeCategory::Visceral => scores.visceral += 3.0,
                    VibeCategory::Cerebral => scores.cerebral += 3.0,
                    VibeCategory::Emotive => scores.emotive += 3.0,
                    VibeCategory::Interpersonal => scores.interpersonal += 3.0,
                    VibeCategory::Lighthearted => scores.lighthearted += 3.0,
                }
            }
        }
    }

    for tag in &media.tags {
        if tag.rank < TAG_RANK_FLOOR {
            continue;
        }
        if let Some(config) = SCHEMA.tags.get(&tag.name) {
            match config.p {
                VibeCategory::Speculative => scores.speculative += config.w as f32,
                VibeCategory::Visceral => scores.visceral += config.w as f32,
                VibeCategory::Cerebral => scores.cerebral += config.w as f32,
                VibeCategory::Emotive => scores.emotive += config.w as f32,
                VibeCategory::Interpersonal => scores.interpersonal += config.w as f32,
                VibeCategory::Lighthearted => scores.lighthearted += config.w as f32,
            }
        }
    }

    let mut sorted_pillars = Vec::new();
    sorted_pillars.push(VibePillar {
        name: "Speculative".to_string(),
        score: scores.speculative,
    });
    sorted_pillars.push(VibePillar {
        name: "Visceral".to_string(),
        score: scores.visceral,
    });
    sorted_pillars.push(VibePillar {
        name: "Cerebral".to_string(),
        score: scores.cerebral,
    });
    sorted_pillars.push(VibePillar {
        name: "Emotive".to_string(),
        score: scores.emotive,
    });
    sorted_pillars.push(VibePillar {
        name: "Interpersonal".to_string(),
        score: scores.interpersonal,
    });
    sorted_pillars.push(VibePillar {
        name: "Lighthearted".to_string(),
        score: scores.lighthearted,
    });

    sorted_pillars.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    VibeResult {
        scores,
        sorted: sorted_pillars,
    }
}

struct ParsedQuery {
    genre: Option<String>,
    min_score: Option<f32>,
    free_query: String,
}

fn parse_query(query: &str) -> ParsedQuery {
    let parts = query.split_whitespace();
    let mut genre = None;
    let mut min_score = None;
    let mut free_query_parts = Vec::new();

    for part in parts {
        if part.contains(':') {
            let mut kv = part.splitn(2, ':');
            let key = kv.next().unwrap_or("").to_lowercase();
            let value = kv.next().unwrap_or("").to_lowercase();

            match key.as_str() {
                "genre" => genre = Some(value),
                "score" => min_score = value.parse::<f32>().ok(),
                _ => free_query_parts.push(part),
            }
        } else {
            free_query_parts.push(part);
        }
    }

    ParsedQuery {
        genre,
        min_score,
        free_query: free_query_parts.join(" "),
    }
}

#[wasm_bindgen]
pub fn get_vibes_wasm(media: JsValue) -> Result<JsValue, JsValue> {
    let media: Media = from_value(media)?;
    let result = get_vibes(&media);
    let serializer = Serializer::new().serialize_maps_as_objects(true);
    result
        .serialize(&serializer)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn get_profile_affinity_wasm(list: JsValue, metadata: JsValue) -> Result<JsValue, JsValue> {
    let items: Vec<ListEntry> = from_value(list)?;
    let metadata_map: HashMap<String, Media> = from_value(metadata)?;

    // We can reuse the logic, but the current `get_profile_affinity` is on `ListEngine`.
    // It's probably better to add a standalone function to Rust or just refactor.
    // Let's create a standalone one for now.

    // Actually, look at get_profile_affinity in lib.rs
    // Wait, the one in lib.rs is inside `impl ListEngine`.
    // I need a standalone function.

    // Let's refactor the logic in ListEngine to call a helper.
    // Or just copy the logic for now, it's safer.

    let VIBE_CATEGORIES = [
        VibeCategory::Speculative,
        VibeCategory::Visceral,
        VibeCategory::Cerebral,
        VibeCategory::Emotive,
        VibeCategory::Interpersonal,
        VibeCategory::Lighthearted,
    ];
    let mut category_totals: VibeScore = VibeScore::default();
    let mut grand_total_points = 0.0;

    for entry in &items {
        if let Some(meta) = metadata_map.get(&entry.media_id.to_string()) {
            let vibes = get_vibes(meta);
            let score_multiplier = entry.score.unwrap_or(3.0) / 10.0;

            category_totals.speculative += vibes.scores.speculative * score_multiplier;
            category_totals.visceral += vibes.scores.visceral * score_multiplier;
            category_totals.cerebral += vibes.scores.cerebral * score_multiplier;
            category_totals.emotive += vibes.scores.emotive * score_multiplier;
            category_totals.interpersonal += vibes.scores.interpersonal * score_multiplier;
            category_totals.lighthearted += vibes.scores.lighthearted * score_multiplier;

            grand_total_points += (vibes.scores.speculative
                + vibes.scores.visceral
                + vibes.scores.cerebral
                + vibes.scores.emotive
                + vibes.scores.interpersonal
                + vibes.scores.lighthearted)
                * score_multiplier;
        }
    }

    let mut raw_values = Vec::new();
    for cat in VIBE_CATEGORIES.iter() {
        let name = format!("{:?}", cat);
        let val = if grand_total_points > 0.0 {
            (match cat {
                VibeCategory::Speculative => category_totals.speculative,
                VibeCategory::Visceral => category_totals.visceral,
                VibeCategory::Cerebral => category_totals.cerebral,
                VibeCategory::Emotive => category_totals.emotive,
                VibeCategory::Interpersonal => category_totals.interpersonal,
                VibeCategory::Lighthearted => category_totals.lighthearted,
            } / grand_total_points)
                * 100.0
        } else {
            0.0
        };
        raw_values.push((name, val));
    }

    let vals: Vec<f32> = raw_values.iter().map(|(_, v)| *v).collect();
    let min = vals.iter().cloned().fold(f32::INFINITY, f32::min);
    let max = vals.iter().cloned().fold(f32::NEG_INFINITY, f32::max);

    let final_affinity: Vec<VibeAffinity> = raw_values
        .into_iter()
        .map(|(name, val)| {
            let value = if max == min {
                50
            } else {
                ((val - min) / (max - min) * 80.0 + 10.0).round() as i32
            };
            VibeAffinity { name, value }
        })
        .collect();

    let serializer = Serializer::new().serialize_maps_as_objects(true);
    final_affinity
        .serialize(&serializer)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub struct ListEngine {
    items: Vec<ListEntry>,
    metadata: HashMap<i32, Media>,
    matcher: SkimMatcherV2,
}

#[wasm_bindgen]
impl ListEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(items: JsValue, metadata: JsValue) -> Result<ListEngine, JsValue> {
        let items: Vec<ListEntry> = from_value(items)?;
        let metadata_map: HashMap<String, Media> = from_value(metadata)?;

        let mut processed_metadata = HashMap::new();
        for (id_str, m) in metadata_map {
            if let Ok(id) = id_str.parse::<i32>() {
                processed_metadata.insert(id, m);
            }
        }

        Ok(ListEngine {
            items,
            metadata: processed_metadata,
            matcher: SkimMatcherV2::default(),
        })
    }

    pub fn filter_and_sort(
        &self,
        query: &str,
        sort_by: &str,
        filter_status: &str,
        title_preference: &str,
    ) -> Result<JsValue, JsValue> {
        let parsed = parse_query(query);

        let mut results: Vec<(i64, ProcessedItem)> = self
            .items
            .iter()
            .filter(|item| {
                if filter_status == "all" {
                    return true;
                }
                let status = item.status.as_deref().unwrap_or("").to_lowercase();
                status == filter_status.to_lowercase()
            })
            .filter_map(|item| {
                let meta = self.metadata.get(&item.media_id)?;

                // 1. Operator Filtering (Genre)
                if let Some(ref target_genre) = parsed.genre {
                    let matches = meta
                        .genres
                        .iter()
                        .any(|g| g.to_lowercase().contains(target_genre));
                    if !matches {
                        return None;
                    }
                }

                // 2. Operator Filtering (Score)
                if let Some(min_s) = parsed.min_score {
                    if item.score.unwrap_or(0.0) < min_s {
                        return None;
                    }
                }

                let display_title = get_display_title(&meta.title, title_preference);
                let mut fuzzy_score = 0i64;

                // 3. Fuzzy Matching
                if !parsed.free_query.is_empty() {
                    let romaji = meta.title.romaji.as_deref().unwrap_or("");
                    let romaji_score = self
                        .matcher
                        .fuzzy_match(romaji, &parsed.free_query)
                        .unwrap_or(0);
                    let english_score = meta
                        .title
                        .english
                        .as_ref()
                        .and_then(|t| self.matcher.fuzzy_match(t, &parsed.free_query))
                        .unwrap_or(0);
                    let native_score = meta
                        .title
                        .native
                        .as_ref()
                        .and_then(|t| self.matcher.fuzzy_match(t, &parsed.free_query))
                        .unwrap_or(0);

                    fuzzy_score = romaji_score.max(english_score).max(native_score);
                    if fuzzy_score == 0 {
                        return None;
                    }
                }

                Some((
                    fuzzy_score,
                    ProcessedItem {
                        media_id: item.media_id,
                        score: item.score,
                        progress: item.progress,
                        status: item.status.clone().unwrap_or_else(|| String::from("")),
                        display_title,
                        updated_at: item.updated_at.clone().unwrap_or_else(|| String::from("")),
                        meta: meta.clone(),
                    },
                ))
            })
            .collect();

        // Sort
        results.sort_by(|a, b| {
            if !parsed.free_query.is_empty() && a.0 != b.0 {
                return b.0.cmp(&a.0);
            }

            match sort_by {
                "Title" => {
                    a.1.display_title
                        .to_lowercase()
                        .cmp(&b.1.display_title.to_lowercase())
                }
                "Score" => {
                    let s_a = a.1.score.unwrap_or(-1.0);
                    let s_b = b.1.score.unwrap_or(-1.0);
                    s_b.partial_cmp(&s_a).unwrap_or(std::cmp::Ordering::Equal)
                }
                "Progress" => {
                    let p_a = a.1.progress.unwrap_or(-1);
                    let p_b = b.1.progress.unwrap_or(-1);
                    p_b.cmp(&p_a)
                }
                "Last Updated" | _ => b.1.updated_at.cmp(&a.1.updated_at),
            }
        });

        let final_items: Vec<ProcessedItem> = results.into_iter().map(|r| r.1).collect();
        let serializer = Serializer::new().serialize_maps_as_objects(true);
        final_items
            .serialize(&serializer)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn calculate_stats(
        &self,
        media_type: &str,
        status_groups: JsValue,
    ) -> Result<JsValue, JsValue> {
        let status_groups_info: Vec<StatusGroupInput> = from_value(status_groups)?;

        let mut total_minutes = 0;
        let mut total_minutes_planned = 0;
        let mut total_progress = 0;
        let mut total_score = 0.0;
        let mut scores_count = 0;
        let mut scores = Vec::new();
        let mut score_distribution = vec![0; 11];
        let mut year_stats: HashMap<String, YearStat> = HashMap::new();
        let mut genre_stats: HashMap<String, GenreStat> = HashMap::new();
        let mut counts: HashMap<String, i32> = HashMap::new();

        for entry in &self.items {
            let status = entry.status.as_deref().unwrap_or("").to_lowercase();
            *counts.entry(status.clone()).or_insert(0) += 1;

            if let Some(meta) = self.metadata.get(&entry.media_id) {
                let year = meta
                    .start_date
                    .as_ref()
                    .and_then(|d| d.year)
                    .unwrap_or_else(|| meta.season_year.unwrap_or(0));
                let duration = meta.duration.unwrap_or(0);
                let progress = entry.progress.unwrap_or(0);
                let episodes = meta.episodes.unwrap_or(0);
                let genres = &meta.genres;

                if year > 0 {
                    let ys_entry = year_stats.entry(year.to_string()).or_insert(YearStat {
                        count: 0,
                        minutes: 0,
                        scores: Vec::new(),
                    });
                    ys_entry.count += 1;
                }

                // Genre Stats
                for genre in genres {
                    let stat = genre_stats.entry(genre.clone()).or_insert(GenreStat {
                        completed: 0,
                        total_minutes: 0,
                        scores: Vec::new(),
                        top_titles: Vec::new(),
                    });
                    if status == "completed" {
                        stat.completed += 1;
                    }
                    if let Some(score) = entry.score {
                        if score > 0.0 {
                            stat.scores.push(score);
                            stat.top_titles.push(TopTitle {
                                id: entry.media_id,
                                score,
                            });
                        }
                    }
                    if duration > 0 && progress > 0 {
                        stat.total_minutes += progress * duration;
                    }
                }

                total_progress += progress;

                if media_type == "anime" {
                    if status == "planning" && episodes > 0 && duration > 0 {
                        total_minutes_planned += episodes * duration;
                    }
                    if duration > 0 && progress > 0 {
                        total_minutes += progress * duration;
                        if year > 0 {
                            if let Some(ys) = year_stats.get_mut(&year.to_string()) {
                                ys.minutes += progress * duration;
                            }
                        }
                    }
                }

                if let Some(score) = entry.score {
                    if score > 0.0 {
                        total_score += score;
                        scores_count += 1;
                        scores.push(score);
                        if year > 0 {
                            if let Some(ys) = year_stats.get_mut(&year.to_string()) {
                                ys.scores.push(score);
                            }
                        }
                        let bin = (score.floor() as usize).min(10);
                        score_distribution[bin] += 1;
                    }
                }
            }
        }

        // Finalize genre stats
        for stat in genre_stats.values_mut() {
            stat.top_titles.sort_by(|a, b| {
                b.score
                    .partial_cmp(&a.score)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
            if stat.top_titles.len() > 4 {
                stat.top_titles.truncate(4);
            }
        }

        let metric = match media_type {
            "anime" => (
                String::from("Days Watched"),
                format!("{:.1}", total_minutes as f32 / 1440.0),
            ),
            "manga" => (String::from("Chapters Read"), total_progress.to_string()),
            "light_novel" => (String::from("Volumes Read"), total_progress.to_string()),
            _ => (String::from("Progress"), String::from("0")),
        };

        let status_distribution: Vec<StatusDist> = status_groups_info
            .into_iter()
            .map(|group| {
                let count = *counts.get(&group.id).unwrap_or(&0);
                let percent = if self.items.is_empty() {
                    0.0
                } else {
                    (count as f32 / self.items.len() as f32) * 100.0
                };
                StatusDist {
                    id: group.id,
                    label: group.label,
                    color: group.color,
                    count,
                    percent,
                }
            })
            .collect();

        let avg_score = if scores_count > 0 {
            format!("{:.1}", total_score / scores_count as f32)
        } else {
            String::from("0.0")
        };
        let median_score = get_median(&mut scores);

        let result = StatsResult {
            total: self.items.len() as i32,
            metric_label: metric.0,
            metric_value: metric.1,
            median_score,
            avg_score,
            total_progress,
            days_planned: format!("{:.1}", total_minutes_planned as f32 / 1440.0),
            score_distribution,
            status_distribution,
            year_stats,
            genre_stats,
        };

        let serializer = Serializer::new().serialize_maps_as_objects(true);
        result
            .serialize(&serializer)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn get_profile_affinity(&self) -> Result<JsValue, JsValue> {
        let vibe_categories = [
            VibeCategory::Speculative,
            VibeCategory::Visceral,
            VibeCategory::Cerebral,
            VibeCategory::Emotive,
            VibeCategory::Interpersonal,
            VibeCategory::Lighthearted,
        ];
        let mut category_totals: VibeScore = VibeScore::default();
        let mut grand_total_points = 0.0;

        for entry in &self.items {
            if let Some(meta) = self.metadata.get(&entry.media_id) {
                let vibes = get_vibes(meta);
                let score_multiplier = entry.score.unwrap_or(3.0) / 10.0;

                category_totals.speculative += vibes.scores.speculative * score_multiplier;
                category_totals.visceral += vibes.scores.visceral * score_multiplier;
                category_totals.cerebral += vibes.scores.cerebral * score_multiplier;
                category_totals.emotive += vibes.scores.emotive * score_multiplier;
                category_totals.interpersonal += vibes.scores.interpersonal * score_multiplier;
                category_totals.lighthearted += vibes.scores.lighthearted * score_multiplier;

                grand_total_points += (vibes.scores.speculative
                    + vibes.scores.visceral
                    + vibes.scores.cerebral
                    + vibes.scores.emotive
                    + vibes.scores.interpersonal
                    + vibes.scores.lighthearted)
                    * score_multiplier;
            }
        }

        let mut raw_values = Vec::new();
        for cat in vibe_categories.iter() {
            let name = format!("{:?}", cat);
            let val = if grand_total_points > 0.0 {
                (match cat {
                    VibeCategory::Speculative => category_totals.speculative,
                    VibeCategory::Visceral => category_totals.visceral,
                    VibeCategory::Cerebral => category_totals.cerebral,
                    VibeCategory::Emotive => category_totals.emotive,
                    VibeCategory::Interpersonal => category_totals.interpersonal,
                    VibeCategory::Lighthearted => category_totals.lighthearted,
                } / grand_total_points)
                    * 100.0
            } else {
                0.0
            };
            raw_values.push((name, val));
        }

        let vals: Vec<f32> = raw_values.iter().map(|(_, v)| *v).collect();
        let min = vals.iter().cloned().fold(f32::INFINITY, f32::min);
        let max = vals.iter().cloned().fold(f32::NEG_INFINITY, f32::max);

        let final_affinity: Vec<VibeAffinity> = raw_values
            .into_iter()
            .map(|(name, val)| {
                let value = if max == min {
                    50
                } else {
                    ((val - min) / (max - min) * 80.0 + 10.0).round() as i32
                };
                VibeAffinity { name, value }
            })
            .collect();

        let serializer = Serializer::new().serialize_maps_as_objects(true);
        final_affinity
            .serialize(&serializer)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StatusGroupInput {
    id: String,
    label: String,
    color: String,
}

fn get_display_title(title: &Title, preference: &str) -> String {
    let romaji = title.romaji.as_deref().unwrap_or("");
    match preference {
        "english" => title.english.clone().unwrap_or_else(|| romaji.to_string()),
        "native" => title.native.clone().unwrap_or_else(|| romaji.to_string()),
        _ => romaji.to_string(),
    }
}

fn get_median(scores: &mut [f32]) -> String {
    if scores.is_empty() {
        return String::from("0.0");
    }
    scores.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let mid = scores.len() / 2;
    if scores.len() % 2 == 0 {
        format!("{:.1}", (scores[mid - 1] + scores[mid]) / 2.0)
    } else {
        format!("{:.1}", scores[mid])
    }
}
