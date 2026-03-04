import type { SeasonMode } from '@/lib/seasonEngine';
import { getSeasonDefaults } from '@/lib/seasonEngine';
import type {
  CompletionLog,
  DailyRhythm,
  FrictionEvent,
  Habit,
  Task,
  WeeklyCheckIn,
  Goal,
  Identity,
} from '@/store/useStore';

export type ForecastOutlook = 'Stable' | 'Risk of overload' | 'Recovery needed';

export interface ForecastSignal {
  label: string;
  direction: 'positive' | 'negative' | 'neutral';
}

export type ForecastActionType =
  | 'reduce-active-goals'
  | 'sunday-reset-early'
  | 'increase-grace'
  | 'focus-mode'
  | 'minimum-version';

export interface ForecastAction {
  type: ForecastActionType;
  label: string;
  description: string;
}

export interface WeeklyForecast {
  outlook: ForecastOutlook;
  confidence: number;
  signals: ForecastSignal[];
  actions: ForecastAction[];
}

interface ForecastStore {
  logs: CompletionLog[];
  dailyRhythms: Record<string, DailyRhythm>;
  frictionEvents: FrictionEvent[];
  weeklyCheckIns: WeeklyCheckIn[];
  habits: Habit[];
  tasks: Task[];
  goals: Goal[];
  identities: Identity[];
  seasonMode: SeasonMode;
  graceDaysPerWeek: number;
  graceDaysUsedThisWeek: number;
  strategicIntent?: string;
}

function getLast7Dates(): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString('en-CA'));
  }
  return dates;
}

export function computeWeeklyForecast(store: ForecastStore): WeeklyForecast {
  const signals: ForecastSignal[] = [];
  let riskScore = 0;
  let dataPoints = 0;

  const last7 = getLast7Dates();
  const last7Set = new Set(last7);

  const recentLogs = store.logs.filter(l => last7Set.has(l.date));

  const rhythmDays = last7.filter(d => store.dailyRhythms[d]).map(d => store.dailyRhythms[d]);
  if (rhythmDays.length > 0) {
    dataPoints++;
    const avgEnergy = rhythmDays.reduce((sum, r) => sum + r.energy, 0) / rhythmDays.length;
    if (avgEnergy <= 2) {
      riskScore += 3;
      signals.push({ label: `Low average energy (${avgEnergy.toFixed(1)}/5) this week`, direction: 'negative' });
    } else if (avgEnergy >= 4) {
      riskScore -= 1;
      signals.push({ label: `Strong energy levels (${avgEnergy.toFixed(1)}/5)`, direction: 'positive' });
    } else {
      signals.push({ label: `Moderate energy (${avgEnergy.toFixed(1)}/5)`, direction: 'neutral' });
    }

    const recoverDays = rhythmDays.filter(r => r.capacity === 'Recover').length;
    if (recoverDays >= 4) {
      riskScore += 2;
      signals.push({ label: `${recoverDays} recovery days this week`, direction: 'negative' });
    }
  }

  const today = new Date().toLocaleDateString('en-CA');
  const overdueTasks = store.tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today);
  if (overdueTasks.length > 0) {
    dataPoints++;
    if (overdueTasks.length >= 8) {
      riskScore += 3;
      signals.push({ label: `${overdueTasks.length} overdue tasks — backlog is heavy`, direction: 'negative' });
    } else if (overdueTasks.length >= 4) {
      riskScore += 2;
      signals.push({ label: `${overdueTasks.length} overdue tasks building up`, direction: 'negative' });
    } else {
      riskScore += 1;
      signals.push({ label: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} — manageable`, direction: 'neutral' });
    }
  }

  const cutoff14 = new Date();
  cutoff14.setDate(cutoff14.getDate() - 14);
  const cutoffKey14 = cutoff14.toLocaleDateString('en-CA');
  const recentFriction = store.frictionEvents.filter(e => e.dateKey >= cutoffKey14);
  if (recentFriction.length > 0) {
    dataPoints++;
    const frictionPerDay = recentFriction.length / 14;
    if (frictionPerDay >= 1) {
      riskScore += 2;
      signals.push({ label: `High friction frequency (${recentFriction.length} events in 14 days)`, direction: 'negative' });
    } else if (recentFriction.length >= 4) {
      riskScore += 1;
      signals.push({ label: `${recentFriction.length} friction events recently`, direction: 'neutral' });
    }
  }

  const completedLogs = recentLogs.filter(l => l.status === 'completed' || l.status === 'micro');
  const skippedLogs = recentLogs.filter(l => l.status === 'skipped');
  if (completedLogs.length + skippedLogs.length > 0) {
    dataPoints++;
    const completionRate = completedLogs.length / (completedLogs.length + skippedLogs.length);
    if (completionRate >= 0.8) {
      riskScore -= 1;
      signals.push({ label: `Strong completion rate (${Math.round(completionRate * 100)}%)`, direction: 'positive' });
    } else if (completionRate < 0.5) {
      riskScore += 2;
      signals.push({ label: `Low completion rate (${Math.round(completionRate * 100)}%)`, direction: 'negative' });
    } else {
      signals.push({ label: `Completion rate at ${Math.round(completionRate * 100)}%`, direction: 'neutral' });
    }
  }

  const seasonConfig = getSeasonDefaults(store.seasonMode);
  dataPoints++;
  if (store.seasonMode === 'Sprint' || store.seasonMode === 'Leadership Peak' || store.seasonMode === 'Focus Sprint') {
    riskScore += 1;
    signals.push({ label: `${store.seasonMode} season — elevated burnout risk`, direction: 'neutral' });
  } else if (store.seasonMode === 'Recover' || store.seasonMode === 'Healing') {
    riskScore -= 1;
    signals.push({ label: `${store.seasonMode} season — lighter expectations`, direction: 'positive' });
  } else if (store.seasonMode === 'Transition') {
    signals.push({ label: `Transition season — routines may be disrupted`, direction: 'neutral' });
  } else if (store.seasonMode === 'Exploration') {
    signals.push({ label: `Exploration season — experimentation expected`, direction: 'neutral' });
  } else if (store.seasonMode === 'Maintenance') {
    signals.push({ label: `Maintenance season — steady state`, direction: 'positive' });
  }

  if (store.graceDaysUsedThisWeek >= store.graceDaysPerWeek) {
    riskScore += 1;
    signals.push({ label: `Grace days fully used (${store.graceDaysUsedThisWeek}/${store.graceDaysPerWeek})`, direction: 'negative' });
  }

  const activeIds = store.identities.filter(i => i.isActive);
  if (activeIds.length > 0) {
    const identitiesWithGoals = activeIds.filter(id =>
      store.goals.some(g => g.identityId === id.id && !g.isPaused)
    );
    const disconnectedIdentities = activeIds.filter(id =>
      !store.goals.some(g => g.identityId === id.id && !g.isPaused) &&
      id.statement
    );

    if (identitiesWithGoals.length > 0) {
      let totalLinkedCompletions = 0;
      for (const id of identitiesWithGoals) {
        const goalIds = new Set(store.goals.filter(g => g.identityId === id.id && !g.isPaused).map(g => g.id));
        const linkedItemIds = new Set([
          ...store.habits.filter(h => h.goalId && goalIds.has(h.goalId)).map(h => h.id),
          ...store.tasks.filter(t => t.goalId && goalIds.has(t.goalId)).map(t => t.id),
        ]);
        totalLinkedCompletions += recentLogs.filter(l =>
          linkedItemIds.has(l.refId) && (l.status === 'completed' || l.status === 'micro')
        ).length;
      }
      if (totalLinkedCompletions === 0 && identitiesWithGoals.length > 0) {
        dataPoints++;
        riskScore += 1;
        signals.push({ label: `No identity-linked goal activity this week`, direction: 'negative' });
      }
    }

    if (disconnectedIdentities.length > 0) {
      signals.push({ label: `${disconnectedIdentities.length} identit${disconnectedIdentities.length > 1 ? 'ies' : 'y'} without linked goals`, direction: 'neutral' });
    }
  }

  const recentCheckIns = store.weeklyCheckIns
    .filter(c => last7Set.has(c.date))
    .sort((a, b) => b.date.localeCompare(a.date));
  if (recentCheckIns.length > 0) {
    dataPoints++;
    const latest = recentCheckIns[0];
    if (latest.capacity <= 2) {
      riskScore += 2;
      signals.push({ label: `Weekly check-in: low capacity (${latest.capacity}/5)`, direction: 'negative' });
    } else if (latest.capacity >= 4) {
      riskScore -= 1;
      signals.push({ label: `Weekly check-in: high capacity (${latest.capacity}/5)`, direction: 'positive' });
    }
  }

  let outlook: ForecastOutlook;
  if (riskScore >= 5) {
    outlook = 'Recovery needed';
  } else if (riskScore >= 2) {
    outlook = 'Risk of overload';
  } else {
    outlook = 'Stable';
  }

  const confidence = Math.min(100, Math.max(20, dataPoints * 15 + 10));

  const actions: ForecastAction[] = [];

  if (outlook === 'Recovery needed') {
    actions.push({
      type: 'increase-grace',
      label: 'Increase grace days',
      description: `Temporarily raise grace allowance to ${Math.min(7, seasonConfig.graceDays + 2)} days to reduce pressure.`,
    });
    actions.push({
      type: 'minimum-version',
      label: 'Switch habits to Minimum Version',
      description: 'Use fallback versions of your habits to maintain streaks without draining energy.',
    });
    if (store.goals.filter(g => !g.isPaused).length > 2) {
      actions.push({
        type: 'reduce-active-goals',
        label: 'Reduce active goals',
        description: 'Pause non-essential goals to free up capacity for recovery.',
      });
    }
  }

  if (outlook === 'Risk of overload') {
    actions.push({
      type: 'focus-mode',
      label: 'Enable focus mode',
      description: 'Narrow your daily view to keystone habits and high-priority tasks only.',
    });
    actions.push({
      type: 'sunday-reset-early',
      label: 'Run Sunday Reset early',
      description: 'Do a mid-week reset to re-prioritize and clear mental clutter.',
    });
    if (overdueTasks.length >= 4) {
      actions.push({
        type: 'reduce-active-goals',
        label: 'Reduce active goals',
        description: 'Too many commitments may be causing overload. Consider pausing a goal.',
      });
    }
  }

  if (outlook === 'Stable' && actions.length === 0) {
    if (store.seasonMode === 'Sprint' || store.seasonMode === 'Focus Sprint' || store.seasonMode === 'Leadership Peak') {
      actions.push({
        type: 'focus-mode',
        label: 'Stay in focus mode',
        description: `You're stable during ${store.seasonMode} — keep momentum by staying focused on priorities.`,
      });
    }
  }

  return { outlook, confidence, signals, actions };
}
