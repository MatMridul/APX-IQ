# APX IQ — Platform Audit: Pit-Wall Benchmark & Market Comparison

> The most important audit. Benchmark: what Team Principals, Race
> Engineers and Strategy Heads actually see (Red Bull pit wall breakdown,
> Mission Control reporting, RaceWatch capability set). Market: Garage 61,
> VRS, Track Titan, MoTeC/Pi Toolbox, RaceLab/SimHub, Crew Chief, TrackPro.
> Core principle enforced throughout: **only real data gets a window.**
> Date: 2026-08-25.

---

## 1. The finding that reframes everything

**The game already streams most of the "missing" pit-wall data — we just
don't decode it.** F1 UDP packets we parse today carry more than we
display, and whole packet types we ignore contain real pit-wall content:

| Data | UDP source | Status | Pit-wall use |
|---|---|---|---|
| Tyre pressures (4 corners) | Car telemetry (pkt 6) | **decoded, discarded** | Tyre panel — real values replace demo |
| Brake bias (front/rear brake values) | Car status (pkt 7) | **decoded, discarded** | Bias instrument — real values |
| Driver names + teams (20 cars) | Participants (pkt 4) | **not decoded** | Battle panel — real rivals, team colors |
| Flags (yellow/chequered/race control) | Event (pkt 3) | **not decoded** | Flag status — real, replaces SIM |
| Air/track temp + rain% forecast ×5 | Session (pkt 1) | **decoded, discarded** | Weather panel — real, kills the NO SIGNAL |
| Session type + time remaining | Session (pkt 1) | decoded, discarded | Session clock — real countdown |
| Best sector times, all drivers | Lap data (pkt 2) | partially | Ideal-lap calculator, sector rankings |
| Pit status / driver status per car | Lap data (pkt 2) | not extracted | Pit tracking, "in garage" states |
| Penalties, speed trap, stints | Event (pkt 3) | not decoded | Race-control feed, stint history |
| Player car setup (wing, pressures, diff) | Car setup (pkt 5) | not decoded | Setup page — what the driver actually ran |
| Final classification | Final classification (pkt 8) | not decoded | Race results page |

**Verdict: the fastest, most honest upgrades are decode jobs, not
features.** No fabrication required — the pit wall was streaming it to us
all along.

**Honest limits (game does not provide — we must never fake):**
- Opponent tyre temps/pressures/ERS/fuel (timing-only for rivals)
- Tyre wear % (inferable from age+temps, must be labeled as estimate)
- Weather radar imagery, team radio audio, video feeds

---

## 2. Per-page verdicts

### `/` Landing — **B+**
Portals→distinct personas ✓, honest copy ✓. Missing: live session strip
(track/conditions when a session runs) to make the landing feel like the
entrance to an *operating* pit wall, not a brochure.

### `/dashboard` Cockpit — **B+ visual / C- data completeness**
Strong: wheel, ribbon, map, delta, era labels, honesty contract.
Against a real engineer's screen it's missing the **timing layer**:
no lap-history table, no sector ranking, no ideal lap, no purple/green
PB/SB coloring, no pit status, no real weather/flags (yet — see §1),
rivals are synthetic names. The single-instrument focus is right for the
*driver* persona; the *engineer* persona is underserved here.

### `/dashboard/intelligence` Mission Control — **C+**
Right idea (strategy console, delta chart, setup matrix, AI briefing)
running on the synthetic path. Against the benchmark it lacks the
strategy engineer's core: **stint table, tyre-degradation curves, race
pace table, undercut/overcut window, ideal-lap calculator**. These are
computable from data we already store (laps DB + recorder). The AI
briefing is our differentiator — nobody in the market streams a
contextual debrief.

### `/debug` — **B**
Honest, functional. Add: packet-rate counters + last-event log (it's the
operator page; give them the stream's pulse).

### Missing pages (benchmark-driven, all real-data-backed)
1. **Timing page (timing tower)** — full field table: gaps, sectors,
   best/last laps, compounds, pit status, PB green/SB purple. The pit
   wall's primary screen. Data: lap data pkt + participants.
2. **Strategy page** — stint table, tyre-age/deg curve, fuel-per-lap,
   pit window vs gap-ahead (undercut estimate: gap < pit loss ≈ 20 s),
   race-pace trend. Data: recorder + DB. This is the Strategy Head persona.
3. **Session/Results page** — final classification, best sectors, ideal
   lap, session summary. Data: final classification pkt + DB.

---

## 3. Market comparison — brutal

### Where APX IQ wins today
- **Only pit-wall cockpit purpose-built for the F1 games.** G61/VRS/Pi are
  iRacing-first; Track Titan covers F1 but as a post-session coach, not a
  live instrument.
- **Real-time pit-wall layer.** Market norm is post-session analysis;
  real-time coaching exists (TrackPro) but iRacing/AC-only and
  hardware-locked. Our live cockpit + streaming AI debrief is genuinely
  rare.
- **Regulation-era awareness.** Nobody else even models this.
- **Honesty contract.** SIM badges, NO SIGNAL states — market tools show
  empty charts; we show why they're empty.
- **Era-correct circuit library + aero zones**, local-first, self-hosted,
  open schema, AI debriefs with SSE streaming.

### Where the market beats us — no excuses
- **Lap history & timing tables** (Garage 61's core) — we store every lap
  and show none of them as a table. Worst gap.
- **Reference-lap pools.** VRS/G61/TT benchmark against thousands of
  community/pro laps; our ghost pool is FastF1-only. Mitigation: FastF1
  IS a pro reference (real F1 data) — but there's no community layer.
- **Post-session analysis depth.** MoTeC/Pi offer worksheets, math
  channels, histograms, video sync. Our ribbon+delta is entry-level by
  comparison.
- **Voice coaching** (Crew Chief, TrackPro APEX) — in-ear, real-time. Our
  insights feed is visual-only.
- **Multi-driver telemetry comparison** — limited by the game (opponents
  stream timing, not telemetry). Honest limit; G61/VRS don't face it in
  iRacing (full-field telemetry there).
- **Strategy simulation** (RaceWatch Monte Carlo) — the real pit wall's
  crown jewel. We have the inputs (laps, fuel, gaps) for a simplified
  undercut/pit-window model; full Monte Carlo is a v2 mountain.
- **Session browser UX** — we persist sessions/laps but have no page to
  browse them.

---

## 4. Roadmap (ranked: value × data-availability × effort)

### P0 — Decode what already streams (all real, all cheap)
1. Session packet: air/track temp, rain% ×5, session type, time left
   → real Weather + Session clock (kills 2 NO SIGNALs)
2. Participants packet → real driver names/teams (battle panel, tower)
3. Event packet → real flags, penalties, stints
4. Telemetry: tyre pressures → real pressure instrument
5. Car status: brake bias → real bias instrument
6. Lap data: best-sector extraction → ideal-lap chip, PB/SB coloring

### P1 — The missing screens
7. **Timing tower** (dashboard overlay or Timing page) — full field,
   PB/SB colors, compounds, pits
8. **Strategy page** — stint table, deg curve, race-pace trend,
   undercut window (gap vs ~20 s pit loss), fuel-to-end
9. **Session browser** — history of stored sessions/laps → feeds
   Mission Control with REAL user laps (kills the synthetic path)
10. Lap-history table on Mission Control + ideal-lap calculator

### P2 — Differentiators
11. Track-evolution grip trend (lap times vs stint age)
12. Position-loss-if-pit-now estimate
13. Micro-sectors on circuit map
14. Simplified strategy sim (deterministic first: fuel+deg curves →
    stint projection; Monte Carlo later)
15. Second-screen/mobile companion (read-only pit wall on a tablet)

### Explicit non-goals (honesty)
- Fake opponent telemetry, invented weather radar, audio transcription
  from thin air, "AI" insights without underlying data.

---

## 5. Bottom line

The cockpit layer we built is genuinely differentiated — nobody sells a
live, era-aware, honest F1-game pit wall. But today we are a beautiful
**driver instrument**, while the brand promise is a **pit wall**. The gap
to the benchmark is not more widgets — it is (a) decoding the stream we
already receive, (b) the timing/strategy screens that real engineers
stare at, and (c) a session browser that turns our own database into the
product. P0 alone — six decode jobs — replaces every demo instrument with
real data and kills every NO SIGNAL on the page.
