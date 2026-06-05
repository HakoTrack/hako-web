use fuzzy_matcher::FuzzyMatcher;
use fuzzy_matcher::skim::SkimMatcherV2;
use serde::{Deserialize, Serialize};
use serde_wasm_bindgen::{Serializer, from_value};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use web_sys::console;

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
}

#[derive(Serialize, Deserialize, Clone, Default, Debug)]
pub struct ListEntry {
    #[serde(alias = "media_id", default)]
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

        console::log_1(
            &format!(
                "WASM: ListEngine initialized with {} items and {} metadata entries",
                items.len(),
                processed_metadata.len()
            )
            .into(),
        );

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
                let display_title = get_display_title(&meta.title, title_preference);

                let mut fuzzy_score = 0i64;
                if !query.is_empty() {
                    let romaji = meta.title.romaji.as_deref().unwrap_or("");
                    let romaji_score = self.matcher.fuzzy_match(romaji, query).unwrap_or(0);
                    let english_score = meta
                        .title
                        .english
                        .as_ref()
                        .and_then(|t| self.matcher.fuzzy_match(t, query))
                        .unwrap_or(0);
                    let native_score = meta
                        .title
                        .native
                        .as_ref()
                        .and_then(|t| self.matcher.fuzzy_match(t, query))
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
            if !query.is_empty() && a.0 != b.0 {
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

        let mut matched_metadata_count = 0;

        for entry in &self.items {
            let status = entry.status.as_deref().unwrap_or("").to_lowercase();
            *counts.entry(status.clone()).or_insert(0) += 1;

            if let Some(meta) = self.metadata.get(&entry.media_id) {
                matched_metadata_count += 1;
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

        console::log_1(
            &format!(
                "WASM: calculate_stats for {}: matched {}/{} entries to metadata. Found {} genres.",
                media_type,
                matched_metadata_count,
                self.items.len(),
                genre_stats.len()
            )
            .into(),
        );

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
}

#[derive(Deserialize)]
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
