import type { Goal, Habit, Task, FrictionEvent, NotificationSettings } from '@/store/useStore';

export type CognitiveLoadLevel = 'Low' | 'Moderate' | 'High';

export interface CognitiveLoadResult {
  level: CognitiveLoadLevel;
  explanation: string;
  topDrivers: string[];
}

interface CognitiveLoadInput {
  goals: Goal[];
  habits: Habit[];
  tasks: Task[];
  frictionEvents: FrictionEvent[];
  driftAlertCount: number;
  notificationSettings: NotificationSettings;
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

export function computeCognitiveLoad(input: CognitiveLoadInput): CognitiveLoadResult {
  const { goals, habits, tasks, frictionEvents, driftAlertCount, notificationSettings } = input;
  let score = 0;
  const drivers: { label: string; weight: number }[] = [];

  const activeGoals = goals.filter(g => !g.isPaused);
  if (activeGoals.length > 6) {
    score += 3;
    drivers.push({ label: `${activeGoals.length} active goals — cognitive overhead is high`, weight: 3 });
  } else if (activeGoals.length > 4) {
    score += 2;
    drivers.push({ label: `${activeGoals.length} active goals competing for attention`, weight: 2 });
  } else if (activeGoals.length > 2) {
    score += 1;
    drivers.push({ label: `${activeGoals.length} active goals`, weight: 1 });
  }

  const activeHabits = habits.filter(h => !h.isPaused);
  if (activeHabits.length > 12) {
    score += 3;
    drivers.push({ label: `${activeHabits.length} active habits — too many to track reliably`, weight: 3 });
  } else if (activeHabits.length > 8) {
    score += 2;
    drivers.push({ label: `${activeHabits.length} active habits — nearing cognitive ceiling`, weight: 2 });
  } else if (activeHabits.length > 5) {
    score += 1;
    drivers.push({ label: `${activeHabits.length} active habits`, weight: 1 });
  }

  const today = new Date().toLocaleDateString('en-CA');
  const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today);
  if (overdueTasks.length > 8) {
    score += 3;
    drivers.push({ label: `${overdueTasks.length} overdue tasks creating mental weight`, weight: 3 });
  } else if (overdueTasks.length > 5) {
    score += 2;
    drivers.push({ label: `${overdueTasks.length} overdue tasks accumulating`, weight: 2 });
  } else if (overdueTasks.length > 2) {
    score += 1;
    drivers.push({ label: `${overdueTasks.length} overdue tasks`, weight: 1 });
  }

  const enabledNotifications = notificationSettings.schedules.filter(s => s.enabled).length;
  if (enabledNotifications >= 4) {
    score += 1;
    drivers.push({ label: `${enabledNotifications} active notification channels`, weight: 1 });
  }

  const last7 = new Set(getLast7Dates());
  const cutoff7 = getLast7Dates()[6];
  const recentFriction = frictionEvents.filter(e => e.dateKey >= cutoff7);
  if (recentFriction.length > 7) {
    score += 2;
    drivers.push({ label: `${recentFriction.length} friction events this week — high resistance`, weight: 2 });
  } else if (recentFriction.length > 3) {
    score += 1;
    drivers.push({ label: `${recentFriction.length} friction events this week`, weight: 1 });
  }

  if (driftAlertCount >= 3) {
    score += 2;
    drivers.push({ label: `${driftAlertCount} drift alerts — system misalignment`, weight: 2 });
  } else if (driftAlertCount >= 1) {
    score += 1;
    drivers.push({ label: `${driftAlertCount} drift alert${driftAlertCount > 1 ? 's' : ''} active`, weight: 1 });
  }

  let level: CognitiveLoadLevel;
  let explanation: string;

  if (score >= 7) {
    level = 'High';
    explanation = 'Your system has too many active commitments, unresolved tasks, and friction signals. Simplifying will restore clarity and focus.';
  } else if (score >= 4) {
    level = 'Moderate';
    explanation = 'Your cognitive load is manageable but rising. Consider pausing non-essential items before it becomes overwhelming.';
  } else {
    level = 'Low';
    explanation = 'Your system is clean and focused. You have mental space to operate effectively.';
  }

  drivers.sort((a, b) => b.weight - a.weight);
  const topDrivers = drivers.slice(0, 2).map(d => d.label);

  return { level, explanation, topDrivers };
}
