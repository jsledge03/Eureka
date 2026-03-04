import type { Habit, CompletionLog, Task, DailyRhythm, Goal, Identity } from '@/store/useStore';

export type GravityLabel = 'High leverage' | 'Medium' | 'Low';

export interface GravityScore {
  score: number;
  label: GravityLabel;
}

export type GravityMap = Map<string, GravityScore>;

function getDateKey(d: Date): string {
  return d.toLocaleDateString('en-CA');
}

function getLast28DayKeys(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 0; i < 28; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    keys.push(getDateKey(d));
  }
  return keys;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function labelFromScore(score: number): GravityLabel {
  if (score >= 65) return 'High leverage';
  if (score >= 35) return 'Medium';
  return 'Low';
}

export function computeGravityScores(
  habits: Habit[],
  logs: CompletionLog[],
  tasks: Task[],
  dailyRhythms: Record<string, DailyRhythm>,
  goals?: Goal[],
  identities?: Identity[],
): GravityMap {
  const result: GravityMap = new Map();
  const last28 = getLast28DayKeys();
  const last28Set = new Set(last28);

  const logsByDate = new Map<string, CompletionLog[]>();
  for (const log of logs) {
    if (!last28Set.has(log.date)) continue;
    const existing = logsByDate.get(log.date);
    if (existing) existing.push(log);
    else logsByDate.set(log.date, [log]);
  }

  const activeHabits = habits.filter(h => !h.isPaused);

  for (const habit of activeHabits) {
    const completionDays: string[] = [];
    const nonCompletionDays: string[] = [];

    for (const dateKey of last28) {
      const dayLogs = logsByDate.get(dateKey) ?? [];
      const habitLog = dayLogs.find(l => l.refId === habit.id && l.type === 'habit');
      if (habitLog && (habitLog.status === 'completed' || habitLog.status === 'micro')) {
        completionDays.push(dateKey);
      } else {
        nonCompletionDays.push(dateKey);
      }
    }

    const minDataPoints = habit.isKeystone ? 2 : 4;
    if (completionDays.length < minDataPoints) {
      result.set(habit.id, { score: habit.isKeystone ? 30 : 0, label: habit.isKeystone ? 'Medium' : 'Low' });
      continue;
    }

    const completionEnergies = completionDays
      .map(d => dailyRhythms[d]?.energy)
      .filter((e): e is number => e !== undefined);
    const nonCompletionEnergies = nonCompletionDays
      .map(d => dailyRhythms[d]?.energy)
      .filter((e): e is number => e !== undefined);

    let rhythmLift = 0;
    if (completionEnergies.length > 0 && nonCompletionEnergies.length > 0) {
      const avgOn = mean(completionEnergies);
      const avgOff = mean(nonCompletionEnergies);
      const diff = avgOn - avgOff;
      rhythmLift = Math.min(30, Math.max(0, Math.round((diff + 2) * 7.5)));
    } else {
      rhythmLift = 15;
    }

    const completionDaySet = new Set(completionDays);
    const otherCompletedOnDays = completionDays.map(d => {
      const dayLogs = logsByDate.get(d) ?? [];
      return dayLogs.filter(l =>
        l.refId !== habit.id &&
        (l.status === 'completed' || l.status === 'micro')
      ).length;
    });
    const otherCompletedOffDays = nonCompletionDays
      .filter(d => logsByDate.has(d))
      .map(d => {
        const dayLogs = logsByDate.get(d) ?? [];
        return dayLogs.filter(l =>
          l.status === 'completed' || l.status === 'micro'
        ).length;
      });

    let cascadeEffect = 0;
    if (otherCompletedOnDays.length > 0 && otherCompletedOffDays.length > 0) {
      const avgOnOther = mean(otherCompletedOnDays);
      const avgOffOther = mean(otherCompletedOffDays);
      const diff = avgOnOther - avgOffOther;
      cascadeEffect = Math.min(30, Math.max(0, Math.round(diff * 10 + 15)));
    } else {
      cascadeEffect = 15;
    }

    let alignmentBonus = 0;
    if (habit.isKeystone) alignmentBonus += 15;
    if (habit.goalId) {
      const linkedTasks = tasks.filter(t => t.goalId === habit.goalId && !t.completed);
      if (linkedTasks.length > 0) alignmentBonus += 5;
      if (goals && identities) {
        const goal = goals.find(g => g.id === habit.goalId);
        if (goal?.identityId && identities.some(i => i.id === goal.identityId && i.isActive)) {
          alignmentBonus += 10;
        }
      }
    }
    if (habit.domain) alignmentBonus += 5;
    alignmentBonus = Math.min(30, alignmentBonus);

    const consistencyRate = completionDays.length / 28;
    const consistencyScore = Math.min(15, Math.round(consistencyRate * 15));

    const rawScore = rhythmLift + cascadeEffect + alignmentBonus + consistencyScore;
    const score = Math.min(100, Math.max(0, rawScore));

    result.set(habit.id, { score, label: labelFromScore(score) });
  }

  return result;
}
