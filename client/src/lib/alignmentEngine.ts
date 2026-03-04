import type { Identity, Goal, Habit, Task, CompletionLog, DailyRhythm, QuarterPlan } from '@/store/useStore';

export interface AlignmentBreakdown {
  total: number;
  intentionality: number;
  congruentAction: number;
  integrityUnderConstraints: number;
  reflection: number;
}

interface StoreSnapshot {
  identities: Identity[];
  goals: Goal[];
  habits: Habit[];
  tasks: Task[];
  logs: CompletionLog[];
  dailyRhythms: Record<string, DailyRhythm>;
  quarterPlans: QuarterPlan[];
  currentQuarterKey: string;
}

function getToday(): string {
  return new Date().toLocaleDateString('en-CA');
}

function getWeekDates(weeksAgo = 0): string[] {
  const dates: string[] = [];
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek - (weeksAgo * 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    dates.push(d.toLocaleDateString('en-CA'));
  }
  return dates;
}

function getCurrentPlan(store: StoreSnapshot): QuarterPlan | undefined {
  const [y, qStr] = store.currentQuarterKey.split('-Q');
  return store.quarterPlans.find(p => p.year === parseInt(y) && p.quarter === parseInt(qStr));
}

export function computeDailyAlignment(date: string, store: StoreSnapshot): AlignmentBreakdown {
  const rhythm = store.dailyRhythms[date];
  const logsForDay = store.logs.filter(l => l.date === date);
  const plan = getCurrentPlan(store);

  let intentionality = 0;
  if (rhythm?.topOutcomes && rhythm.topOutcomes.length > 0) intentionality += 10;
  if (plan?.focusDomains && plan.focusDomains.length > 0) intentionality += 10;

  const completedHabitIds = logsForDay.filter(l => l.type === 'habit' && (l.status === 'completed' || l.status === 'micro')).map(l => l.refId);
  const completedTaskIds = logsForDay.filter(l => l.type === 'task' && l.status === 'completed').map(l => l.refId);
  const tasksCompletedToday = store.tasks.filter(t => completedTaskIds.includes(t.id));
  const habitsCompletedToday = store.habits.filter(h => completedHabitIds.includes(h.id));

  const hasKeystoneHabit = habitsCompletedToday.some(h => h.isKeystone);
  const hasHighPriorityTask = tasksCompletedToday.some(t => t.priority === 'High' || t.priority === 'Critical');
  if (hasKeystoneHabit || hasHighPriorityTask) intentionality += 10;

  const focusDomains = new Set<string>(plan?.focusDomains ?? []);
  const activeGoals = store.goals.filter(g => !g.isPaused);
  const goalIds = new Set(activeGoals.map(g => g.id));

  const identityGoalIds = new Set(
    activeGoals.filter(g => g.identityId && store.identities.some(i => i.id === g.identityId && i.isActive)).map(g => g.id)
  );

  let alignedCount = 0;
  let identityAlignedCount = 0;
  let totalCompleted = completedHabitIds.length + completedTaskIds.length;

  habitsCompletedToday.forEach(h => {
    if (h.goalId && goalIds.has(h.goalId)) {
      alignedCount++;
      if (identityGoalIds.has(h.goalId)) identityAlignedCount++;
      return;
    }
    if (h.domain && focusDomains.has(h.domain)) { alignedCount++; return; }
  });

  tasksCompletedToday.forEach(t => {
    if (t.goalId && goalIds.has(t.goalId)) {
      alignedCount++;
      if (identityGoalIds.has(t.goalId)) identityAlignedCount++;
      return;
    }
    if (t.domain && focusDomains.has(t.domain as string)) { alignedCount++; return; }
    if (t.labels?.some(l => focusDomains.has(l))) { alignedCount++; return; }
    if (!t.labels?.length && t.label && focusDomains.has(t.label as string)) { alignedCount++; return; }
  });

  const identityBonus = identityAlignedCount > 0 ? Math.min(10, identityAlignedCount * 3) : 0;
  const congruentAction = Math.min(40, Math.round(40 * alignedCount / Math.max(1, totalCompleted)) + identityBonus);

  let integrityUnderConstraints = 0;
  const energy = rhythm?.energy ?? 3;
  const capacity = rhythm?.capacity ?? 'Sustain';
  const isConstrained = energy <= 2 || capacity === 'Recover';

  if (isConstrained) {
    const usedMinVersion = logsForDay.some(l => l.status === 'micro');
    const hasAlignedAction = alignedCount > 0;
    if (usedMinVersion && hasAlignedAction) integrityUnderConstraints = 20;
    else if (usedMinVersion || hasAlignedAction) integrityUnderConstraints = 10;
  } else {
    if (totalCompleted > 0 && totalCompleted <= 12) integrityUnderConstraints = 20;
    else if (totalCompleted > 12) integrityUnderConstraints = 10;
    else if (totalCompleted === 0) integrityUnderConstraints = 0;
  }

  let reflection = 0;
  if (rhythm?.reflection) {
    const ref = rhythm.reflection;
    if (ref.wins && ref.friction && ref.lesson) reflection = 10;
    else if (ref.wins || ref.friction || ref.lesson) reflection = 5;
  }

  const total = Math.min(100, intentionality + congruentAction + integrityUnderConstraints + reflection);

  return { total, intentionality, congruentAction, integrityUnderConstraints, reflection };
}

export function computeWeeklyAlignment(store: StoreSnapshot, weeksAgo = 0): { score: number; dailyScores: number[] } {
  const dates = getWeekDates(weeksAgo);
  const dailyScores = dates.map(d => computeDailyAlignment(d, store).total);
  const activeDays = dailyScores.filter(s => s > 0);

  if (activeDays.length === 0) return { score: 0, dailyScores };

  const avgDaily = activeDays.reduce((a, b) => a + b, 0) / activeDays.length;
  const stableDays = dailyScores.filter(s => s > 60).length;
  const evidenceStability = Math.min(1, stableDays / 3);

  const score = Math.round(avgDaily * 0.6 + evidenceStability * 100 * 0.4);
  return { score: Math.min(100, score), dailyScores };
}

export function getWeeklyTrend(store: StoreSnapshot): { current: number; previous: number; direction: 'up' | 'down' | 'stable' } {
  const current = computeWeeklyAlignment(store, 0).score;
  const previous = computeWeeklyAlignment(store, 1).score;

  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (current > previous + 5) direction = 'up';
  else if (current < previous - 5) direction = 'down';

  return { current, previous, direction };
}

export function computeTodayAlignment(store: StoreSnapshot): AlignmentBreakdown {
  return computeDailyAlignment(getToday(), store);
}
