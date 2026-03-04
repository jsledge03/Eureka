import { useState } from "react";
import { Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type TooltipType = "daily-rhythm" | "rhythm-score" | "identity-alignment" | "momentum" | "season-mode" | "gravity-score" | "friction-mapping" | "forecast" | "proof-timeline" | "commitment-budget" | "cognitive-load" | "burnout-risk" | "strict-mode" | "strategic-intent" | "strategic-trajectory" | "strategic-advisory";

const TOOLTIP_CONTENT: Record<TooltipType, { title: string; body: React.ReactNode }> = {
  "daily-rhythm": {
    title: "Daily Rhythm",
    body: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/80">
          Your Daily Rhythm is not about perfection. It's about alignment, energy awareness, and consistent movement.
        </p>
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Each day moves through five stages:</p>
          <div className="space-y-2.5">
            {[
              { label: "State", desc: "Your energy and capacity." },
              { label: "Intent", desc: "What matters today." },
              { label: "Action", desc: "Habits and tasks completed." },
              { label: "Reflection", desc: "What worked and what didn't." },
              { label: "Adaptation", desc: "Adjusting tomorrow accordingly." },
            ].map((s) => (
              <div key={s.label} className="flex gap-3 items-start">
                <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-lg px-2 py-1 uppercase tracking-wide shrink-0 mt-0.5">{s.label}</span>
                <span className="text-sm text-foreground/70">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm leading-relaxed text-foreground/70">
          Low-energy days are not failures. Using a Minimum Version or reducing scope is intelligent self-leadership.
        </p>
      </div>
    ),
  },
  "rhythm-score": {
    title: "Rhythm Score",
    body: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/80">
          Rhythm measures consistency over time — not streaks.
        </p>
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rolling 14-day window:</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-xl">
              <span className="text-sm font-medium text-foreground/80">Habits</span>
              <span className="text-sm font-bold text-primary">70%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-xl">
              <span className="text-sm font-medium text-foreground/80">Tasks</span>
              <span className="text-sm font-bold text-primary">30%</span>
            </div>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-foreground/70">
          Grace days count as neutral — they prevent shame spirals while protecting consistency.
        </p>
        <p className="text-sm leading-relaxed text-foreground/70">
          Rhythm rewards steadiness, not intensity. You don't need perfect days. You need sustainable ones.
        </p>
      </div>
    ),
  },
  "identity-alignment": {
    title: "Identity Alignment",
    body: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/80">
          This score reflects how closely your actions matched the person you're becoming.
        </p>
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">It blends four signals:</p>
          <div className="space-y-2">
            {[
              { label: "Intentionality", weight: "30%", desc: "Did you define what mattered today?" },
              { label: "Congruent Action", weight: "40%", desc: "Did your habits and tasks support your goals and identity?" },
              { label: "Integrity Under Constraints", weight: "20%", desc: "On low-energy days, did you adapt wisely instead of forcing it?" },
              { label: "Reflection", weight: "10%", desc: "Did you close the loop and learn?" },
            ].map((s) => (
              <div key={s.label} className="p-3 bg-muted/30 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-foreground/80">{s.label}</span>
                  <span className="text-xs font-bold text-primary">{s.weight}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm leading-relaxed text-foreground/70">
          This score is about congruence — not volume. A focused, aligned day can score higher than a busy one.
        </p>
      </div>
    ),
  },
  "momentum": {
    title: "Momentum",
    body: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/80">
          Momentum reflects forward movement in the present week.
        </p>
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">It increases when:</p>
            <ul className="space-y-1.5 pl-1">
              {["You complete priority tasks", "You execute keystone habits", "You follow through on reset intentions"].map((t) => (
                <li key={t} className="text-sm text-foreground/70 flex gap-2 items-start">
                  <span className="text-emerald-500 text-xs mt-1">+</span> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">It dips when:</p>
            <ul className="space-y-1.5 pl-1">
              {["Tasks accumulate without triage", "Habits are repeatedly skipped without adaptation"].map((t) => (
                <li key={t} className="text-sm text-foreground/70 flex gap-2 items-start">
                  <span className="text-destructive text-xs mt-1">−</span> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-foreground/70">
          Momentum is directional — not moral. If it dips, recalibrate. If it rises, protect the structure that created it.
        </p>
      </div>
    ),
  },
  "season-mode": {
    title: "Season Mode",
    body: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/80">
          Season Mode adjusts the entire system to match your current life phase. Instead of one-size-fits-all expectations, your coach adapts grace, task targets, and drift sensitivity to your reality.
        </p>
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Five Seasons:</p>
          <div className="space-y-2.5">
            {[
              { label: "Build", desc: "Actively growing — adding habits, pursuing goals, stretching capacity." },
              { label: "Stabilize", desc: "Locking in progress — maintaining what works and refining systems." },
              { label: "Recover", desc: "Restoring energy — reducing load, being gentle, protecting capacity." },
              { label: "Sprint", desc: "Pushing hard for a specific outcome — short-term intensity with a deadline." },
              { label: "Reposition", desc: "Rethinking direction — pivoting goals, re-evaluating identity, navigating change." },
            ].map((s) => (
              <div key={s.label} className="flex gap-3 items-start">
                <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-lg px-2 py-1 uppercase tracking-wide shrink-0 mt-0.5">{s.label}</span>
                <span className="text-sm text-foreground/70">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm leading-relaxed text-foreground/70">
          Changing your season automatically adjusts grace days, task targets, and how sensitive the drift engine is. There is no wrong season — only honest ones.
        </p>
      </div>
    ),
  },
  "gravity-score": {
    title: "Gravity Score",
    body: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/80">
          Gravity measures how much influence a habit has on your overall system. High-leverage habits create a cascade effect — when you do them, everything else tends to go better.
        </p>
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Score components:</p>
          <div className="space-y-2">
            {[
              { label: "Rhythm Lift", weight: "up to 30", desc: "How much better your energy is on days you complete this habit." },
              { label: "Cascade Effect", weight: "up to 30", desc: "How many other habits/tasks you complete on the same day." },
              { label: "Alignment", weight: "up to 30", desc: "Whether it's a keystone habit, linked to goals, or tied to a domain." },
              { label: "Consistency", weight: "up to 15", desc: "How reliably you execute it over 28 days." },
            ].map((s) => (
              <div key={s.label} className="p-3 bg-muted/30 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-foreground/80">{s.label}</span>
                  <span className="text-xs font-bold text-primary">{s.weight}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Labels:</p>
          <div className="space-y-1.5">
            {[
              { label: "High Leverage (65+)", color: "text-emerald-600" },
              { label: "Medium (35-64)", color: "text-amber-600" },
              { label: "Low (0-34)", color: "text-muted-foreground" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className={`text-sm font-bold ${s.color}`}>●</span>
                <span className="text-sm text-foreground/70">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm leading-relaxed text-foreground/70">
          During overload, focus on high-leverage habits first. They pull the rest of your system forward.
        </p>
      </div>
    ),
  },
  "friction-mapping": {
    title: "Friction Mapping",
    body: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/80">
          Friction Mapping tracks what gets in the way of your habits and tasks — not to judge you, but to redesign your environment for success.
        </p>
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">How it works:</p>
          <div className="space-y-2.5">
            {[
              { label: "Capture", desc: "When you skip a habit or defer a task, you can tag the reason with one tap." },
              { label: "Analyze", desc: "Over 14 days, patterns emerge — which reasons and which items cause the most friction." },
              { label: "Redesign", desc: "The system suggests concrete actions: reschedule, add cues, switch to Minimum Version, or reduce frequency." },
            ].map((s) => (
              <div key={s.label} className="flex gap-3 items-start">
                <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-lg px-2 py-1 uppercase tracking-wide shrink-0 mt-0.5">{s.label}</span>
                <span className="text-sm text-foreground/70">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reason Tags:</p>
          <div className="flex flex-wrap gap-2">
            {["Time", "Energy", "Environment", "Emotion", "Overload", "Forgetfulness", "Unclear"].map((tag) => (
              <span key={tag} className="text-[10px] font-bold text-foreground/70 bg-muted/40 rounded-lg px-2 py-1">{tag}</span>
            ))}
          </div>
        </div>
        <p className="text-sm leading-relaxed text-foreground/70">
          Friction isn't failure — it's data. The goal is to make your system easier to follow, not harder on yourself.
        </p>
      </div>
    ),
  },
  "forecast": {
    title: "Adaptive Capacity Forecast",
    body: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/80">
          The Forecast looks at your recent patterns and predicts whether your system is sustainable this week — before you burn out.
        </p>
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">It reads six signals:</p>
          <div className="space-y-2.5">
            {[
              { label: "Energy", desc: "Average daily energy from your rhythm check-ins." },
              { label: "Overdue", desc: "How many tasks are past due and building up." },
              { label: "Friction", desc: "How often habits or tasks are being blocked." },
              { label: "Completion", desc: "Your habit and task completion rate this week." },
              { label: "Season", desc: "Your current season mode adjusts expectations." },
              { label: "Check-in", desc: "Your latest weekly self-assessment of capacity." },
            ].map((s) => (
              <div key={s.label} className="flex gap-3 items-start">
                <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-lg px-2 py-1 uppercase tracking-wide shrink-0 mt-0.5">{s.label}</span>
                <span className="text-sm text-foreground/70">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Three outlooks:</p>
          <div className="space-y-1.5">
            {[
              { label: "Stable", color: "text-emerald-600", desc: "Your system is sustainable. Keep going." },
              { label: "Risk of overload", color: "text-amber-600", desc: "Warning signs detected. Consider simplifying." },
              { label: "Recovery needed", color: "text-destructive", desc: "Your system needs a reset. Reduce load now." },
            ].map((s) => (
              <div key={s.label} className="flex items-start gap-2">
                <span className={`text-sm font-bold ${s.color} mt-0.5`}>●</span>
                <div>
                  <span className="text-sm font-bold text-foreground/80">{s.label}</span>
                  <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm leading-relaxed text-foreground/70">
          The forecast suggests actions — not demands. Use it to protect your capacity before it runs out.
        </p>
      </div>
    ),
  },
  "proof-timeline": {
    title: "Proof Timeline",
    body: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/80">
          The Proof Timeline captures concrete evidence that you're becoming the person you intend to be. Every qualifying action generates a proof event.
        </p>
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Proof sources:</p>
          <div className="space-y-2.5">
            {[
              { label: "Keystone", desc: "Completing a keystone habit — the highest leverage actions." },
              { label: "Goal Task", desc: "Finishing a task linked to an active goal." },
              { label: "Adaptation", desc: "Choosing Minimum Version on low-energy days instead of skipping." },
              { label: "Sunday Reset", desc: "Completing your weekly reflection and recalibration." },
              { label: "Close the Loop", desc: "Finishing the evening reflection to capture lessons." },
              { label: "Triage", desc: "Actively managing and reprioritizing your task list." },
            ].map((s) => (
              <div key={s.label} className="flex gap-3 items-start">
                <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-lg px-2 py-1 uppercase tracking-wide shrink-0 mt-0.5">{s.label}</span>
                <span className="text-sm text-foreground/70">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm leading-relaxed text-foreground/70">
          Each proof event links back to your active identity. Over time, the timeline becomes undeniable evidence of who you're becoming.
        </p>
      </div>
    ),
  },
  "commitment-budget": {
    title: "Commitment Budget",
    body: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/80">
          Your Commitment Budget is a private capacity meter. It tracks how much you've committed to versus how much you can realistically sustain.
        </p>
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Unit costs:</p>
          <div className="space-y-2">
            {[
              { label: "Active goal", units: "12 units" },
              { label: "Daily habit", units: "8 units" },
              { label: "3-5x/week habit", units: "6 units" },
              { label: "1-2x/week habit", units: "4 units" },
              { label: "Keystone bonus", units: "+3 units" },
              { label: "High-friction item", units: "+2 units" },
              { label: "Overdue backlog (>3)", units: "+5 units" },
            ].map((s) => (
              <div key={s.label} className="flex justify-between items-center p-2.5 bg-muted/30 rounded-xl">
                <span className="text-xs text-foreground/80">{s.label}</span>
                <span className="text-xs font-bold text-primary">{s.units}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm leading-relaxed text-foreground/70">
          Your budget adjusts with your Season Mode and energy trend. When overloaded, the system suggests tradeoffs — not shame.
        </p>
      </div>
    ),
  },
  "cognitive-load": {
    title: "Cognitive Load",
    body: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/80">
          Cognitive Load measures how much mental overhead your current system demands. Too many active commitments, unresolved tasks, and friction signals can overwhelm your ability to focus.
        </p>
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Inputs:</p>
          <div className="space-y-2.5">
            {[
              { label: "Goals", desc: "Active goals competing for attention" },
              { label: "Habits", desc: "Active habits requiring daily decisions" },
              { label: "Overdue", desc: "Unresolved tasks creating mental weight" },
              { label: "Friction", desc: "Recent friction events signaling resistance" },
              { label: "Drift", desc: "Active drift alerts signaling misalignment" },
            ].map((s) => (
              <div key={s.label} className="flex gap-3 items-start">
                <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-lg px-2 py-1 uppercase tracking-wide shrink-0 mt-0.5">{s.label}</span>
                <span className="text-sm text-foreground/70">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm leading-relaxed text-foreground/70">
          Low load means clarity. High load means it's time to simplify — not push harder.
        </p>
      </div>
    ),
  },
  "burnout-risk": {
    title: "Burnout Risk",
    body: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/80">
          The Burnout Risk monitor watches for patterns that precede exhaustion — so you can course-correct before you crash.
        </p>
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Warning signals:</p>
          <div className="space-y-2.5">
            {[
              { label: "Push without recovery", desc: "High output with declining energy and no rest days" },
              { label: "Energy downtrend", desc: "Energy levels dropping day over day" },
              { label: "System strain", desc: "Rising friction + growing overdue backlog together" },
              { label: "Repeated overload", desc: "Multiple check-ins reporting low capacity" },
            ].map((s) => (
              <div key={s.label} className="flex gap-3 items-start">
                <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-lg px-2 py-1 uppercase tracking-wide shrink-0 mt-0.5">{s.label}</span>
                <span className="text-sm text-foreground/70">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          {[
            { label: "Low", color: "text-emerald-600", desc: "No concerning patterns detected." },
            { label: "Watch", color: "text-amber-600", desc: "Early warning signals present. Consider reducing load." },
            { label: "High", color: "text-destructive", desc: "Burnout risk is elevated. Immediate action recommended." },
          ].map((s) => (
            <div key={s.label} className="flex items-start gap-2">
              <span className={`text-sm font-bold ${s.color} mt-0.5`}>●</span>
              <div>
                <span className="text-sm font-bold text-foreground/80">{s.label}</span>
                <p className="text-[11px] text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  "strict-mode": {
    title: "Strict Mode",
    body: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/80">
          Strict Mode adds guardrails to your system for seasons when discipline is the priority. It's optional and can be paused anytime.
        </p>
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">What it enforces:</p>
          <div className="space-y-2.5">
            {[
              { label: "Goal cap", desc: "Limits active goals (default: 3). Must pause one to add another." },
              { label: "Daily task cap", desc: "Limits tasks due today (default: 5). Encourages prioritization." },
              { label: "Overdue triage", desc: "Daily prompt to clean up when overdue > 3 tasks." },
              { label: "Drift sensitivity", desc: "Drift alerts become slightly more sensitive." },
            ].map((s) => (
              <div key={s.label} className="flex gap-3 items-start">
                <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-lg px-2 py-1 uppercase tracking-wide shrink-0 mt-0.5">{s.label}</span>
                <span className="text-sm text-foreground/70">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm leading-relaxed text-foreground/70">
          Strict Mode is suggested during Sprint season. You can pause it for 24 hours anytime without losing your settings.
        </p>
      </div>
    ),
  },
  "strategic-intent": {
    title: "Strategic Intent",
    body: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/80">
          Your Strategic Intent captures what you're currently optimizing for, protecting, or willing to trade off. It's your leadership stance — distinct from your quarterly theme.
        </p>
        <div className="space-y-3">
          {[
            { label: "Optimizing", desc: "What you're actively pushing forward right now (e.g., 'deep work consistency')" },
            { label: "Protecting", desc: "What you refuse to sacrifice even under pressure (e.g., 'sleep and recovery')" },
            { label: "Trading off", desc: "What you're intentionally deprioritizing this season (e.g., 'social commitments')" },
          ].map((s) => (
            <div key={s.label} className="flex gap-3 items-start">
              <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-lg px-2 py-1 uppercase tracking-wide shrink-0 mt-0.5">{s.label}</span>
              <span className="text-sm text-foreground/70">{s.desc}</span>
            </div>
          ))}
        </div>
        <p className="text-sm leading-relaxed text-foreground/70">
          Update this whenever your priorities shift. Your coach recommendations and trajectory analysis will reference this intent.
        </p>
      </div>
    ),
  },
  "strategic-advisory": {
    title: "Strategic Advisory",
    body: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/80">
          The Strategic Advisory consolidates all system intelligence — capacity, cognitive load, burnout, drift, friction, and trajectory — into a single actionable briefing.
        </p>
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Five components:</p>
          <div className="space-y-2.5">
            {[
              { label: "Assessment", desc: "A system-level status sentence reflecting your overall operating state." },
              { label: "Root Cause", desc: "The primary constraint holding your system back, with evidence and confidence score." },
              { label: "Mitigations", desc: "Three tiers of response — Minimum (quick relief), Standard (meaningful change), Structural (deep redesign)." },
              { label: "Next Actions", desc: "Top 3 highest-impact actions you can take right now." },
              { label: "Mode Toggle", desc: "Switch between Reflective (gentle, coaching) and Executive (direct, operational) tone." },
            ].map((s) => (
              <div key={s.label} className="flex gap-3 items-start">
                <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-lg px-2 py-1 uppercase tracking-wide shrink-0 mt-0.5">{s.label}</span>
                <span className="text-sm text-foreground/70">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm leading-relaxed text-foreground/70">
          The advisory is deterministic — it reads your actual data and never guesses. All Apply buttons take real action on your system.
        </p>
      </div>
    ),
  },
  "strategic-trajectory": {
    title: "Strategic Trajectory",
    body: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/80">
          Strategic Trajectory analyzes your system's direction by reading signals across habits, goals, energy, friction, and identity alignment.
        </p>
        <div className="space-y-3">
          {[
            { label: "Direction", desc: "An overall reading of where your system is headed — building, steady, or under strain." },
            { label: "Tailwinds", desc: "Forces working in your favor: strong completions, building momentum, stable energy, clear identity alignment." },
            { label: "Headwinds", desc: "Forces working against you: declining completion, rising friction, low energy, growing backlog, drift alerts." },
            { label: "Corrections", desc: "Actionable course corrections: pause high-friction habits, switch season, triage backlog, prioritize keystones." },
          ].map((s) => (
            <div key={s.label} className="flex gap-3 items-start">
              <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-lg px-2 py-1 uppercase tracking-wide shrink-0 mt-0.5">{s.label}</span>
              <span className="text-sm text-foreground/70">{s.desc}</span>
            </div>
          ))}
        </div>
        <p className="text-sm leading-relaxed text-foreground/70">
          Trajectory updates daily based on the last 7–14 days of data. It's designed to surface early warnings before problems compound.
        </p>
      </div>
    ),
  },
};

export function ScoringInfoButton({ type, size = 14 }: { type: TooltipType; size?: number }) {
  const [open, setOpen] = useState(false);
  const content = TOOLTIP_CONTENT[type];

  return (
    <>
      <button
        data-testid={`info-${type}`}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="inline-flex items-center justify-center rounded-full text-muted-foreground/50 hover:text-primary transition-colors shrink-0 -my-0.5"
        aria-label={`How ${content.title} works`}
      >
        <Info size={size} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80dvh] flex flex-col p-0 gap-0" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/30 shrink-0">
            <DialogTitle className="font-serif text-xl text-primary">{content.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5">
            {content.body}
            <div className="mt-6 pt-4 border-t border-border/30">
              <p className="text-[11px] text-center text-muted-foreground/60 italic font-medium">
                This is a compass — not a grade.
              </p>
              <p className="text-[10px] text-center text-muted-foreground/40 italic mt-1">
                This system is designed to help you adapt — not to evaluate you.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
