import type { Goal, Habit, Task, CompletionLog, DailyRhythm, FrictionEvent, Identity } from '@/store/useStore';
import type { SeasonMode } from '@/lib/seasonEngine';

export type DirectionalMomentum = '↑' | '↓' | '→';
export type SystemStability = 'Stable' | 'Pressured' | 'Fragile';
export type RiskOutlook = 'Clear' | 'Watch' | 'Elevated';

export interface TrajectoryResult {
  direction: string;
  tailwinds: string[];
  headwinds: string[];
  corrections: TrajectoryCorrection[];
  momentum: DirectionalMomentum;
  stability: SystemStability;
  riskOutlook: RiskOutlook;
  domainMisalignment: number;
}

export interface TrajectoryCorrection {
  id: string;
  label: string;
  description: string;
  actionType: 'pause-habit' | 'schedule-reset' | 'minimum-version' | 'adjust-constraints' | 'prioritize-keystone' | 'switch-season';
  entityId?: string;
}

function getDateKey(d: Date): string {
  return d.toLocaleDateString('en-CA');
}

function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return getDateKey(d);
  });
}

function last14Days(): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return getDateKey(d);
  });
}

export function computeTrajectory({
  habits,
  goals,
  tasks,
  logs,
  dailyRhythms,
  frictionEvents,
  identities,
  seasonMode,
  driftAlertCount,
}: {
  habits: Habit[];
  goals: Goal[];
  tasks: Task[];
  logs: CompletionLog[];
  dailyRhythms: Record<string, DailyRhythm>;
  frictionEvents: FrictionEvent[];
  identities: Identity[];
  seasonMode: SeasonMode;
  driftAlertCount: number;
}): TrajectoryResult {
  const last7 = last7Days();
  const last14 = last14Days();
  const activeHabits = habits.filter(h => !h.isPaused);
  const activeGoals = goals.filter(g => !g.isPaused);
  const today = getDateKey(new Date());
  const overdue = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today);

  const recentLogs7 = logs.filter(l => last7.includes(l.date));
  const completions7 = recentLogs7.filter(l => l.status === 'completed' || l.status === 'micro').length;
  const skips7 = recentLogs7.filter(l => l.status === 'skipped').length;
  const total7 = completions7 + skips7;
  const completionRate7 = total7 > 0 ? completions7 / total7 : 0;

  const recentLogs14 = logs.filter(l => last14.includes(l.date));
  const first7Logs = recentLogs14.filter(l => !last7.includes(l.date));
  const first7Completions = first7Logs.filter(l => l.status === 'completed' || l.status === 'micro').length;
  const first7Total = first7Completions + first7Logs.filter(l => l.status === 'skipped').length;
  const completionRateWeek1 = first7Total > 0 ? first7Completions / first7Total : 0;

  const momentumTrend = completionRate7 - completionRateWeek1;

  const energyValues = last7.map(d => dailyRhythms[d]?.energy).filter((e): e is number => e != null);
  const avgEnergy = energyValues.length > 0 ? energyValues.reduce((a, b) => a + b, 0) / energyValues.length : 3;

  const recentFriction = frictionEvents.filter(f => last7.includes(f.dateKey));
  const frictionDensity = recentFriction.length;

  const keystoneHabits = activeHabits.filter(h => h.isKeystone);
  const keystoneCompletions = keystoneHabits.length > 0
    ? keystoneHabits.filter(h => recentLogs7.some(l => l.refId === h.id && (l.status === 'completed' || l.status === 'micro'))).length / keystoneHabits.length
    : 0;

  const tailwinds: string[] = [];
  const headwinds: string[] = [];

  if (completionRate7 >= 0.75) tailwinds.push(`Strong follow-through: ${Math.round(completionRate7 * 100)}% completion this week`);
  else if (completionRate7 < 0.5 && total7 > 0) headwinds.push(`Low follow-through: only ${Math.round(completionRate7 * 100)}% completion this week`);

  if (momentumTrend > 0.1) tailwinds.push('Momentum is building — better than last week');
  else if (momentumTrend < -0.1) headwinds.push('Momentum is slipping — completion rate dropped from last week');

  if (keystoneCompletions >= 0.8 && keystoneHabits.length > 0) tailwinds.push('Keystone habits are holding strong');
  else if (keystoneCompletions < 0.5 && keystoneHabits.length > 0) headwinds.push('Keystone habits are inconsistent — this destabilizes the system');

  if (avgEnergy >= 3.5) tailwinds.push('Energy levels are solid');
  else if (avgEnergy < 2.5) headwinds.push('Low energy trend — consider switching to Recover or Stabilize');

  if (frictionDensity === 0 && activeHabits.length > 0) tailwinds.push('No friction events logged — smooth operations');
  else if (frictionDensity >= 5) headwinds.push(`High friction: ${frictionDensity} friction events this week`);

  if (overdue.length >= 5) headwinds.push(`Backlog growing: ${overdue.length} overdue tasks`);
  else if (overdue.length === 0 && tasks.length > 0) tailwinds.push('Task backlog clear — no overdue items');

  if (driftAlertCount >= 3) headwinds.push(`${driftAlertCount} drift alerts — actions diverging from identity`);
  else if (driftAlertCount === 0 && identities.length > 0) tailwinds.push('No drift — actions align with identity');

  let direction = '';
  if (tailwinds.length >= 3 && headwinds.length <= 1) {
    direction = 'Your system is trending strong. Momentum, consistency, and energy are aligned. Keep protecting what\'s working.';
  } else if (headwinds.length >= 3 && tailwinds.length <= 1) {
    direction = 'Your system is under strain. Multiple signals suggest it\'s time to simplify, reduce scope, or shift to a recovery season.';
  } else if (momentumTrend > 0) {
    direction = 'You\'re rebuilding momentum. Some areas need attention, but the trend is positive. Focus on protecting your keystones.';
  } else if (momentumTrend < -0.05) {
    direction = 'Momentum is fading. Consider a scope reduction or season shift before friction compounds.';
  } else {
    direction = 'Your system is steady. No major shifts needed, but watch for early drift signals and protect your focus domains.';
  }

  const momentum: DirectionalMomentum = momentumTrend > 0.1 ? '↑' : momentumTrend < -0.1 ? '↓' : '→';

  const stabilityScore = headwinds.length * 2 - tailwinds.length;
  const stability: SystemStability = stabilityScore >= 4 ? 'Fragile' : stabilityScore >= 2 ? 'Pressured' : 'Stable';

  const riskOutlook: RiskOutlook = (headwinds.length >= 3 || (frictionDensity >= 5 && overdue.length >= 5)) ? 'Elevated'
    : (headwinds.length >= 2 || frictionDensity >= 3 || overdue.length >= 3) ? 'Watch' : 'Clear';

  const domainCounts: Record<string, number> = {};
  const domainActive: Record<string, number> = {};
  for (const h of activeHabits) {
    if (h.domain) {
      domainActive[h.domain] = (domainActive[h.domain] ?? 0) + 1;
      const completions = recentLogs7.filter(l => l.refId === h.id && (l.status === 'completed' || l.status === 'micro')).length;
      domainCounts[h.domain] = (domainCounts[h.domain] ?? 0) + completions;
    }
  }
  for (const g of activeGoals) {
    if (g.domain) {
      domainActive[g.domain] = (domainActive[g.domain] ?? 0) + 1;
    }
  }
  const activeDomainKeys = Object.keys(domainActive);
  let domainMisalignment = 0;
  if (activeDomainKeys.length >= 2) {
    const domainRates = activeDomainKeys.map(d => {
      const active = domainActive[d] || 1;
      const completions = domainCounts[d] || 0;
      return completions / (active * 7);
    });
    const maxRate = Math.max(...domainRates);
    const minRate = Math.min(...domainRates);
    domainMisalignment = maxRate > 0 ? Math.round(((maxRate - minRate) / maxRate) * 100) : 0;
  }

  const corrections: TrajectoryCorrection[] = [];

  if (frictionDensity >= 3) {
    const highFrictionHabit = activeHabits.find(h => recentFriction.some(f => f.entityId === h.id));
    if (highFrictionHabit) {
      corrections.push({
        id: 'pause-friction-habit',
        label: `Pause "${highFrictionHabit.title}"`,
        description: 'This habit is generating repeated friction. Pause it to reduce drag.',
        actionType: 'pause-habit',
        entityId: highFrictionHabit.id,
      });
    }
  }

  if (headwinds.length >= 2 && seasonMode !== 'Recover' && seasonMode !== 'Stabilize' && seasonMode !== 'Healing' && seasonMode !== 'Transition') {
    corrections.push({
      id: 'switch-season',
      label: seasonMode === 'Leadership Peak' || seasonMode === 'Sprint' || seasonMode === 'Focus Sprint' ? 'Switch to Stabilize' : 'Switch to Recover',
      description: 'Multiple headwinds suggest operating at a lower intensity would help you recover traction.',
      actionType: 'switch-season',
    });
  }

  if (overdue.length >= 3) {
    corrections.push({
      id: 'schedule-reset',
      label: 'Schedule a reset',
      description: 'Clear the backlog with a focused triage session. Defer or drop what doesn\'t serve your intent.',
      actionType: 'schedule-reset',
    });
  }

  const nonKeystones = activeHabits.filter(h => !h.isKeystone);
  if (nonKeystones.length > 3 && completionRate7 < 0.6) {
    corrections.push({
      id: 'minimum-version',
      label: 'Switch to minimum versions',
      description: 'Reduce all non-keystone habits to their Plan B (minimum version) to protect bandwidth.',
      actionType: 'minimum-version',
    });
  }

  if (keystoneCompletions < 0.5 && keystoneHabits.length > 0) {
    corrections.push({
      id: 'prioritize-keystone',
      label: 'Prioritize keystone habits',
      description: 'Your keystone habits are dropping. These create the most leverage — protect them first.',
      actionType: 'prioritize-keystone',
    });
  }

  return {
    direction,
    tailwinds: tailwinds.slice(0, 3),
    headwinds: headwinds.slice(0, 3),
    corrections: corrections.slice(0, 3),
    momentum,
    stability,
    riskOutlook,
    domainMisalignment,
  };
}
