import type { CompletionLog, Habit, Goal, Task } from '@/store/useStore';

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  isActiveToday: boolean;
  milestone: StreakMilestone | null;
}

export interface StreakMilestone {
  days: number;
  label: string;
  emoji: string;
  message: string;
}

const MILESTONES: StreakMilestone[] = [
  { days: 3, label: 'Spark', emoji: '✨', message: 'Three days in! You\'re building momentum.' },
  { days: 7, label: 'Weekly Win', emoji: '🔥', message: 'A full week of consistency. This is where identity shifts begin.' },
  { days: 14, label: 'Fortnight', emoji: '💪', message: 'Two weeks strong. Your brain is starting to rewire.' },
  { days: 21, label: 'Habit Forming', emoji: '🧠', message: '21 days — the classic habit formation threshold. You\'re proving who you are.' },
  { days: 30, label: 'Monthly Legend', emoji: '🏆', message: 'A full month. This isn\'t luck — it\'s identity.' },
  { days: 60, label: 'Two Months', emoji: '⚡', message: '60 days of showing up. You\'ve crossed the automaticity threshold.' },
  { days: 90, label: 'Quarter Master', emoji: '👑', message: '90 days. A full quarter of discipline. This is who you are now.' },
  { days: 100, label: 'Century', emoji: '💎', message: '100 days. Legendary. You\'ve permanently altered your trajectory.' },
  { days: 180, label: 'Half Year', emoji: '🌟', message: '180 days. Half a year of relentless consistency.' },
  { days: 365, label: 'Full Year', emoji: '🎯', message: 'A full year. You\'ve rewritten your story.' },
];

function getDateKey(d: Date): string {
  return d.toLocaleDateString('en-CA');
}

function getPreviousDate(dateKey: string): string {
  const d = new Date(dateKey + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return getDateKey(d);
}

export function computeHabitStreak(
  habitId: string,
  logs: CompletionLog[],
  todayDate: string
): StreakInfo {
  const habitLogs = logs
    .filter(l => l.refId === habitId && l.type === 'habit' && (l.status === 'completed' || l.status === 'micro'))
    .map(l => l.date);

  const completedDates = new Set(habitLogs);

  if (completedDates.size === 0) {
    return { currentStreak: 0, longestStreak: 0, lastCompletedDate: null, isActiveToday: false, milestone: null };
  }

  const isActiveToday = completedDates.has(todayDate);

  let currentStreak = 0;
  let checkDate = isActiveToday ? todayDate : getPreviousDate(todayDate);

  while (completedDates.has(checkDate)) {
    currentStreak++;
    checkDate = getPreviousDate(checkDate);
  }

  const sortedDates = Array.from(completedDates).sort();
  let longestStreak = 1;
  let tempStreak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const expected = getPreviousDate(sortedDates[i]);
    if (expected === sortedDates[i - 1]) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  const milestone = getMilestone(currentStreak);

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastCompletedDate: sortedDates[sortedDates.length - 1],
    isActiveToday,
    milestone,
  };
}

export function computeAllStreaks(
  habits: Habit[],
  logs: CompletionLog[],
  todayDate: string
): Map<string, StreakInfo> {
  const result = new Map<string, StreakInfo>();
  for (const habit of habits) {
    if (!habit.isPaused) {
      result.set(habit.id, computeHabitStreak(habit.id, logs, todayDate));
    }
  }
  return result;
}

export function computeGoalStreak(
  goalId: string,
  tasks: Task[],
  logs: CompletionLog[],
  todayDate: string
): StreakInfo {
  const goalTasks = tasks.filter(t => t.goalId === goalId);
  const goalTaskIds = new Set(goalTasks.map(t => t.id));

  const taskLogs = logs
    .filter(l => l.type === 'task' && goalTaskIds.has(l.refId) && l.status === 'completed')
    .map(l => l.date);

  const completedDates = new Set(taskLogs);

  if (completedDates.size === 0) {
    return { currentStreak: 0, longestStreak: 0, lastCompletedDate: null, isActiveToday: false, milestone: null };
  }

  const isActiveToday = completedDates.has(todayDate);
  let currentStreak = 0;
  let checkDate = isActiveToday ? todayDate : getPreviousDate(todayDate);

  while (completedDates.has(checkDate)) {
    currentStreak++;
    checkDate = getPreviousDate(checkDate);
  }

  const sortedDates = Array.from(completedDates).sort();
  let longestStreak = 1;
  let tempStreak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const expected = getPreviousDate(sortedDates[i]);
    if (expected === sortedDates[i - 1]) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastCompletedDate: sortedDates[sortedDates.length - 1],
    isActiveToday,
    milestone: getMilestone(currentStreak),
  };
}

export function getMilestone(streak: number): StreakMilestone | null {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (streak === MILESTONES[i].days) return MILESTONES[i];
  }
  return null;
}

export function getNextMilestone(streak: number): StreakMilestone | null {
  for (const m of MILESTONES) {
    if (m.days > streak) return m;
  }
  return null;
}

export function getStreakLabel(streak: number): string {
  if (streak === 0) return '';
  if (streak < 3) return `${streak}d`;
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (streak >= MILESTONES[i].days) return `${streak}d ${MILESTONES[i].emoji}`;
  }
  return `${streak}d`;
}

export interface StreakTier {
  level: number;
  name: string;
  color: string;
  bgColor: string;
}

const STREAK_TIERS: StreakTier[] = [
  { level: 0, name: '', color: 'text-muted-foreground', bgColor: 'bg-muted/40' },
  { level: 1, name: 'Spark', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  { level: 2, name: 'Flame', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  { level: 3, name: 'Fire', color: 'text-orange-600', bgColor: 'bg-orange-600/10' },
  { level: 4, name: 'Inferno', color: 'text-red-500', bgColor: 'bg-red-500/10' },
  { level: 5, name: 'Legend', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
];

export function getStreakTier(streak: number): StreakTier {
  if (streak >= 90) return STREAK_TIERS[5];
  if (streak >= 30) return STREAK_TIERS[4];
  if (streak >= 14) return STREAK_TIERS[3];
  if (streak >= 7) return STREAK_TIERS[2];
  if (streak >= 3) return STREAK_TIERS[1];
  return STREAK_TIERS[0];
}

export function getStreakFlame(streak: number): string {
  if (streak >= 90) return '👑';
  if (streak >= 30) return '🏆';
  if (streak >= 14) return '🔥';
  if (streak >= 7) return '🔥';
  if (streak >= 3) return '✨';
  return '';
}

export function getEarnedMilestones(streak: number): StreakMilestone[] {
  return MILESTONES.filter(m => streak >= m.days);
}

export function isNearMilestone(streak: number): { near: boolean; milestone: StreakMilestone | null; daysAway: number } {
  const next = getNextMilestone(streak);
  if (!next) return { near: false, milestone: null, daysAway: 0 };
  const daysAway = next.days - streak;
  return { near: daysAway <= 2 && streak > 0, milestone: next, daysAway };
}

export function isPersonalBest(currentStreak: number, longestStreak: number): boolean {
  return currentStreak > 0 && currentStreak >= longestStreak && longestStreak > 1;
}

export function getTopStreaks(
  habits: Habit[],
  logs: CompletionLog[],
  todayDate: string,
  limit: number = 3
): Array<{ habitId: string; title: string; streak: StreakInfo }> {
  const streaks = computeAllStreaks(habits, logs, todayDate);
  const entries: Array<{ habitId: string; title: string; streak: StreakInfo }> = [];
  
  for (const habit of habits) {
    const streak = streaks.get(habit.id);
    if (streak && streak.currentStreak > 0) {
      entries.push({ habitId: habit.id, title: habit.title, streak });
    }
  }

  return entries.sort((a, b) => b.streak.currentStreak - a.streak.currentStreak).slice(0, limit);
}
