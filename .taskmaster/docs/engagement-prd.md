# PRD: Challenges, Progression, Quests, Adaptive Difficulty (Statistics Hub)

## Overview
Add four engagement pillars—Adaptive Difficulty, Daily/Weekly Challenges, Progression (XP/levels/cosmetics), and Session Quests—while keeping the landing page uncluttered. Statistics becomes the central hub; secondary entry points live in the ready screen and post-game modal.

## Goals
- Increase retention via rotating challenges and short quests.
- Maintain flow via adaptive difficulty tuned to player performance.
- Provide progression feedback (XP/levels/unlocks) without affecting gameplay fairness.
- Keep navigation minimal: reuse Statistics as the hub; add contextual CTAs in ready/post-game.

## Non-goals
- New landing-page buttons.
- Pay-to-win or monetized power items.
- Full social graph; only lightweight leaderboards/badges.

## User Stories (prioritized)
1) As a player, I want daily/weekly challenges I can join quickly so I return regularly.  
2) As a player, I want difficulty to adapt to my performance so rounds stay engaging.  
3) As a player, I want XP/levels and cosmetic unlocks so I feel rewarded.  
4) As a player, I want short quests to guide play sessions and earn bonuses.  
5) As a player, I want to access all of this from Statistics or end-of-game surfaces without extra landing clutter.

## Functional Requirements

### Navigation & Surfaces
- Restore Statistics button; Statistics hosts tabs/sections: Challenges, Progression, Quests, Difficulty Timeline, What’s New strip.
- Ready screen: compact card for Today’s Challenge (seed/date, reward, Start).
- Post-game modal: CTAs/cards for “Play Today’s Challenge”, “View Quests”, “Claim Unlocks”; show quest completions and rewards.
- In-HUD (minimal): small quests pill/dropdown; optional to toggle in settings.

### Adaptive Difficulty
- Inputs: rolling windows for accuracy, reaction time, miss streaks; sample every few seconds.
- State machine: ramps speed/target size/spawn cadence within guardrails; decay back to baseline to avoid whiplash.
- Config: dev-only sliders/toggles for sensitivity and ceilings.
- Analytics: log difficulty state timeline per session; show timeline in Statistics with accuracy overlay.

### Daily/Weekly Challenges
- Seeds: deterministic daily/weekly seeds; stored with validity window; server-trust on completion.
- Surfaces: ready screen card; Statistics panel; post-game CTA.
- Data: completion state, streak count; badges for streak milestones.
- Leaderboard: scoped to challenge period; show rank, score/RT metrics; basic anti-anomaly flags.
- Rewards: XP bonus + cosmetic tickets; one-time claim per challenge window.

### Progression Track (XP/Levels/Cosmetics)
- XP formula: base on score, accuracy, difficulty factor; bonuses for challenge/quest completions.
- Level curve: configurable; soft cap multiplier after threshold.
- Panel in Statistics: level, XP bar, recent unlocks, next rewards.
- Cosmetics: themes, particle trails, hit sounds; selection via Statistics and post-game modal; no gameplay advantage.
- Anti-abuse: server-side claim check; no duplicate reward grants.

### Session Goals & Quests
- Quest pool: short objectives (e.g., “10 perfect taps”, “Finish 3 rounds no misses”); cap active slots (e.g., 3).
- Rotation: auto-refresh daily; allow manual reroll with cooldown.
- Surfaces: HUD pill/dropdown progress; post-game summary; full list in Statistics.
- Rewards: XP + cosmetic tickets; one-time per quest; cooldown on rerolls.

## Telemetry & Anti-cheat
- Log: accuracy, reaction time distribution, misses, difficulty states, challenge/quest start/end, completions, streaks, rewards claimed.
- Detect anomalies (impossible APM/RT) → flag leaderboard entries; mark “trusted” mode for calibrated clients.

## Accessibility & UX
- Colorblind-friendly palettes and clear target outlines.
- Optional haptic/sound cues for hits/misses and quest completion.
- Maintain larger game/ready areas; HUD size unchanged (per prior preference).

## Dependencies & Integration Notes
- Reuse Statistics for navigation; no new landing buttons.
- Touch points: ready screen card, post-game modal CTAs, Statistics hub, HUD pill.
- Persistence needed for: challenge seeds/states, progression, quests, cosmetics.

## Risks / Mitigations
- Difficulty whiplash → smoothing windows, guardrails, decay.
- Leaderboard abuse → anomaly flags, server validation, one-claim rewards.
- UI clutter → constrain to Statistics hub + small contextual cards.

## Open Questions
- Exact XP curve targets (sessions-to-level pacing)?
- Number of cosmetic unlock tiers and themes at launch?
- Leaderboard scope (global/regional/friends) and update cadence?
- How many active quests and reroll policy?

## Rollout Plan
- Phase 1: Adaptive difficulty + Statistics timeline + ready/post-game cards (no rewards yet).
- Phase 2: Daily/weekly challenges with rewards and leaderboards.
- Phase 3: Progression (XP/levels) and cosmetic unlock/selector surfaces.
- Phase 4: Quests + HUD pill + reroll rules.
- A/B: difficulty sensitivity and XP curve variants.

