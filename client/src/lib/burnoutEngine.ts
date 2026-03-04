import type { CompletionLog, DailyRhythm, FrictionEvent, WeeklyCheckIn, Task, Habit } from '@/store/useStore';
import type { SeasonMode } from '@/lib/seasonEngine';

export type BurnoutRisk = 'Low' | 'Watch' | 'High';

export interface BurnoutAction {
  type: 'switch-season' | 'lower-task-target' | 'minimum-version-defaults' | 'silence-mode';
  label: string;
  description: string;
}

export interface BurnoutResult {
  risk: BurnoutRisk;
  signals: string[];
  actions: BurnoutAction[];
}

interface BurnoutInput {
  logs: CompletionLog[];
  dailyRhythms: Record<string, DailyRhythm>;
  frictionEvents: FrictionEvent[];
  weeklyCheckIns: WeeklyCheckIn[];
  tasks: Task[];
  habits: Habit[];
  seasonMode: SeasonMode;
  graceDaysPerWeek: number;
  graceDaysUsedThisWeek: number;
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

export function computeBurnoutRisk(input: BurnoutInput): BurnoutResult {
  const { logs, dailyRhythms, frictionEvents, weeklyCheckIns, tasks, habits, seasonMode, graceDaysPerWeek, graceDaysUsedThisWeek } = input;
  let riskScore = 0;
  const signals: string[] = [];

  const last7 = getLast7Dates();
  const last7Set = new Set(last7);

  const recentLogs = logs.filter(l => last7Set.has(l.date));
  const rhythmDays = last7.filter(d => dailyRhythms[d]).map(d => dailyRhythms[d]);

  if (rhythmDays.length >= 3) {
    const completedCount = recentLogs.filter(l => l.status === 'completed').length;
    const avgEnergy = rhythmDays.reduce((s, r) => s + r.energy, 0) / rhythmDays.length;
    const recoverDays = rhythmDays.filter(r => r.capacity === 'Recover').length;

    if (completedCount > 15 && avgEnergy <= 2.5) {
      riskScore += 3;
      signals.push('High completion output despite low energy — pushing through without recovery');
    } else if (completedCount > 10 && recoverDays === 0 && avgEnergy <= 3) {
      riskScore += 2;
      signals.push('Sustained output with no recovery days and moderate-low energy');
    }

    const energies = last7.map(d => dailyRhythms[d]?.energy).filter((e): e is number => e !== undefined);
    if (energies.length >= 4) {
      const mid = Math.floor(energies.length / 2);
      const recentDays = energies.slice(0, mid);
      const olderDays = energies.slice(mid);
      const avgRecent = recentDays.reduce((s, e) => s + e, 0) / recentDays.length;
      const avgOlder = olderDays.reduce((s, e) => s + e, 0) / olderDays.length;
      if (avgRecent < avgOlder - 0.8) {
        riskScore += 2;
        signals.push('Energy trending downward over the past week');
      }
    }

    const stressDays = rhythmDays.filter(r =>
      r.mood && (r.mood.toLowerCase().includes('stress') || r.mood.toLowerCase().includes('anxious') || r.mood.toLowerCase().includes('overwhelm'))
    ).length;
    if (stressDays >= 3) {
      riskScore += 2;
      signals.push(`${stressDays} days of stress/anxiety signals this week`);
    }
  }

  const cutoff7 = last7[last7.length - 1];
  const recentFriction = frictionEvents.filter(e => e.dateKey >= cutoff7);
  const today = new Date().toLocaleDateString('en-CA');
  const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today);

  if (recentFriction.length >= 5 && overdueTasks.length >= 5) {
    riskScore += 2;
    signals.push('Rising friction and growing overdue backlog — system strain increasing');
  } else if (recentFriction.length >= 3 && overdueTasks.length >= 3) {
    riskScore += 1;
    signals.push('Friction and overdue tasks both accumulating');
  }

  const recentCheckIns = weeklyCheckIns
    .filter(c => last7Set.has(c.date))
    .sort((a, b) => b.date.localeCompare(a.date));
  if (recentCheckIns.length > 0) {
    const overloadCheckIns = recentCheckIns.filter(c => c.capacity <= 2);
    if (overloadCheckIns.length >= 2) {
      riskScore += 2;
      signals.push('Multiple check-ins report low capacity — repeated overload pattern');
    } else if (overloadCheckIns.length === 1) {
      riskScore += 1;
      signals.push('Recent check-in flagged low capacity');
    }
  }

  if (seasonMode === 'Sprint' || seasonMode === 'Leadership Peak' || seasonMode === 'Focus Sprint') {
    riskScore += 1;
    signals.push(`${seasonMode} season elevates burnout risk`);
  }

  if (seasonMode === 'Healing') {
    riskScore -= 1;
    if (riskScore < 0) riskScore = 0;
    signals.push('Healing season — system is in protective mode');
  }

  if (graceDaysUsedThisWeek >= graceDaysPerWeek && graceDaysPerWeek > 0) {
    riskScore += 1;
    signals.push('All grace days consumed — no buffer remaining');
  }

  let risk: BurnoutRisk;
  if (riskScore >= 6) {
    risk = 'High';
  } else if (riskScore >= 3) {
    risk = 'Watch';
  } else {
    risk = 'Low';
  }

  const actions: BurnoutAction[] = [];

  if (risk === 'High') {
    if (seasonMode !== 'Recover') {
      actions.push({
        type: 'switch-season',
        label: 'Switch to Recover season',
        description: 'Reduce expectations across the board and focus on restoring energy. Your system needs rest, not output.',
      });
    }
    actions.push({
      type: 'lower-task-target',
      label: 'Lower daily task target',
      description: 'Temporarily reduce your daily task target to 2 to create breathing room.',
    });
    actions.push({
      type: 'minimum-version-defaults',
      label: 'Set all habits to Minimum Version',
      description: 'Switch to fallback versions for all habits to maintain streaks without energy drain.',
    });
    actions.push({
      type: 'silence-mode',
      label: 'Enable silence mode',
      description: 'Show only your top 3 habits and keystone habits. Everything else is hidden until you recover.',
    });
  } else if (risk === 'Watch') {
    if (seasonMode === 'Sprint' || seasonMode === 'Build' || seasonMode === 'Leadership Peak' || seasonMode === 'Focus Sprint') {
      actions.push({
        type: 'switch-season',
        label: 'Switch to Stabilize season',
        description: 'Ease into maintenance mode to prevent burnout from escalating.',
      });
    }
    actions.push({
      type: 'lower-task-target',
      label: 'Lower daily task target',
      description: 'Reduce your daily task target by 1-2 tasks to create margin.',
    });
    actions.push({
      type: 'minimum-version-defaults',
      label: 'Use Minimum Versions on low-energy days',
      description: 'Default to fallback habit versions when energy is 2 or below.',
    });
  }

  return { risk, signals, actions };
}
