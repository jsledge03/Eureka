import type { SeasonMode } from '@/lib/seasonEngine';
import type { Goal, Habit, Task, FrictionEvent, DailyRhythm } from '@/store/useStore';

export interface CommitmentBudget {
  baseBudget: number;
  seasonModifier: number;
  energyModifier: number;
  totalBudget: number;
}

export interface CommitmentUsage {
  totalUsed: number;
  breakdown: { label: string; units: number }[];
}

export interface OverloadSuggestion {
  type: 'pause-habit' | 'reduce-frequency' | 'minimum-version' | 'pause-goal';
  label: string;
  action: string;
  entityId?: string;
}

const SEASON_MODIFIERS: Record<SeasonMode, number> = {
  Recover: 70,
  Stabilize: 85,
  Build: 100,
  Reposition: 90,
  Sprint: 110,
  Transition: 80,
  Maintenance: 85,
  Healing: 60,
  Exploration: 90,
  'Leadership Peak': 115,
  'Focus Sprint': 105,
};

function getLast7Dates(): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString('en-CA'));
  }
  return dates;
}

export function computeCommitmentBudget(
  seasonMode: SeasonMode,
  dailyRhythms: Record<string, DailyRhythm>,
  baseBudget: number = 100
): CommitmentBudget {
  const seasonModifier = SEASON_MODIFIERS[seasonMode];

  const last7 = getLast7Dates();
  const rhythmDays = last7.filter(d => dailyRhythms[d]).map(d => dailyRhythms[d]);

  let energyModifier = 0;
  if (rhythmDays.length > 0) {
    const avgEnergy = rhythmDays.reduce((sum, r) => sum + r.energy, 0) / rhythmDays.length;
    if (avgEnergy < 2.5) {
      energyModifier = -Math.round(5 + (2.5 - avgEnergy) * 10);
      energyModifier = Math.max(energyModifier, -15);
    } else if (avgEnergy > 3.5) {
      energyModifier = Math.round((avgEnergy - 3.5) * (10 / 1.5));
      energyModifier = Math.min(energyModifier, 10);
    }
  }

  const totalBudget = Math.round(baseBudget * (seasonModifier / 100)) + energyModifier;

  return { baseBudget, seasonModifier, energyModifier, totalBudget };
}

export function computeCommitmentUsage(
  goals: Goal[],
  habits: Habit[],
  tasks: Task[],
  frictionEvents: FrictionEvent[]
): CommitmentUsage {
  const breakdown: { label: string; units: number }[] = [];

  const activeGoals = goals.filter(g => !g.isPaused);
  if (activeGoals.length > 0) {
    const goalUnits = activeGoals.length * 12;
    breakdown.push({ label: `${activeGoals.length} active goal${activeGoals.length > 1 ? 's' : ''}`, units: goalUnits });
  }

  const activeHabits = habits.filter(h => !h.isPaused);
  const dailyHabits = activeHabits.filter(h => h.schedule === 'Daily');
  const midFreqHabits = activeHabits.filter(h => h.schedule === '3-5x/week');
  const lowFreqHabits = activeHabits.filter(h =>
    h.schedule === '1-2x/week' || (h.schedule !== 'Daily' && h.schedule !== '3-5x/week')
  );

  if (dailyHabits.length > 0) {
    breakdown.push({ label: `${dailyHabits.length} daily habit${dailyHabits.length > 1 ? 's' : ''}`, units: dailyHabits.length * 8 });
  }
  if (midFreqHabits.length > 0) {
    breakdown.push({ label: `${midFreqHabits.length} mid-freq habit${midFreqHabits.length > 1 ? 's' : ''}`, units: midFreqHabits.length * 6 });
  }
  if (lowFreqHabits.length > 0) {
    breakdown.push({ label: `${lowFreqHabits.length} low-freq habit${lowFreqHabits.length > 1 ? 's' : ''}`, units: lowFreqHabits.length * 4 });
  }

  const keystoneHabits = activeHabits.filter(h => h.isKeystone);
  if (keystoneHabits.length > 0) {
    breakdown.push({ label: `${keystoneHabits.length} keystone bonus`, units: keystoneHabits.length * 3 });
  }

  const cutoff7 = new Date();
  cutoff7.setDate(cutoff7.getDate() - 7);
  const cutoffKey = cutoff7.toLocaleDateString('en-CA');
  const recentFriction = frictionEvents.filter(e => e.dateKey >= cutoffKey);
  const frictionCounts: Record<string, number> = {};
  for (const e of recentFriction) {
    const key = `${e.entityType}:${e.entityId}`;
    frictionCounts[key] = (frictionCounts[key] ?? 0) + 1;
  }
  const highFrictionCount = Object.values(frictionCounts).filter(c => c >= 2).length;
  if (highFrictionCount > 0) {
    breakdown.push({ label: `${highFrictionCount} high-friction item${highFrictionCount > 1 ? 's' : ''}`, units: highFrictionCount * 2 });
  }

  const today = new Date().toLocaleDateString('en-CA');
  const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today);
  if (overdueTasks.length > 3) {
    breakdown.push({ label: `Overdue backlog (${overdueTasks.length} tasks)`, units: 5 });
  }

  const totalUsed = breakdown.reduce((sum, b) => sum + b.units, 0);

  return { totalUsed, breakdown };
}

export function getOverloadSuggestions(habits: Habit[], goals: Goal[]): OverloadSuggestion[] {
  const suggestions: OverloadSuggestion[] = [];

  const activeHabits = habits.filter(h => !h.isPaused);
  const nonKeystoneDaily = activeHabits.filter(h => !h.isKeystone && h.schedule === 'Daily');
  for (const h of nonKeystoneDaily.slice(0, 2)) {
    suggestions.push({
      type: 'pause-habit',
      label: `Pause "${h.title}"`,
      action: `Pausing this non-keystone daily habit frees up 8 units of capacity.`,
      entityId: h.id,
    });
  }

  const dailyNonKeystone = activeHabits.filter(h => !h.isKeystone && h.schedule === 'Daily');
  for (const h of dailyNonKeystone.slice(0, 1)) {
    if (!suggestions.find(s => s.entityId === h.id && s.type === 'reduce-frequency')) {
      suggestions.push({
        type: 'reduce-frequency',
        label: `Reduce "${h.title}" to 3-5x/week`,
        action: `Lowering frequency saves 2 units while keeping the habit alive.`,
        entityId: h.id,
      });
    }
  }

  const nonMicroHabits = activeHabits.filter(h => !h.isMicro && h.fallback);
  for (const h of nonMicroHabits.slice(0, 1)) {
    suggestions.push({
      type: 'minimum-version',
      label: `Use minimum version of "${h.title}"`,
      action: `Switch to the fallback version to maintain your streak with less effort.`,
      entityId: h.id,
    });
  }

  const activeGoals = goals.filter(g => !g.isPaused);
  if (activeGoals.length > 2) {
    const pauseCandidate = activeGoals.find(g => {
      const linkedHabits = habits.filter(h => h.goalId === g.id && !h.isPaused);
      return linkedHabits.length === 0;
    }) || activeGoals[activeGoals.length - 1];

    suggestions.push({
      type: 'pause-goal',
      label: `Move "${pauseCandidate.title}" to Later`,
      action: `Pausing this goal frees up 12 units. You can resume it when capacity returns.`,
      entityId: pauseCandidate.id,
    });
  }

  return suggestions;
}

export function isOverloaded(used: number, budget: number): boolean {
  return used > budget;
}
