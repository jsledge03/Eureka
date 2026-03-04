import { useStore, ReminderType, CoachNudge } from '@/store/useStore';

export const REMINDER_LABELS: Record<ReminderType, { title: string; message: string }> = {
  'my-day-start': {
    title: 'Start Your Day',
    message: "Set your energy level and intentions. What matters today?",
  },
  'midday-recalibrate': {
    title: 'Midday Check-in',
    message: "How's energy holding up? Adjust your plan if needed — that's leadership.",
  },
  'close-the-loop': {
    title: 'Close the Loop',
    message: "Reflect on what worked. A quick evening review protects tomorrow's rhythm.",
  },
  'sunday-reset': {
    title: 'Sunday Reset',
    message: "Time to review the week, recalibrate focus domains, and set intentions.",
  },
  'daily-overdue': {
    title: 'Daily Overdue Summary',
    message: "You have tasks past due. Triage them — reschedule, delegate, or drop.",
  },
};

function isReminderDue(time: string, type: ReminderType): boolean {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const reminderTime = new Date();
  reminderTime.setHours(hours, minutes, 0, 0);

  if (type === 'sunday-reset' && now.getDay() !== 0) return false;

  return now >= reminderTime;
}

function hasFiredToday(templateType: string): boolean {
  const today = new Date().toLocaleDateString('en-CA');
  const { firedReminderKeys } = useStore.getState();
  return (firedReminderKeys[today] || []).includes(templateType);
}

function markFiredToday(templateType: string): void {
  const today = new Date().toLocaleDateString('en-CA');
  const { firedReminderKeys } = useStore.getState();
  const existing = firedReminderKeys[today] || [];
  if (!existing.includes(templateType)) {
    const updated = { [today]: [...existing, templateType] };
    useStore.setState({ firedReminderKeys: updated });
  }
}

let nudgesThisOpen = 0;
const MAX_NUDGES_PER_OPEN = 2;

export function resetNudgeCounter(): void {
  nudgesThisOpen = 0;
}

function fireReminderWithEvent(
  templateType: ReminderType | 'test' | 'progress',
  nudgeType: CoachNudge['type'],
  title: string,
  message: string
): void {
  const { addCoachNudge, addReminderEvent } = useStore.getState();
  const today = new Date().toLocaleDateString('en-CA');
  const now = new Date().toISOString();

  const eventId = addReminderEvent({
    templateType,
    name: title,
    message,
    firedAt: now,
    status: 'fired',
    dateKey: today,
  });

  const nudgeId = addCoachNudge({
    type: nudgeType,
    title,
    message,
    reminderEventId: eventId,
  });

  useStore.setState((s) => ({
    reminderEvents: s.reminderEvents.map(e =>
      e.id === eventId ? { ...e, nudgeId } : e
    ),
  }));

  markFiredToday(templateType);
}

export function checkAndFireReminders(): number {
  const state = useStore.getState();
  const { notificationSettings } = state;

  if (!notificationSettings?.inAppReminders) return 0;
  if (nudgesThisOpen >= MAX_NUDGES_PER_OPEN) return 0;

  const schedules = notificationSettings.schedules || [];
  let fired = 0;

  for (const schedule of schedules) {
    if (nudgesThisOpen >= MAX_NUDGES_PER_OPEN) break;
    if (!schedule.enabled) continue;
    if (hasFiredToday(schedule.type)) continue;
    if (!isReminderDue(schedule.time, schedule.type)) continue;

    const label = REMINDER_LABELS[schedule.type];
    fireReminderWithEvent(schedule.type, 'reminder', label.title, label.message);
    nudgesThisOpen++;
    fired++;
  }

  return fired;
}

export function generateProgressNudges(): void {
  const state = useStore.getState();
  const { tasks, logs, habits, graceDaysUsedThisWeek, notificationSettings } = state;

  if (!notificationSettings?.inAppReminders) return;
  if (hasFiredToday('progress')) return;

  const today = new Date().toLocaleDateString('en-CA');
  const overdue = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const recentLogs = logs.filter(l => l.date >= fourteenDaysAgo.toLocaleDateString('en-CA'));
  const habitLogs = recentLogs.filter(l => l.type === 'habit');
  const completedHabitLogs = habitLogs.filter(l => l.status === 'completed' || l.status === 'micro');
  const rhythmRate = habitLogs.length > 0 ? (completedHabitLogs.length / habitLogs.length) * 100 : 100;

  let nudgeGenerated = false;

  if (overdue.length >= 5 && !nudgeGenerated) {
    fireReminderWithEvent('progress', 'overdue', 'Backlog Building', `${overdue.length} tasks are overdue. Let's triage — reschedule what matters, drop what doesn't.`);
    nudgeGenerated = true;
  }

  if (rhythmRate < 50 && habitLogs.length >= 5 && !nudgeGenerated) {
    fireReminderWithEvent('progress', 'rhythm-drop', 'Rhythm Needs Attention', "Your consistency has dipped. Consider switching some habits to Minimum Version to rebuild momentum.");
    nudgeGenerated = true;
  }

  if (graceDaysUsedThisWeek >= 3 && !nudgeGenerated) {
    fireReminderWithEvent('progress', 'grace-usage', 'Grace Fully Used', "All grace credits are spent. Focus on protecting your remaining commitments — quality over quantity.");
    nudgeGenerated = true;
  }

  const activeHabits = habits.filter(h => !h.isPaused);
  const domains = new Set(activeHabits.map(h => h.domain).filter(Boolean));
  if (domains.size === 1 && activeHabits.length >= 3 && !nudgeGenerated) {
    fireReminderWithEvent('progress', 'domain-drift', 'Domain Drift', "All active habits are in one domain. Consider balance across your life areas.");
    nudgeGenerated = true;
  }

  if (nudgeGenerated) {
    nudgesThisOpen++;
  }
}

export function getNextScheduledReminders(): { type: ReminderType; label: string; time: string; due: boolean; firedToday: boolean }[] {
  const state = useStore.getState();
  const { notificationSettings } = state;
  if (!notificationSettings?.inAppReminders) return [];

  return (notificationSettings.schedules || [])
    .filter(s => s.enabled)
    .map(s => ({
      type: s.type,
      label: REMINDER_LABELS[s.type]?.title || s.type,
      time: s.time,
      due: isReminderDue(s.time, s.type),
      firedToday: hasFiredToday(s.type),
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function sendTestNotification(templateType?: ReminderType): void {
  const { notificationSettings } = useStore.getState();

  const title = templateType ? REMINDER_LABELS[templateType].title : 'Test Notification';
  const message = templateType ? REMINDER_LABELS[templateType].message : 'This confirms your in-app reminders are working.';

  fireReminderWithEvent(templateType || 'test', 'reminder', title, message);

  if (notificationSettings?.pushEnabled && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Life Compass', {
        body: 'Push notifications are working.',
        icon: '/icons/icon-192x192.png',
      });
    } catch {}
  }
}

export function isPushAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true;
  const hasNotification = 'Notification' in window;
  const hasServiceWorker = 'serviceWorker' in navigator;
  return isStandalone && hasNotification && hasServiceWorker;
}

export function runReminderCheck(): void {
  checkAndFireReminders();
  if (nudgesThisOpen < MAX_NUDGES_PER_OPEN) {
    generateProgressNudges();
  }
  useStore.getState().clearOldNudges();
  useStore.getState().cleanupReminderEvents();
}
