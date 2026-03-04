# Life Compass

Personal habit, goal, and task tracker PWA. Architecture: Identity → Goal → Habit → Task → Review → Adaptation.

## Stack

- **Frontend**: React + Vite, Zustand store, Tailwind CSS, shadcn/ui, wouter routing, sonner toasts
- **Backend**: Express.js, Drizzle ORM, PostgreSQL (Neon)
- **PWA**: manifest.json + service worker (network-first) in `client/public/`
- **Haptics**: `client/src/lib/haptics.ts` — 5 patterns (light, medium, success, warning, achievement) integrated across all interactive surfaces

## Architecture

- Zustand store (`client/src/store/useStore.ts`) is the source of truth for the UI
- On mount, store hydrates from `/api/state` endpoint
- Every mutation optimistically updates Zustand, then fire-and-forget syncs to the DB via API
- Column names: DB uses snake_case, frontend uses camelCase; hydration maps between them

## Key Files

- `shared/schema.ts` — Drizzle schema (identities, goals, habits, tasks, logs, quarter_plans, etc.)
- `server/db.ts` — PostgreSQL connection pool via `pg`
- `server/storage.ts` — DatabaseStorage class implementing IStorage interface
- `server/routes.ts` — Express API routes (all prefixed `/api`)
- `client/src/store/useStore.ts` — Zustand store with persist + API sync
- `client/src/lib/api.ts` — Fetch wrapper for all API calls
- `client/src/components/Layout.tsx` — Bottom nav, hydration trigger, keyboard handling
- `client/src/pages/Dashboard.tsx` — Customizable dashboard with widget cards (route: `/`)
- `client/src/pages/Home.tsx` — "My Day" view with morning/evening flows (route: `/today`)
- `client/src/pages/Tasks.tsx` — Task management with 5 tabs (Past/Today/Soon/Recovery/Done)
- `client/src/pages/HabitsHub.tsx` — Habit management with search and personalized recommendations
- `client/src/lib/recommendationEngine.ts` — Personalized habit recommendations: goal-gap, domain-gap, strengthen, balance, micro-upgrade categories
- `client/src/pages/Identity.tsx` — Identity system: active identity card, evidence, alignment gauge, commitments, goals by identity, drift sheet
- `client/src/pages/CoachTab.tsx` — Self Leadership OS Dashboard: Identity → Forecast → Drift → Gravity → Friction → Proof → Evidence → North Star → Rhythm → Leadership → Reminders
- `client/src/lib/alignmentEngine.ts` — Identity alignment scoring (0-100): intentionality + congruent action + integrity + reflection
- `client/src/lib/driftEngine.ts` — Drift detection (domain/reflection/integrity/commitment/overdue), max 3 alerts
- `client/src/lib/evidenceEngine.ts` — Weekly evidence items + gap items with fix actions
- `client/src/lib/seasonEngine.ts` — Season Mode engine: 11 modes (Build/Stabilize/Recover/Sprint/Reposition/Transition/Maintenance/Healing/Exploration/Leadership Peak/Focus Sprint) with per-mode defaults (graceDays, driftSensitivity, taskTarget, commitmentModifier)
- `client/src/lib/frictionEngine.ts` — Friction Mapping engine: captures why habits/tasks fail, computes 14-day insights (top reasons, entities, redesign suggestions)
- `client/src/lib/proofEngine.ts` — Identity Proof Timeline: generates proof events on keystone completions, wise adaptations, Sunday Reset, Close the Loop
- `client/src/lib/gravityEngine.ts` — Keystone Gravity Mapping: scores habits 0-100 based on rhythm lift, cascade effect, alignment, consistency over 28 days
- `client/src/lib/forecastEngine.ts` — Adaptive Capacity Forecasting: weekly outlook (Stable/Risk of overload/Recovery needed), signals, actionable interventions
- `client/src/lib/rootCauseEngine.ts` — Root Cause classification: 7 types (capacity-overload, friction-misalignment, overcommitment, energy-mismatch, domain-neglect, recovery-deficit, identity-behavior-tension) with confidence scoring
- `client/src/lib/advisoryEngine.ts` — Strategic Advisory engine: situation assessment, primary constraint, 3-tier mitigations (minimum/standard/structural), next best actions, reflective/executive tone
- `client/src/lib/streakEngine.ts` — Celebration Streak engine: computes current/longest streaks per habit, milestone detection, top streaks ranking
- `client/src/components/StreakCelebration.tsx` — Celebration modal for streak milestones
- `client/src/lib/reminderEngine.ts` — Local reminder engine (checks on app open/resume), push detection, test notification
- `client/src/lib/haptics.ts` — Haptic feedback via navigator.vibrate (hapticLight/Medium/Success)
- `client/src/components/NudgeBanner.tsx` — Top-of-screen coach nudge banner
- `client/src/components/ReminderCenter.tsx` — Active/dismissed nudges list
- `client/src/components/NotificationSettings.tsx` — Notification schedule config, push status, test button, notification center
- `client/src/pages/Review.tsx` — Sunday Reset + Strategic Plan

## Design

- Warm off-white bg, terra cotta primary, sage secondary
- `border-none shadow-sm rounded-2xl` cards (Card base component)
- Dialog/AlertDialog: mobile bottom-sheet by default (slide-up, drag handle, safe-area bottom padding); desktop: centered modal
- Settings/layout sheets: ALL pages with section reordering use bottom Sheet (not Dialog), title pattern `<Settings2 /> Section Layout`, rows use `GripVertical + label + ChevronUp/Down + Eye/EyeOff`, Done button `variant="outline" w-full h-11 rounded-2xl`
- Gear icon buttons: `rounded-full h-10 w-10 min-h-[44px] min-w-[44px] bg-muted/30 text-muted-foreground`
- Page headers: `pt-6 pb-1 flex justify-between items-start`; sub-label `text-[10px] font-bold uppercase tracking-widest text-muted-foreground`; h1 `text-3xl font-serif text-primary mt-1`; button group `pt-1`
- Section headers: `text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground` (standardized across all pages)
- Page enter animation: `animate-in fade-in duration-500` (no slide-in-from-bottom)
- Buttons: min-h-11 (44px touch targets), rounded-xl default
- Font: serif headings, sans body
- Layout: `fixed inset-0` on outer div, safe-area insets via `safe-top`/`safe-bottom`/`safe-x` CSS utilities; `html/body/#root { height: 100%; overflow: hidden }`
- Bottom nav: fixed, blurred bg, hidden on keyboard, 3.25rem height + safe-area bottom
- `viewport-fit=cover` in meta viewport for iPhone notch/home indicator support
- All Dialog/Sheet/AlertDialog components use `onOpenAutoFocus={(e) => e.preventDefault()}` to prevent mobile scroll issues
- Dialog/Sheet/AlertDialog use native browser keyboard handling (no JS viewport manipulation); body `position: static !important` prevents react-remove-scroll from interfering with keyboard
- All interactive elements have `data-testid` attributes following the pattern: `{action}-{target}` for buttons, `{type}-{content}-{id}` for dynamic elements

## Identity Model

- DB column `statement` maps to "becoming statement" in UI
- `isActive` determines active identity (multiple can be active simultaneously)
- `setActiveIdentity(id)` deactivates all others (legacy, used for fallback)
- `toggleIdentityActive(id)` toggles one identity's active state (cannot deactivate if it's the last active)
- `getActiveIdentity()` returns first active or first identity (backward compat)
- `getActiveIdentities()` returns all active identities (primary method for multi-identity)
- Engines (`alignmentEngine`, `driftEngine`, `evidenceEngine`) are pure functions taking a `StoreSnapshot` object
- Alignment score: 0-100 (intentionality 30 + congruent action 40 + integrity 20 + reflection 10)
- Drift alerts: max 3, sorted by severity (High > Medium > Low)
- `domainEmphasis`: JSON `{domain: weight 0-3}` — weight ≥2 is "emphasized"
- `characterCommitments`: text array, one commitment per line in UI

## Conventions

- Timezone: Always `new Date().toLocaleDateString('en-CA')` for YYYY-MM-DD (NOT `.toISOString()`)
- "Plan B" / "Minimum Version" (not "micro" in UI); `fallback` stores text; `isMicro` is boolean
- Store key: `life-compass-storage`
- `taskLabels` is a persisted array
- Toasts: `sonner` exclusively, no `window.confirm()`, delete flows use Dialog components with confirmation
- Identity deletion: uses confirmation dialog (isDeleteIdentityOpen), allows deleting last identity with warning, deleteIdentity unlinks goals both in state AND in DB via api.updateGoal
- DB IDs: varchar with `gen_random_uuid()` default
- Dashboard widget preferences: Zustand-persisted locally (not server-synced), stored in `dashboardWidgets` array
- Section layout preferences: `coachSections`, `reviewSections`, and `homeSections` in store (local-only, not server-synced); each section has `{ id, visible }` config; `toggleSectionVisibility(page, id)` and `moveSection(page, id, direction)` actions (page: 'coach' | 'review' | 'home'); CSS `order` on wrapper divs for reordering; gear icon in Coach/Review/Home headers opens layout sheet; migration-safe (missing sections appended from defaults)
- Notification settings + coach nudges: Zustand-persisted locally in `notificationSettings`, `coachNudges`, and `reminderEvents`
- ReminderEvent system: each fired reminder creates a `ReminderEvent` (templateType, name, status, dateKey); dismissing a nudge marks linked event as `done`; "Earlier today" in ReminderCenter reads from events filtered by today's dateKey + status=done
- CoachNudge has optional `reminderEventId` linking it to its ReminderEvent; `dismissNudge` auto-completes the linked event
- Reminder engine runs on app open + visibility change; max 2 nudges per open (resets on visibility change); `firedReminderKeys` in store tracks shown reminders per day (persisted, not sessionStorage); dedup prevents same reminder from firing twice in a day even across sessions
- Dismissed nudges stay dismissed permanently (no session reset on visibility change)
- REMINDER_LABELS exported from reminderEngine.ts for shared access (templates are the source of truth for names)
- Drift snooze: `driftSnoozedUntil` in store, 7-day snooze via `snoozeDriftAlerts()`, checked via `isDriftSnoozed()`
- Haptics: applied to habit/task completion (success), morning/evening finish (success), grace (success), fallback (medium), drift snooze/actions (light/medium)
- Season Mode: `seasonMode` in store (Build/Stabilize/Recover/Sprint/Reposition); `setSeasonMode(mode)` auto-adjusts graceDaysPerWeek; Season pill in CoachTab header; persisted to DB via app_settings and hydrated from `/api/state`
- Friction Events: `frictionEvents[]` in store; captured on habit skip/task defer (max 1/day); `frictionPromptShownToday` tracks daily limit; `frictionPromptFrequency` in NotificationSettings ('normal'/'light'/'off')
- Proof Events: `proofEvents[]` in store; auto-generated on keystone habit completion, close-the-loop, sunday-reset, wise-adaptation, streak-milestone; displayed in Identity.tsx timeline
- Celebration Streaks: computed on the fly via `computeAllStreaks(habits, logs, todayDate)` from `streakEngine.ts`; tracks consecutive days of habit completion (status 'completed' or 'micro'); milestones at 3/7/14/21/30/60/90/100/180/365 days; celebration modal triggers on milestone hit (tracked in `celebratedMilestones` store field to avoid repeats); proof event auto-generated on milestone; streak badges shown on habit cards in Home.tsx + HabitsHub.tsx; top streaks shown in CoachTab; `getTopStreaks()` returns top 3 habits by current streak
- Habit Progress Visualization: 14-day dot grid on each HabitCard in HabitsHub.tsx; dots color-coded (emerald=completed, secondary=micro, destructive/30=skipped, amber/40=grace, muted=empty); completion rate percentage (green ≥80%, amber ≥50%, muted <50%); precomputed `habitLogMap` (Map<habitId, Map<date, status>>) with status precedence (completed > micro > others)
- Trend Visualizations: `client/src/lib/trendEngine.ts` — computes rolling historical scores (rhythm 14-day window, momentum 7-day window) for sparkline charts; `client/src/components/Sparkline.tsx` — lightweight SVG sparkline with gradient fill, cubic Bézier smoothing, and end-dot; used in Dashboard rhythm-score and momentum widgets (30-day history)
- Calendar Heat Map: `client/src/components/HeatMap.tsx` — GitHub-style 90-day calendar grid showing habit completion density; color-coded 5-level intensity (emerald shades); hover/touch tooltips; month labels, day-of-week labels; summary stats (total completions, active days); collapsible section in HabitsHub.tsx; data from `computeHabitHeatMap()` in trendEngine
- Gravity Scores: computed on the fly via `computeGravityScores(habits, logs, tasks, dailyRhythms, goals?, identities?)` — identity-linked habits get +10 alignment bonus; keystone habits need ≥2 data points, regular habits need ≥4
- Forecast: computed on the fly via `computeWeeklyForecast()` — reads energy, overdue, friction, completion rate, season, check-ins, identity-goal activity
- Identity-Goal Chain: Goals have `identityId`, habits/tasks have `goalId` → full chain: Identity → Goal → Habit/Task. All 5 engines now trace this chain:
  - Drift: `detectIdentityGoalDrift` alerts when an identity's linked goals have no activity
  - Evidence: shows per-identity action counts and gaps for identity-linked goals with no activity
  - Alignment: identity-linked completions get bonus points in congruent action score
  - Gravity: habits linked to identity-connected goals get +10 alignment bonus
  - Forecast: signals when no identity-linked goal activity this week; notes identities without linked goals
  - Proof: `generateProofEvent` references the specific identity linked via goal chain (not just generic active identities)
- System Upgrades (all 5 wired to real behavior):
  - `keystoneMode` → filters habits on My Day to only show keystone-marked habits
  - `energyScheduling` → auto-sorts tasks on My Day by energy match (low-energy-first on low days, high-energy-first on high days)
  - `frictionAudit` → overrides daily friction prompt limits, always prompts on skip/defer to build friction data
  - `identityAlignment` → shows alignment score section in CoachTab
  - `focusMode` → limits My Day to top 5 habits and 3 tasks
- System Suggestions (Leadership Steps): context-aware recommendations that execute in-place (not just navigate); dismissed via `dismissedRecs` state; show impact text
- Strategic Suggestions (Review tab): memoized via `strategicSuggestions`, each suggestion has `id`, `action()`, and `actionLabel`; can toggle system upgrades, defer tasks, adjust grace, auto-add Plan B, create domain tasks
- Server routes: all wrapped in `asyncHandler` for error catching; global Express error handler returns 400/500 JSON; all POST routes validate request body via Zod schemas from `shared/schema.ts`; settings POST validates key length and requires `value` field
- ScoringTooltip types: daily-rhythm, rhythm-score, identity-alignment, momentum, season-mode, gravity-score, friction-mapping, forecast, proof-timeline, commitment-budget, cognitive-load, burnout-risk, strict-mode, strategic-advisory, strategic-trajectory

## Governance Systems (OS-level)

- **Commitment Budget**: `commitmentEngine.ts` — computes budget (season×energy adjusted), usage (unit costs per item type), overload detection + tradeoff suggestions
  - Store: `commitmentBudgetBase` (default 100), persisted via api.setSetting
  - Coach: inline in Advisory Panel; Review: System Load section; My Day: overload banner (only when exceeded); Identity: goal-add warning when over budget
  - Season modifiers: Recover=70, Stabilize=85, Build=100, Reposition=90, Sprint=110, Transition=80, Maintenance=85, Healing=60, Exploration=90, Leadership Peak=115, Focus Sprint=105
  - Unit costs: goal=12, daily habit=8, 3-5x=6, 1-2x=4, keystone=+3, high-friction=+2, overdue>3=+5
- **Cognitive Load Meter**: `cognitiveLoadEngine.ts` — computes load level (Low/Moderate/High) from goals, habits, overdue, drift, friction, notifications
  - Coach: Cognitive Load card + Simplify sheet; Review: badge in System Load
- **Burnout Risk**: `burnoutEngine.ts` — detects burnout risk (Low/Watch/High) from energy trends, completion patterns, friction+overdue combo, check-in history
  - Coach: inline in Advisory Panel; Review: badge in System Load
- **Root Cause Engine**: `rootCauseEngine.ts` — classifies system issues into 7 root cause types with confidence scores and severity
- **Strategic Advisory**: `advisoryEngine.ts` — generates full advisory from root causes
  - Coach: Advisory Panel with mode toggle (reflective/executive), situation assessment, primary constraint, 3-tier mitigations, next best actions
  - All mitigation actions wired: pause-habit, pause-goal, switch-season, reduce-task-target, minimum-version, schedule-recovery, focus-domain, reduce-goals, simplify-habits
  - Store: `advisoryMode` persisted via api.setSetting
- **Weekly Narrative**: `narrativeEngine.ts` — generates weekly executive memo: executiveSummary, domainBalance, operationalRisks, strategicLeverage, nextWeekFocus, protected, drifted, patterns, recommendations
  - Coach: preview card + full memo bottom sheet with all sections; Review: summary + "View in Coach" link
- **Strict Mode**: `strictMode: StrictModeConfig` in store (enabled, pausedUntil, goalCap, dailyTaskCap); default OFF
  - Coach: toggle switch with tooltip + Sprint suggestion + "Pause 24h" escape hatch
  - My Day: overdue triage prompt when >3, daily task cap enforcement
  - Actions: `toggleStrictMode()`, `pauseStrictMode24h()`, `setStrictMode(updates)`, `isStrictModeActive()` (checks enabled + pause not active)
- **Strategic Themes**: Quarter plan `theme` field stores up to 3 themes as JSON array string (e.g. `["Theme 1","Theme 2"]`); `parseThemes()`/`serializeThemes()` helpers in Review.tsx; displayed at top of Quarter tab with add/remove UX; Dashboard North Star and CoachTab parse multi-theme format; empty themes cleaned on blur
- **Strategic Intent**: `strategicIntent` string in store; editable via 3-step guided builder (optimization focus → tradeoff → protection) in Review tab; persisted via api.setSetting
- **Dynamic Theming**: `ThemeProvider` (`client/src/components/ThemeProvider.tsx`) applies CSS custom properties for 4 time-of-day palettes (morning/day/evening/night); `colorTheme` in store ('auto'|'morning'|'day'|'evening'|'night'); auto mode checks hourly (5-10=morning, 10-17=day, 17-21=evening, 21-5=night); night mode toggles `.dark` class + `color-scheme: dark`; smooth transitions via global CSS `transition` on `*`; setting in CoachTab System Upgrades section; persisted via api.setSetting; store version 4
- **Strategic Trajectory**: `trajectoryEngine.ts` — computes direction, tailwinds, headwinds, course corrections, momentum (↑↓→), stability (Stable/Pressured/Fragile), risk outlook (Clear/Watch/Elevated), domain misalignment score
  - Coach: full trajectory card with indicators, tailwinds (▲), headwinds (▼), actionable correction buttons
  - Corrections handle: pause-habit, switch-season, schedule-reset, minimum-version, prioritize-keystone, adjust-constraints
- **Domain Allocation**: Review Strategic Plan tab visualizes domain-weighted activity distribution with focus domain badges, underinvested/overinvested alerts
- **Anti-Redundancy**: Coach=action surface, Review=governance, My Day=execution. No duplicate action surfaces. Intelligence Layer removed from Review (was redundant with Coach's dedicated sections for Suggestions, Friction, Drift, Proof, Gravity, Streaks).

## Routing

- `/` — Dashboard (customizable widgets)
- `/today` — My Day (morning/evening flows)
- `/tasks` — Task management
- `/habits` — Habit hub
- `/identity` — Identity + Goals
- `/coach` — Self Leadership (accessible via FAB button)
- `/review` — Sunday Reset + Strategic Plan

## Database

- PostgreSQL via Drizzle ORM
- Schema push: `npm run db:push`
- Tables: identities, goals, habits, tasks, completion_logs, quarter_plans, weekly_check_ins, daily_rhythms, app_settings
