# Ocean Fishing

A reference and planner for FFXIV's Ocean Fishing: both voyage schedules, all 662 fish with bite times,
rewards, and a live countdown — as one static site with no build step.

**Live:** https://fishing.kosmos14.date/

## The site

Open `website/index.html` — it runs straight from disk, no server needed. `assets/data.js` holds every
dataset the pages render; `.github/workflows/pages.yml` publishes `website/` on each push to `main`.

| Page | What's on it |
|---|---|
| `index.html` | Mechanics, buffs and log messages, points and content bonuses, every Indigo Intuition chain |
| `schedules.html` | Both 144-voyage patterns with the current position marked, plus every route's stops and times |
| `fish.html` | All 662 fish rows (Indigo 220 + Ruby 442): bite times, availability, DH/TH, mooch and intuition notes; search, family tabs, time filters |
| `rewards.html` | All 54 content bonuses and 40 achievements |
| `planner.html` | The next voyage for both families and what to catch at each stop |
| `notes.html` | Method, the bite-time definition, and the traps |

## Schedules

Voyages depart every 2 hours on odd JST hours (= even UTC hours), and both families are deterministic
from a Unix timestamp:

```
vn = unix_ms // 7_200_000
Indigo = INDIGO[(88 + vn) % 144]     # 4 destinations × 3 times of day
Ruby   = RUBY[vn % 144]              # 9 routes
```

Each cycle is 144 voyages (12 days). The patterns live in `route-pattern.json` and `ruby-schedule.json`;
`scripts/route.py` prints upcoming voyages and agrees with the live tracker.

## Files

| Path | What |
|---|---|
| `website/` | The site (`assets/{data.js,site.js,ocean.js,theme.css}` — Ocean Blue & Sunshine theme) |
| `scripts/gen_website.py` | Regenerates all six pages from `assets/data.js` |
| `scripts/route.py` | Standalone Indigo + Ruby schedule calculator |
| `scripts/cdp_eval.js`, `scripts/cdp_shot.js` | Evaluate JS in / screenshot a page via headless Chrome over CDP |
| `route-pattern.json`, `ruby-schedule.json` | The two patterns, machine-readable |
| `ruby-row-times.json` | The tracker pulls the Ruby pattern was derived from |
| `spreadsheet-routes.json`, `spreadsheet-fish.csv` | The community spreadsheet, parsed |
| `bite-times.json`, `bite-times.csv` | Per fish × bait bite ranges (860 legacy rows) |
| `intuition-fish.json`, `ocean-fishing-normalized.json` | Legacy Intuition chains, and baits/spots/bonuses (EN/JA) |
| `data/` | The 2023 upstream snapshot the Indigo data descends from |
| `site-data/OceanFishingData.json` | The pre-7.5 tracker snapshot the Indigo fish data came from |

After a data change: `python scripts/gen_website.py`.

## Sources

Unofficial fan reference. **FINAL FANTASY XIV** and all game content — fish and item names, descriptions,
achievements, route and objective names — are © Square Enix. Nothing here was mined from the game client:
it is all compiled from community work.

| Source | What came from it |
|---|---|
| **Ocean Fishing Spreadsheet**, by Tyo'to Tayuun ([sheet](https://docs.google.com/spreadsheets/d/1R0Nt8Ye7EAQtU8CXF1XRRj67iaFpUk1BXeDgt6abxsQ/edit?gid=1246028214)) | The richest source: 9 Ruby route blocks with per-bait bite times, points, DH/TH yields, tug, hookset, availability and notes (achievements, Intuition chains, mooch routes). The Ruby stops and availability data come from here. |
| **[ffxiv.oceanfishing.boats](https://ffxiv.oceanfishing.boats)** | The post-7.5 authority. Its schedule calculator supplied the occurrences the 144-voyage Ruby pattern was derived from, and its data confirmed the Patch 7.5 **Thavnairian coast** route. |
| **[ffxiv.pf-n.co](https://ffxiv.pf-n.co)** | The legacy pre-7.5 tracker: the Indigo fish data and the Indigo destination/time algorithm. |
| **[Teamcraft](https://ffxivteamcraft.com/)** | The bite-time samples. A range is the whiskers of a boxplot — quartiles by R's type-7 algorithm, discarding samples more than 1.5 × IQR from the median. |
| **[pillowfication/ffxiv](https://github.com/pillowfication/ffxiv/tree/master/src/ocean-fishing/ffxiv-ocean-fishing)** | The open-source project both trackers are built from: the Indigo `PATTERN`, its offset and the voyage algorithm. |
| **[ffxiv-fieldcraft.com](https://ffxiv-fieldcraft.com)** | Confirmed the three Ruby voyage paths (One River, Ruby Price, Thavnairian coast) and post-7.5 content. |
| **The Fisherman's Horizon Discord** ([invite](https://discord.gg/AnFaDpN)) | The community behind the spreadsheet and both trackers, and where data errors go. |

## Traps

- **Timezones.** Compute voyages from UTC milliseconds; never hard-code a local time.
- **Pre-7.5 data is incomplete.** The legacy tracker predates Patch 7.5 (2026-04-28), which added the
  Thavnairian coast route: it knows 23 spots and no Unnamed Island / Thavnair fish, and models only 6
  Ruby routes. Ruby is **9**.
